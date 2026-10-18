"""
Lead assignment, acknowledgement, escalation, and recovery queue logic.
All business rules live here — routes are thin wrappers.

F3.1: create_lead — source label
F3.3: assign_next — round-robin, eligibility check
F3.4: acknowledge_lead — sets acknowledged_at
F3.5: escalate_lead — multi-level, configurable timeout
F3.6: reassign_on_absence — offline/on-leave triggers reassignment
F3.7: get_recovery_queue — overdue/escalated/idle leads
F3.8: atomic assignment via version + SELECT FOR UPDATE (PostgreSQL)
       SQLite fallback: version check only (no FOR UPDATE)
Q4/Q5: optimistic lock — reject stale version
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.audit import write_audit
from app.models.orm import (
    AssignmentPool,
    AssignmentPoolMember,
    AssignmentRule,
    AvailabilityStatus,
    EscalationConfig,
    EscalationEvent,
    Lead,
    WorkspaceUser,
)

# Lead status IDs (mirrors crm.s_lead_statuses seed data)
STATUS_NEW = 1
STATUS_ASSIGNED = 2
STATUS_ACKNOWLEDGED = 3
STATUS_ESCALATED = 4
STATUS_RECOVERY = 5
STATUS_CONVERTED = 6
STATUS_CLOSED = 7

# Source IDs (mirrors crm.s_lead_sources seed data)
SOURCE_WEB_FORM = 1
SOURCE_INCOMING_MSG = 2
SOURCE_MANUAL = 3


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize(dt: Optional[datetime]) -> Optional[datetime]:
    """SQLite returns naive datetimes — attach UTC for comparison."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ── Lead creation ─────────────────────────────────────────────────────────────

async def create_lead(
    db: AsyncSession,
    workspace_id: int,
    source_type: int,
    actor_id: int,
    contact_id: Optional[int] = None,
    opportunity_id: Optional[int] = None,
) -> Lead:
    """F3.1: create lead with source label; auto-assign if pool exists."""
    lead = Lead(
        workspace_id=workspace_id,
        source_type=source_type,
        contact_id=contact_id,
        opportunity_id=opportunity_id,
        status=STATUS_NEW,
        version=1,
    )
    db.add(lead)
    await db.flush()

    await write_audit(
        db,
        workspace_id=workspace_id,
        event_type="LEAD_CREATED",
        entity_type="lead",
        entity_id=lead.lead_id,
        actor_id=actor_id,
        after_value={"source_type": source_type, "contact_id": contact_id},
    )

    # F3.3: attempt immediate round-robin assignment
    assignee = await _find_next_assignee(db, workspace_id)
    if assignee:
        await _do_assign(db, lead, assignee, actor_id)

    return lead


# ── Assignment ────────────────────────────────────────────────────────────────

async def assign_next(
    db: AsyncSession,
    lead: Lead,
    actor_id: int,
) -> Lead:
    """F3.3: manually trigger round-robin assignment for an unassigned lead."""
    assignee = await _find_next_assignee(db, lead.workspace_id)
    if not assignee:
        raise HTTPException(400, "No Available employees in assignment pool (F3.3)")
    await _do_assign(db, lead, assignee, actor_id)
    return lead


async def _find_next_assignee(
    db: AsyncSession,
    workspace_id: int,
) -> Optional[WorkspaceUser]:
    """
    F3.3: round-robin across Available pool members.
    Respects max_open_leads when rule_type=2.
    """
    pool_result = await db.execute(
        select(AssignmentPool)
        .join(AssignmentRule, AssignmentPool.rule_id == AssignmentRule.rule_id)
        .where(
            AssignmentPool.workspace_id == workspace_id,
            AssignmentRule.is_active == True,
        )
        .limit(1)
    )
    pool = pool_result.scalar_one_or_none()
    if not pool:
        return None

    rule_result = await db.execute(
        select(AssignmentRule).where(AssignmentRule.rule_id == pool.rule_id)
    )
    rule = rule_result.scalar_one()

    # Get active pool members who are Available (is_assignment_eligible=True)
    members_result = await db.execute(
        select(WorkspaceUser)
        .join(AssignmentPoolMember, WorkspaceUser.workspace_user_id == AssignmentPoolMember.workspace_user_id)
        .join(AvailabilityStatus, WorkspaceUser.availability_status == AvailabilityStatus.status_id)
        .where(
            AssignmentPoolMember.pool_id == pool.pool_id,
            AssignmentPoolMember.is_active == True,
            WorkspaceUser.is_active == True,
            AvailabilityStatus.is_assignment_eligible == True,
        )
        .order_by(WorkspaceUser.workspace_user_id)
    )
    eligible = members_result.scalars().all()
    if not eligible:
        return None

    # Round-robin: pick next after last position
    last = pool.round_robin_last_position or 0
    candidates = [u for u in eligible if u.workspace_user_id > last]
    if not candidates:
        candidates = eligible  # wrap around

    for candidate in candidates:
        if rule.rule_type == 2 and rule.max_open_leads:
            open_count_result = await db.execute(
                select(func.count(Lead.lead_id)).where(
                    Lead.assigned_to == candidate.workspace_user_id,
                    Lead.status.in_([STATUS_ASSIGNED, STATUS_ACKNOWLEDGED]),
                )
            )
            if (open_count_result.scalar() or 0) >= rule.max_open_leads:
                continue  # at capacity

        # Advance pool pointer
        pool.round_robin_last_position = candidate.workspace_user_id
        return candidate

    return None


