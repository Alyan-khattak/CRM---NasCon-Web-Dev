"""
Pydantic v2 request/response schemas — Phase 1 (Auth + Workspace + Users).
All response models omit pwd_hash, salt, and locked_until (never expose credentials).
"""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ── Workspace ────────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    """F1.1: signup creates workspace and first user as Owner."""
    workspace_name: str = Field(..., min_length=2, max_length=200)
    workspace_slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    email: EmailStr
    phone: str | None = Field(None, max_length=30)
    timezone: str | None = Field(None, max_length=100)
    # Owner user fields bundled in signup
    owner_full_name: str = Field(..., min_length=2, max_length=200)
    owner_password: str = Field(..., min_length=8, max_length=200)


class WorkspaceResponse(BaseModel):
    workspace_id: int
    workspace_name: str
    workspace_slug: str
    email: str
    phone: str | None
    timezone: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """F1.1: login with email + password inside a workspace slug."""
    workspace_slug: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Users ─────────────────────────────────────────────────────────────────────

class UserInvite(BaseModel):
    """F1.2: Owner invites a new user and assigns a role."""
    full_name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    role_id: int
    cell_no: str | None = Field(None, max_length=30)
    password: str = Field(..., min_length=8, max_length=200)


class UserResponse(BaseModel):
    workspace_user_id: int
    workspace_id: int
    full_name: str
    email: str
    cell_no: str | None
    availability_status: int
    role_id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Partial update — only provided fields are changed."""
    full_name: str | None = Field(None, min_length=2, max_length=200)
    cell_no: str | None = Field(None, max_length=30)
    role_id: int | None = None
    availability_status: int | None = None  # F3.2
    is_active: bool | None = None


# ── Roles ─────────────────────────────────────────────────────────────────────

class RoleCreate(BaseModel):
    """F1.2: custom role creation (is_system_role=False)."""
    role_name: str = Field(..., min_length=2, max_length=100)
    role_type: int = Field(..., ge=1, le=3)  # 1=Owner 2=Admin 3=User


class RoleResponse(BaseModel):
    role_id: int
    workspace_id: int
    role_name: str
    role_type: int
    is_system_role: bool

    model_config = {"from_attributes": True}


class PermissionUpdate(BaseModel):
    """F1.3: Owner sets CRUD flags per functionality code."""
    functionality_code: str = Field(..., max_length=50)
    can_view: bool = False
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False


# ── Common ─────────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str


# ── Companies ─────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    website: str | None = Field(None, max_length=500)
    address_line: str | None = Field(None, max_length=500)


class CompanyUpdate(BaseModel):
    company_name: str | None = Field(None, min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    website: str | None = Field(None, max_length=500)
    address_line: str | None = Field(None, max_length=500)


class CompanyResponse(BaseModel):
    company_id: int
    workspace_id: int
    company_name: str
    email: str | None
    phone: str | None
    website: str | None
    address_line: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Contacts ──────────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    company_id: int | None = None
    lead_source: str | None = Field(None, max_length=100)


class ContactUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    company_id: int | None = None
    is_opted_out: bool | None = None   # I1.9
    lead_source: str | None = None


class ContactResponse(BaseModel):
    contact_id: int
    workspace_id: int
    full_name: str
    email: str | None
    phone: str | None
    company_id: int | None
    is_opted_out: bool
    lead_source: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Pipelines & Stages ────────────────────────────────────────────────────────

class PipelineCreate(BaseModel):
    pipeline_name: str = Field(..., min_length=1, max_length=200)


class PipelineUpdate(BaseModel):
    pipeline_name: str | None = Field(None, min_length=1, max_length=200)
    is_active: bool | None = None


class StageCreate(BaseModel):
    stage_name: str = Field(..., min_length=1, max_length=200)
    sort_order: int = 0


class StageUpdate(BaseModel):
    stage_name: str | None = Field(None, min_length=1, max_length=200)
    sort_order: int | None = None


class StageResponse(BaseModel):
    stage_id: int
    pipeline_id: int
    stage_name: str
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class PipelineResponse(BaseModel):
    pipeline_id: int
    workspace_id: int
    pipeline_name: str
    is_active: bool
    stages: list[StageResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Custom Fields ─────────────────────────────────────────────────────────────

class CustomFieldCreate(BaseModel):
    """F2.2: Admin creates fields without code. F2.3: pipeline_id=None means workspace-wide."""
    entity_type: str = Field(..., pattern=r"^(contact|company|opportunity)$")
    field_name: str = Field(..., min_length=1, max_length=100)
    field_label: str | None = Field(None, max_length=200)
    data_type: int = Field(..., ge=1, le=5)  # 1=text 2=number 3=date 4=dropdown 5=checkbox
    is_required: bool = False
    sort_order: int = 0
    options: list[str] = []  # only for data_type=4 (dropdown)


class CustomFieldResponse(BaseModel):
    field_def_id: int
    workspace_id: int
    pipeline_id: int | None
    entity_type: str
    field_name: str
    field_label: str | None
    data_type: int
    is_required: bool
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class StageRequiredFieldCreate(BaseModel):
    field_def_id: int


class CustomFieldValueSet(BaseModel):
    """Set one custom field value on an entity."""
    field_def_id: int
    value_text: str | None = None
    value_number: float | None = None
    value_date: str | None = None   # ISO date string YYYY-MM-DD
    value_option_id: int | None = None


# ── Opportunities ─────────────────────────────────────────────────────────────

class OpportunityCreate(BaseModel):
    opportunity_name: str = Field(..., min_length=1, max_length=300)
    pipeline_id: int
    stage_id: int
    contact_id: int | None = None
    company_id: int | None = None
    value: float | None = None
    close_date: str | None = None   # ISO date YYYY-MM-DD
    assigned_to: int | None = None


class OpportunityUpdate(BaseModel):
    opportunity_name: str | None = Field(None, min_length=1, max_length=300)
    value: float | None = None
    status: str | None = Field(None, pattern=r"^(open|won|lost|cancelled)$")
    assigned_to: int | None = None
    close_date: str | None = None


class StageMoveRequest(BaseModel):
    """F2.4: move opportunity to a new stage; blocked if required fields not filled."""
    target_stage_id: int


class OpportunityResponse(BaseModel):
    opportunity_id: int
    workspace_id: int
    contact_id: int | None
    company_id: int | None
    pipeline_id: int
    stage_id: int
    opportunity_name: str
    value: float | None
    status: str
    assigned_to: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Saved Filters ─────────────────────────────────────────────────────────────

class FilterCriterion(BaseModel):
    field: str
    operator: str   # eq | neq | gt | lt | contains | in
    value: str | int | float | bool | list


class SavedFilterCreate(BaseModel):
    """F2.6: ≥3 criteria required."""
    filter_name: str = Field(..., min_length=1, max_length=200)
    entity_type: str = Field(..., pattern=r"^(contact|company|opportunity|lead)$")
    criteria: list[FilterCriterion]

    def model_post_init(self, _context) -> None:
        if len(self.criteria) < 3:
            raise ValueError("At least 3 filter criteria required (F2.6)")


class SavedFilterResponse(BaseModel):
    filter_id: int
    workspace_id: int
    filter_name: str
    entity_type: str
    criteria_json: list
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Phase 3: Leads ────────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    """F3.1: create lead with source label. Source: 1=web_form 2=incoming_message 3=manual."""
    source_type: int = Field(..., ge=1, le=3)
    contact_id: int | None = None
    opportunity_id: int | None = None


class LeadAcknowledge(BaseModel):
    """F3.4: explicit acknowledge action."""
    pass  # no body needed — actor comes from JWT


class LeadReassign(BaseModel):
    """F3.6: manual reassign with reason."""
    new_assignee_id: int
    reason: str = Field(..., min_length=1, max_length=300)


class LeadUpdate(BaseModel):
    """Versioned update — rejects stale writes (Q4/Q5)."""
    version: int  # must match current DB version
    status: int | None = Field(None, ge=1, le=7)


class LeadResponse(BaseModel):
    lead_id: int
    workspace_id: int
    contact_id: int | None
    opportunity_id: int | None
    source_type: int
    assigned_to: int | None
    assigned_at: datetime | None
    acknowledged_at: datetime | None
    status: int
    escalation_level: int
    last_escalated_at: datetime | None
    reassigned_from: int | None
    reassigned_at: datetime | None
    reassignment_reason: str | None
    version: int
    created_at: datetime
    # computed — seconds remaining in ack window (None if unassigned or already acked)
    ack_timer_remaining_seconds: int | None = None

    model_config = {"from_attributes": True}


# ── Phase 3: Assignment Pool ──────────────────────────────────────────────────

class AssignmentRuleCreate(BaseModel):
    """F3.3: configure round-robin or max-open-leads rule."""
    rule_type: int = Field(..., ge=1, le=2)  # 1=round_robin 2=max_open_leads
    max_open_leads: int | None = Field(None, ge=1)


class AssignmentRuleResponse(BaseModel):
    rule_id: int
    workspace_id: int
    rule_type: int
    max_open_leads: int | None
    is_active: bool

    model_config = {"from_attributes": True}


class AssignmentPoolCreate(BaseModel):
    pool_name: str = Field(..., min_length=1, max_length=200)
    rule_id: int


class AssignmentPoolResponse(BaseModel):
    pool_id: int
    workspace_id: int
    pool_name: str
    rule_id: int
    round_robin_last_position: int | None

    model_config = {"from_attributes": True}


class PoolMemberAdd(BaseModel):
    workspace_user_id: int


# ── Phase 3: Escalation Config ────────────────────────────────────────────────

class EscalationConfigCreate(BaseModel):
    """F3.5: configure per-level escalation timeout."""
    level: int = Field(..., ge=1)
    timeout_minutes: int = Field(..., ge=1)
    notify_user_id: int | None = None
    notify_role_id: int | None = None


class EscalationConfigResponse(BaseModel):
    config_id: int
    workspace_id: int
    level: int
    timeout_minutes: int
    notify_user_id: int | None
    notify_role_id: int | None

    model_config = {"from_attributes": True}
