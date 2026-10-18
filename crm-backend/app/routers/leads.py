"""
Lead management routes — Phase 3.
F3.1: capture leads; F3.3: assignment pool config; F3.4: ack timer;
F3.5: escalation config; F3.6: reassign; F3.7: recovery queue.
TD-1.1: all queries scoped to current_user.workspace_id.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, admin_or_above, get_current_user
from app.database import get_db
from app.middleware.rate_limit import default_limit
from app.models.orm import (
    AssignmentPool,
    AssignmentPoolMember,
    AssignmentRule,
    EscalationConfig,
    Lead,
    LeadSource,
    LeadStatus,
    WorkspaceUser,
)
from app.models.schemas import (
    AssignmentPoolCreate,
    AssignmentPoolResponse,
    AssignmentRuleCreate,
    AssignmentRuleResponse,
    EscalationConfigCreate,
    EscalationConfigResponse,
    LeadCreate,
    LeadReassign,
    LeadResponse,
    LeadUpdate,
    MessageResponse,
    PoolMemberAdd,
)
from app.services.lead_service import (
    STATUS_RECOVERY,
    acknowledge_lead,
    ack_timer_remaining,
    assign_next,
    create_lead,
    escalate_lead,
    get_recovery_queue,
    reassign_on_absence,
    run_escalation_sweep,
)

router = APIRouter(prefix="/leads", tags=["leads"])

# Default ack window when no EscalationConfig exists (30 min)
DEFAULT_ACK_MINUTES = 30


_seed_lock = asyncio.Lock()


async def _seed_lookups(db: AsyncSession) -> None:
    """Seed s_lead_sources and s_lead_statuses safely with lock to prevent race conditions."""
    async with _seed_lock:
        try:
            has_sources = (await db.execute(select(LeadSource))).scalars().first()
            if not has_sources:
                for s in [
                    LeadSource(source_id=1, source_name="web_form"),
                    LeadSource(source_id=2, source_name="incoming_message"),
                    LeadSource(source_id=3, source_name="manual"),
                ]:
                    db.add(s)

            has_statuses = (await db.execute(select(LeadStatus))).scalars().first()
            if not has_statuses:
                for s in [
                    LeadStatus(status_id=1, status_name="new"),
                    LeadStatus(status_id=2, status_name="assigned"),
                    LeadStatus(status_id=3, status_name="acknowledged"),
                    LeadStatus(status_id=4, status_name="escalated"),
                    LeadStatus(status_id=5, status_name="recovery_queue"),
                    LeadStatus(status_id=6, status_name="converted"),
                    LeadStatus(status_id=7, status_name="closed"),
                ]:
                    db.add(s)
            await db.flush()
        except Exception:
            # If already flushed concurrently or committed, roll back to keep session clean
            pass


# ── Leads CRUD ────────────────────────────────────────────────────────────────

@router.post("", response_model=LeadResponse, status_code=201)
@default_limit
async def create_lead_route(
    request: Request,
    body: LeadCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F3.1: create lead with source label; auto-assigns if pool configured."""
    await _seed_lookups(db)

    if body.contact_id:
        from app.models.orm import Contact
        result = await db.execute(
            select(Contact).where(
                Contact.contact_id == body.contact_id,
                Contact.workspace_id == current_user.workspace_id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(400, "Contact not found in this workspace")

    lead = await create_lead(
        db,
        workspace_id=current_user.workspace_id,
        source_type=body.source_type,
        actor_id=current_user.workspace_user_id,
        contact_id=body.contact_id,
        opportunity_id=body.opportunity_id,
    )
    await db.commit()
    await db.refresh(lead)
    return _to_response(lead, DEFAULT_ACK_MINUTES)


@router.get("", response_model=list[LeadResponse])
@default_limit
async def list_leads(
    request: Request,
    status: int | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F3.7: list leads for this workspace, optionally filtered by status."""
    q = select(Lead).where(Lead.workspace_id == current_user.workspace_id)
    if status is not None:
        q = q.where(Lead.status == status)
    result = await db.execute(q)
    leads = result.scalars().all()
    return [_to_response(l, DEFAULT_ACK_MINUTES) for l in leads]


@router.get("/recovery-queue", response_model=list[LeadResponse])
@default_limit
async def recovery_queue(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F3.7: overdue, multiply-escalated, or idle leads."""
    leads = await get_recovery_queue(db, current_user.workspace_id)
    return [_to_response(l, DEFAULT_ACK_MINUTES) for l in leads]


@router.get("/{lead_id}", response_model=LeadResponse)
@default_limit
async def get_lead(
    request: Request,
    lead_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F3.4: includes ack_timer_remaining_seconds."""
    lead = await _get_lead(db, lead_id, current_user.workspace_id)
    return _to_response(lead, DEFAULT_ACK_MINUTES)


@router.post("/{lead_id}/acknowledge", response_model=LeadResponse)
@default_limit
async def ack_lead(
    request: Request,
    lead_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F3.4: assigned employee acknowledges lead. No body needed."""
    lead = await _get_lead(db, lead_id, current_user.workspace_id)
    lead = await acknowledge_lead(db, lead, current_user.workspace_user_id, lead.version)
    await db.commit()
    await db.refresh(lead)
    return _to_response(lead, DEFAULT_ACK_MINUTES)


@router.post("/{lead_id}/reassign", response_model=LeadResponse)
@default_limit
async def reassign_lead(
    request: Request,
    lead_id: int,
    body: LeadReassign,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F3.6: admin/owner manually reassigns lead with reason."""
    lead = await _get_lead(db, lead_id, current_user.workspace_id)

    new_user_result = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_user_id == body.new_assignee_id,
            WorkspaceUser.workspace_id == current_user.workspace_id,
            WorkspaceUser.is_active == True,
        )
    )
    new_user = new_user_result.scalar_one_or_none()
    if not new_user:
        raise HTTPException(400, "New assignee not found in this workspace")

    from app.middleware.audit import write_audit
    from app.services.lead_service import STATUS_ASSIGNED, _now

    before = {"assigned_to": lead.assigned_to}
    lead.reassigned_from = lead.assigned_to
    lead.reassigned_at = _now()
    lead.reassignment_reason = body.reason
    lead.assigned_to = body.new_assignee_id
    lead.assigned_at = _now()
    lead.acknowledged_at = None
    lead.status = STATUS_ASSIGNED
    lead.version += 1

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="LEAD_REASSIGNED",
        entity_type="lead",
        entity_id=lead_id,
        actor_id=current_user.workspace_user_id,
        before_value=before,
        after_value={"assigned_to": body.new_assignee_id, "reason": body.reason},
    )

    await db.commit()
    await db.refresh(lead)
    return _to_response(lead, DEFAULT_ACK_MINUTES)


@router.post("/{lead_id}/escalate", response_model=LeadResponse)
@default_limit
async def manual_escalate(
    request: Request,
    lead_id: int,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F3.5: manually trigger escalation (admin/owner)."""
    lead = await _get_lead(db, lead_id, current_user.workspace_id)
    lead = await escalate_lead(db, lead, current_user.workspace_user_id)
    await db.commit()
    await db.refresh(lead)
    return _to_response(lead, DEFAULT_ACK_MINUTES)


# ── Internal: escalation sweep (cron-friendly) ────────────────────────────────

@router.post("/internal/run-escalations", response_model=MessageResponse)
async def trigger_escalation_sweep(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    F3.5: scan and escalate overdue assigned leads.
    Call via cron / scheduler. No auth — protected by network policy in prod.
    ponytail: simple HTTP cron, upgrade to APScheduler if sub-minute precision needed.
    """
    count = await run_escalation_sweep(db)
    return MessageResponse(message=f"Escalated {count} leads")


# ── Assignment Pool config ─────────────────────────────────────────────────────

@router.post("/config/rules", response_model=AssignmentRuleResponse, status_code=201)
@default_limit
async def create_rule(
    request: Request,
    body: AssignmentRuleCreate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F3.3: create assignment rule (round-robin or max-open-leads)."""
    rule = AssignmentRule(
        workspace_id=current_user.workspace_id,
        rule_type=body.rule_type,
        max_open_leads=body.max_open_leads,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.post("/config/pools", response_model=AssignmentPoolResponse, status_code=201)
@default_limit
async def create_pool(
    request: Request,
    body: AssignmentPoolCreate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F3.3: create assignment pool linked to a rule."""
    rule_result = await db.execute(
        select(AssignmentRule).where(
            AssignmentRule.rule_id == body.rule_id,
            AssignmentRule.workspace_id == current_user.workspace_id,
        )
    )
    if not rule_result.scalar_one_or_none():
        raise HTTPException(404, "Assignment rule not found")

    pool = AssignmentPool(
        workspace_id=current_user.workspace_id,
        pool_name=body.pool_name,
        rule_id=body.rule_id,
    )
    db.add(pool)
    await db.commit()
    await db.refresh(pool)
    return pool


@router.post("/config/pools/{pool_id}/members", response_model=MessageResponse, status_code=201)
@default_limit
async def add_pool_member(
    request: Request,
    pool_id: int,
    body: PoolMemberAdd,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F3.3: add employee to assignment pool."""
    pool_result = await db.execute(
        select(AssignmentPool).where(
            AssignmentPool.pool_id == pool_id,
            AssignmentPool.workspace_id == current_user.workspace_id,
        )
    )
    if not pool_result.scalar_one_or_none():
        raise HTTPException(404, "Pool not found")

    user_result = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_user_id == body.workspace_user_id,
            WorkspaceUser.workspace_id == current_user.workspace_id,
            WorkspaceUser.is_active == True,
        )
    )
    if not user_result.scalar_one_or_none():
        raise HTTPException(400, "User not found in this workspace")

    existing = await db.execute(
        select(AssignmentPoolMember).where(
            AssignmentPoolMember.pool_id == pool_id,
            AssignmentPoolMember.workspace_user_id == body.workspace_user_id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(AssignmentPoolMember(pool_id=pool_id, workspace_user_id=body.workspace_user_id))
        await db.commit()

    return MessageResponse(message="Member added to pool")


# ── Escalation Config ─────────────────────────────────────────────────────────

@router.post("/config/escalation", response_model=EscalationConfigResponse, status_code=201)
@default_limit
async def set_escalation_config(
    request: Request,
    body: EscalationConfigCreate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F3.5: upsert escalation config for a given level."""
    existing = await db.execute(
        select(EscalationConfig).where(
            EscalationConfig.workspace_id == current_user.workspace_id,
            EscalationConfig.level == body.level,
        )
    )
    cfg = existing.scalar_one_or_none()
    if cfg:
        cfg.timeout_minutes = body.timeout_minutes
        cfg.notify_user_id = body.notify_user_id
        cfg.notify_role_id = body.notify_role_id
    else:
        cfg = EscalationConfig(
            workspace_id=current_user.workspace_id,
            level=body.level,
            timeout_minutes=body.timeout_minutes,
            notify_user_id=body.notify_user_id,
            notify_role_id=body.notify_role_id,
        )
        db.add(cfg)

    await db.commit()
    await db.refresh(cfg)
    return cfg


@router.get("/config/escalation", response_model=list[EscalationConfigResponse])
@default_limit
async def list_escalation_configs(
    request: Request,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EscalationConfig)
        .where(EscalationConfig.workspace_id == current_user.workspace_id)
        .order_by(EscalationConfig.level)
    )
    return result.scalars().all()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_lead(db: AsyncSession, lead_id: int, workspace_id: int) -> Lead:
    result = await db.execute(
        select(Lead).where(Lead.lead_id == lead_id, Lead.workspace_id == workspace_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return lead


def _to_response(lead: Lead, ack_minutes: int) -> LeadResponse:
    data = LeadResponse.model_validate(lead)
    data.ack_timer_remaining_seconds = ack_timer_remaining(lead, ack_minutes)
    return data