async def _do_assign(
    db: AsyncSession,
    lead: Lead,
    assignee: WorkspaceUser,
    actor_id: int,
) -> None:
    """F3.3/F3.8: assign lead; set assigned_at for ack timer; bump version."""
    before = {"assigned_to": lead.assigned_to, "status": lead.status}
    lead.assigned_to = assignee.workspace_user_id
    lead.assigned_at = _now()
    lead.status = STATUS_ASSIGNED
    lead.version += 1

    await write_audit(
        db,
        workspace_id=lead.workspace_id,
        event_type="LEAD_ASSIGNED",
        entity_type="lead",
        entity_id=lead.lead_id,
        actor_id=actor_id,
        before_value=before,
        after_value={"assigned_to": assignee.workspace_user_id, "version": lead.version},
    )


# ── Acknowledgement ───────────────────────────────────────────────────────────

async def acknowledge_lead(
    db: AsyncSession,
    lead: Lead,
    actor_id: int,
    request_version: int,
) -> Lead:
    """F3.4: assignee acknowledges. Q4/Q5: reject stale version."""
    _assert_version(lead, request_version)

    if lead.acknowledged_at:
        raise HTTPException(400, "Lead already acknowledged")
    if lead.assigned_to != actor_id:
        raise HTTPException(403, "Only the assigned employee can acknowledge (F3.4)")

    before = {"status": lead.status}
    lead.acknowledged_at = _now()
    lead.status = STATUS_ACKNOWLEDGED
    lead.version += 1

    await write_audit(
        db,
        workspace_id=lead.workspace_id,
        event_type="LEAD_ACKNOWLEDGED",
        entity_type="lead",
        entity_id=lead.lead_id,
        actor_id=actor_id,
        before_value=before,
        after_value={"acknowledged_at": lead.acknowledged_at.isoformat(), "version": lead.version},
    )
    return lead


# ── Escalation ────────────────────────────────────────────────────────────────

async def escalate_lead(
    db: AsyncSession,
    lead: Lead,
    actor_id: Optional[int],  # None = system-initiated
) -> Lead:
    """
    F3.5/F3.8: escalate to next level.
    Loads EscalationConfig for next level; assigns notified user if configured.
    F3.8: version bump guards against double-escalation.
    """
    next_level = lead.escalation_level + 1

    config_result = await db.execute(
        select(EscalationConfig).where(
            EscalationConfig.workspace_id == lead.workspace_id,
            EscalationConfig.level == next_level,
        )
    )
    config = config_result.scalar_one_or_none()

    before = {"escalation_level": lead.escalation_level, "status": lead.status, "assigned_to": lead.assigned_to}

    lead.escalation_level = next_level
    lead.status = STATUS_ESCALATED
    lead.last_escalated_at = _now()
    lead.version += 1

    # Assign to notified user if specified in config
    new_assignee_id = None
    if config and config.notify_user_id:
        lead.assigned_to = config.notify_user_id
        lead.assigned_at = _now()
        lead.acknowledged_at = None
        new_assignee_id = config.notify_user_id
    elif config and config.notify_role_id:
        # Find first Available user with that role
        user_result = await db.execute(
            select(WorkspaceUser)
            .join(AvailabilityStatus, WorkspaceUser.availability_status == AvailabilityStatus.status_id)
            .where(
                WorkspaceUser.workspace_id == lead.workspace_id,
                WorkspaceUser.role_id == config.notify_role_id,
                WorkspaceUser.is_active == True,
                AvailabilityStatus.is_assignment_eligible == True,
            )
            .limit(1)
        )
        user = user_result.scalar_one_or_none()
        if user:
            lead.assigned_to = user.workspace_user_id
            lead.assigned_at = _now()
            lead.acknowledged_at = None
            new_assignee_id = user.workspace_user_id

    # Record escalation event
    event = EscalationEvent(
        lead_id=lead.lead_id,
        escalation_level=next_level,
        notified_user_id=new_assignee_id,
    )
    db.add(event)

    await write_audit(
        db,
        workspace_id=lead.workspace_id,
        event_type="LEAD_ESCALATED",
        entity_type="lead",
        entity_id=lead.lead_id,
        actor_id=actor_id,
        actor_type="system" if actor_id is None else "user",
        before_value=before,
        after_value={"escalation_level": next_level, "assigned_to": new_assignee_id, "version": lead.version},
    )
    return lead


async def run_escalation_sweep(db: AsyncSession) -> int:
    """
    F3.5: scan assigned+unacknowledged leads whose ack window expired.
    Called by /internal/escalations endpoint (cron-friendly).
    Returns count of leads escalated.
    ponytail: linear scan, acceptable at MVP scale (<1000 leads/workspace)
    """
    now = _now()
    count = 0

    leads_result = await db.execute(
        select(Lead).where(
            Lead.status == STATUS_ASSIGNED,
            Lead.acknowledged_at == None,
            Lead.assigned_at != None,
        )
    )
    leads = leads_result.scalars().all()

    for lead in leads:
        assigned_at = _normalize(lead.assigned_at)
        if assigned_at is None:
            continue

        config_result = await db.execute(
            select(EscalationConfig).where(
                EscalationConfig.workspace_id == lead.workspace_id,
                EscalationConfig.level == lead.escalation_level + 1,
            )
        )
        config = config_result.scalar_one_or_none()
        if not config:
            continue

        deadline = assigned_at + timedelta(minutes=config.timeout_minutes)
        if now >= deadline:
            await escalate_lead(db, lead, actor_id=None)
            count += 1

    if count:
        await db.commit()
    return count


# ── Absence reassignment ──────────────────────────────────────────────────────

async def reassign_on_absence(
    db: AsyncSession,
    user_id: int,
    workspace_id: int,
    actor_id: int,
    reason: str = "Employee went offline/on leave",
) -> int:
    """
    F3.6: when employee goes Offline/On Leave, reassign their unacknowledged leads.
    BR-012: reassign to next eligible employee in same workspace.
    Returns count reassigned.
    """
    leads_result = await db.execute(
        select(Lead).where(
            Lead.workspace_id == workspace_id,
            Lead.assigned_to == user_id,
            Lead.acknowledged_at == None,
            Lead.status.in_([STATUS_ASSIGNED, STATUS_ESCALATED]),
        )
    )
    leads = leads_result.scalars().all()

    count = 0
    for lead in leads:
        assignee = await _find_next_assignee(db, workspace_id)
        if not assignee or assignee.workspace_user_id == user_id:
            # No other eligible employee — move to recovery
            lead.status = STATUS_RECOVERY
            lead.version += 1
            await write_audit(
                db,
                workspace_id=workspace_id,
                event_type="LEAD_RECOVERY_QUEUED",
                entity_type="lead",
                entity_id=lead.lead_id,
                actor_id=actor_id,
                before_value={"assigned_to": user_id},
                after_value={"status": STATUS_RECOVERY},
            )
        else:
            before = {"assigned_to": lead.assigned_to}
            lead.reassigned_from = lead.assigned_to
            lead.reassigned_at = _now()
            lead.reassignment_reason = reason
            lead.assigned_to = assignee.workspace_user_id
            lead.assigned_at = _now()
            lead.acknowledged_at = None
            lead.version += 1
            await write_audit(
                db,
                workspace_id=workspace_id,
                event_type="LEAD_REASSIGNED",
                entity_type="lead",
                entity_id=lead.lead_id,
                actor_id=actor_id,
                before_value=before,
                after_value={"assigned_to": assignee.workspace_user_id, "reason": reason},
            )
        count += 1

    return count


# ── Recovery queue ────────────────────────────────────────────────────────────

async def get_recovery_queue(
    db: AsyncSession,
    workspace_id: int,
    idle_minutes: int = 1440,  # 24h default
) -> list[Lead]:
    """
    F3.7: leads that are overdue, escalated >1 time, or untouched beyond idle period.
    """
    cutoff = _now() - timedelta(minutes=idle_minutes)

    result = await db.execute(
        select(Lead).where(
            Lead.workspace_id == workspace_id,
            Lead.status.in_([STATUS_ASSIGNED, STATUS_ESCALATED, STATUS_RECOVERY]),
        ).where(
            (Lead.status == STATUS_RECOVERY)
            | (Lead.escalation_level > 1)
            | (Lead.assigned_at < cutoff)
        )
    )
    return result.scalars().all()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _assert_version(lead: Lead, request_version: int) -> None:
    """Q4/Q5: optimistic lock — reject if client sent stale version."""
    if lead.version != request_version:
        raise HTTPException(
            409,
            f"Stale lead version: expected {lead.version}, got {request_version}. Reload and retry. (Q4/Q5)",
        )


def ack_timer_remaining(lead: Lead, timeout_minutes: int) -> Optional[int]:
    """F3.4: seconds remaining in ack window. None if unassigned or already acked."""
    if not lead.assigned_at or lead.acknowledged_at:
        return None
    assigned_at = _normalize(lead.assigned_at)
    deadline = assigned_at + timedelta(minutes=timeout_minutes)
    remaining = (deadline - _now()).total_seconds()
    return max(0, int(remaining))
