"""
SQLAlchemy ORM models — Phase 1 tables (Workspace & Auth group).
All 38 tables live in crm schema in Supabase; SQLite has no schema prefix.
TD-1.1: every tenant-owned table carries workspace_id.
"""
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import settings
from app.database import Base

# SQLite has no schema support; Supabase uses crm schema
_SCHEMA = "crm" if settings.DB_MODE == "supabase" else None
_ARGS = {"schema": _SCHEMA} if _SCHEMA else {}


class Workspace(Base):
    """
    crm.workspaces — company tenant container.
    F1.6: complete workspace isolation; TD-1.1.
    """
    __tablename__ = "workspaces"
    __table_args__ = _ARGS

    workspace_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_name: Mapped[str] = mapped_column(String(200), nullable=False)
    workspace_slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    timezone: Mapped[str | None] = mapped_column(String(100))   # I3.5
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users: Mapped[list["WorkspaceUser"]] = relationship("WorkspaceUser", back_populates="workspace")
    roles: Mapped[list["Role"]] = relationship("Role", back_populates="workspace")


class AvailabilityStatus(Base):
    """
    crm.s_availability_statuses — lookup table.
    F3.2: Available / Busy / On Leave / Offline.
    F3.3: is_assignment_eligible drives round-robin eligibility.
    """
    __tablename__ = "s_availability_statuses"
    __table_args__ = _ARGS

    status_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    status_name: Mapped[str] = mapped_column(String(50), nullable=False)
    is_assignment_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False)


class Role(Base):
    """
    crm.roles — per-workspace RBAC role.
    F1.2: Owner / Admin / User base roles; custom roles via is_system_role=False.
    """
    __tablename__ = "roles"
    __table_args__ = _ARGS

    role_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    role_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role_type: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1=Owner 2=Admin 3=User
    is_system_role: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="roles")
    permissions: Mapped[list["RolePermission"]] = relationship("RolePermission", back_populates="role")
    field_permissions: Mapped[list["FieldPermission"]] = relationship("FieldPermission", back_populates="role")
    users: Mapped[list["WorkspaceUser"]] = relationship("WorkspaceUser", back_populates="role")


class RolePermission(Base):
    """
    crm.role_permissions — CRUD flags per functionality code.
    F1.3: Owner configures view/create/edit/delete per role.
    F1.5: server rejects unauthorized direct API calls.
    """
    __tablename__ = "role_permissions"
    __table_args__ = _ARGS

    perm_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.role_id"), nullable=False)
    functionality_code: Mapped[str] = mapped_column(String(50), nullable=False)
    can_view: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_create: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_edit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_delete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    role: Mapped["Role"] = relationship("Role", back_populates="permissions")


class FieldPermission(Base):
    """
    crm.field_permissions — field-level visibility control.
    F1.4: opportunity value hidden for users lacking permission.
    """
    __tablename__ = "field_permissions"
    __table_args__ = _ARGS

    field_perm_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.role_id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "opportunity" | "contact" | "company"
    field_key: Mapped[str] = mapped_column(String(100), nullable=False)   # e.g. "opportunity_value"
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    role: Mapped["Role"] = relationship("Role", back_populates="field_permissions")


class WorkspaceUser(Base):
    """
    crm.workspace_users — employee record inside a workspace.
    F1.2: base levels Owner/Admin/User; F3.2: availability status.
    TD-1.1: workspace_id on every tenant-owned record.
    """
    __tablename__ = "workspace_users"
    __table_args__ = _ARGS

    workspace_user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    cell_no: Mapped[str | None] = mapped_column(String(30))
    availability_status: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("s_availability_statuses.status_id"),
        nullable=False,
        default=1,  # 1 = Available
    )
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.role_id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="users")
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    credential: Mapped["UserCredential"] = relationship("UserCredential", back_populates="user", uselist=False)


class UserCredential(Base):
    """
    crm.user_credentials — hashed password storage.
    Q1: recognized algorithm (bcrypt), salted, brute-force lockout.
    F1.1: persistent sessions.
    """
    __tablename__ = "user_credentials"
    __table_args__ = _ARGS

    credential_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("workspace_users.workspace_user_id"),
        nullable=False,
        unique=True,
    )
    pwd_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    salt: Mapped[str] = mapped_column(String(100), nullable=False)
    expiry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_attempts: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["WorkspaceUser"] = relationship("WorkspaceUser", back_populates="credential")


# ─── Phase 2: Companies & Contacts ──────────────────────────────────────────

class Company(Base):
    """crm.companies — CRM organization. F2.1."""
    __tablename__ = "companies"
    __table_args__ = _ARGS

    company_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(30))
    website: Mapped[str | None] = mapped_column(String(500))
    address_line: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    contacts: Mapped[list["Contact"]] = relationship("Contact", back_populates="company")


class Contact(Base):
    """crm.contacts — customer record. F2.1, F2.8; I1.9: is_opted_out blocks messaging."""
    __tablename__ = "contacts"
    __table_args__ = _ARGS

    contact_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(30))
    company_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("companies.company_id"))
    is_opted_out: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lead_source: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company: Mapped["Company | None"] = relationship("Company", back_populates="contacts")
    opportunities: Mapped[list["Opportunity"]] = relationship("Opportunity", back_populates="contact")


# ─── Phase 2: Pipelines, Stages & Custom Fields ──────────────────────────────

class Pipeline(Base):
    """crm.pipelines — configurable sales process. F2.7."""
    __tablename__ = "pipelines"
    __table_args__ = _ARGS

    pipeline_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    pipeline_name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    stages: Mapped[list["PipelineStage"]] = relationship(
        "PipelineStage",
        back_populates="pipeline",
        order_by="PipelineStage.sort_order",
        lazy="selectin",
    )
    opportunities: Mapped[list["Opportunity"]] = relationship("Opportunity", back_populates="pipeline")
    custom_fields: Mapped[list["CustomFieldDefinition"]] = relationship(
        "CustomFieldDefinition", back_populates="pipeline"
    )


class PipelineStage(Base):
    """crm.pipeline_stages — ordered stages. F2.5, BR-009 (deletion blocked while occupied)."""
    __tablename__ = "pipeline_stages"
    __table_args__ = _ARGS

    stage_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pipeline_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pipelines.pipeline_id"), nullable=False)
    stage_name: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pipeline: Mapped["Pipeline"] = relationship("Pipeline", back_populates="stages")
    required_fields: Mapped[list["StageRequiredField"]] = relationship(
        "StageRequiredField", back_populates="stage"
    )
    opportunities: Mapped[list["Opportunity"]] = relationship("Opportunity", back_populates="stage")


class FieldDataType(Base):
    """crm.s_field_data_types — lookup: text/number/date/dropdown/checkbox. F2.2."""
    __tablename__ = "s_field_data_types"
    __table_args__ = _ARGS

    data_type_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    type_name: Mapped[str] = mapped_column(String(50), nullable=False)


class CustomFieldDefinition(Base):
    """crm.custom_field_definitions — Admin-defined fields per pipeline. F2.2, F2.3."""
    __tablename__ = "custom_field_definitions"
    __table_args__ = _ARGS

    field_def_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    pipeline_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("pipelines.pipeline_id"))
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # contact|company|opportunity
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    field_label: Mapped[str | None] = mapped_column(String(200))
    data_type: Mapped[int] = mapped_column(SmallInteger, ForeignKey("s_field_data_types.data_type_id"), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    pipeline: Mapped["Pipeline | None"] = relationship("Pipeline", back_populates="custom_fields")
    options: Mapped[list["CustomFieldOption"]] = relationship("CustomFieldOption", back_populates="field_def")
    required_at_stages: Mapped[list["StageRequiredField"]] = relationship(
        "StageRequiredField", back_populates="field_def"
    )


class CustomFieldOption(Base):
    """crm.custom_field_options — dropdown choices. F2.2."""
    __tablename__ = "custom_field_options"
    __table_args__ = _ARGS

    option_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    field_def_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("custom_field_definitions.field_def_id"), nullable=False
    )
    option_label: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)

    field_def: Mapped["CustomFieldDefinition"] = relationship("CustomFieldDefinition", back_populates="options")


class CustomFieldValue(Base):
    """
    crm.custom_field_values — polymorphic EAV storage. F2.2.
    entity_type + entity_id points to contact, company, or opportunity.
    Only one typed column should be non-null per row.
    """
    __tablename__ = "custom_field_values"
    __table_args__ = _ARGS

    value_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    field_def_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("custom_field_definitions.field_def_id"), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    value_text: Mapped[str | None] = mapped_column(Text)
    value_number: Mapped[float | None] = mapped_column(Numeric(18, 4))
    value_date: Mapped[datetime | None] = mapped_column(Date)
    value_option_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("custom_field_options.option_id")
    )


class StageRequiredField(Base):
    """crm.stage_required_fields — required field gate before stage move. F2.4."""
    __tablename__ = "stage_required_fields"
    __table_args__ = _ARGS

    req_field_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stage_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pipeline_stages.stage_id"), nullable=False)
    field_def_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("custom_field_definitions.field_def_id"), nullable=False
    )

    stage: Mapped["PipelineStage"] = relationship("PipelineStage", back_populates="required_fields")
    field_def: Mapped["CustomFieldDefinition"] = relationship(
        "CustomFieldDefinition", back_populates="required_at_stages"
    )


# ─── Phase 2: Opportunities ──────────────────────────────────────────────────

class Opportunity(Base):
    """
    crm.opportunities — sales pipeline record. F2.1, F2.8, F5.1.
    F1.4: value masked for users whose field_permission for opportunity_value is_visible=False.
    """
    __tablename__ = "opportunities"
    __table_args__ = _ARGS

    opportunity_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    contact_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("contacts.contact_id"))
    company_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("companies.company_id"))
    pipeline_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pipelines.pipeline_id"), nullable=False)
    stage_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pipeline_stages.stage_id"), nullable=False)
    opportunity_name: Mapped[str] = mapped_column(String(300), nullable=False)
    value: Mapped[float | None] = mapped_column(Numeric(18, 2))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open")
    assigned_to: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("workspace_users.workspace_user_id")
    )
    close_date: Mapped[datetime | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    contact: Mapped["Contact | None"] = relationship("Contact", back_populates="opportunities")
    pipeline: Mapped["Pipeline"] = relationship("Pipeline", back_populates="opportunities")
    stage: Mapped["PipelineStage"] = relationship("PipelineStage", back_populates="opportunities")


# ─── Phase 2: Saved Filters ──────────────────────────────────────────────────

class SavedFilter(Base):
    """crm.saved_filters — dynamic filter with ≥3 criteria. F2.6."""
    __tablename__ = "saved_filters"
    __table_args__ = _ARGS

    filter_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    created_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("workspace_users.workspace_user_id"), nullable=False
    )
    filter_name: Mapped[str] = mapped_column(String(200), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    criteria_json: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ─── Audit Log (INSERT-only) ─────────────────────────────────────────────────

class AuditLog(Base):
    """
    crm.audit_log — immutable event history. F4.1–F4.3.
    INSERT-only: no UPDATE/DELETE via app role (enforced via PostgreSQL grants in prod).
    """
    __tablename__ = "audit_log"
    __table_args__ = _ARGS

    log_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_id: Mapped[int | None] = mapped_column(BigInteger)
    actor_type: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    before_value: Mapped[dict | None] = mapped_column(JSON)
    after_value: Mapped[dict | None] = mapped_column(JSON)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    remarks: Mapped[str | None] = mapped_column(Text)


# ─── Phase 3: Lead Engine ─────────────────────────────────────────────────────

class LeadSource(Base):
    """crm.s_lead_sources — lookup: web_form / incoming_message / manual. F3.1."""
    __tablename__ = "s_lead_sources"
    __table_args__ = _ARGS

    source_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    source_name: Mapped[str] = mapped_column(String(50), nullable=False)


class LeadStatus(Base):
    """crm.s_lead_statuses — lookup: new/assigned/acknowledged/escalated/recovery_queue/converted/closed. F3.5, F3.7."""
    __tablename__ = "s_lead_statuses"
    __table_args__ = _ARGS

    status_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    status_name: Mapped[str] = mapped_column(String(50), nullable=False)


class AssignmentRule(Base):
    """crm.assignment_rules — round-robin or max-open-leads config. F3.3."""
    __tablename__ = "assignment_rules"
    __table_args__ = _ARGS

    rule_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    rule_type: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1=round_robin 2=max_open_leads
    max_open_leads: Mapped[int | None] = mapped_column(SmallInteger)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AssignmentPool(Base):
    """crm.assignment_pools — named pool of employees eligible for assignment. F3.3."""
    __tablename__ = "assignment_pools"
    __table_args__ = _ARGS

    pool_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    pool_name: Mapped[str] = mapped_column(String(200), nullable=False)
    rule_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("assignment_rules.rule_id"), nullable=False)
    round_robin_last_position: Mapped[int | None] = mapped_column(BigInteger)

    members: Mapped[list["AssignmentPoolMember"]] = relationship("AssignmentPoolMember", back_populates="pool")


class AssignmentPoolMember(Base):
    """crm.assignment_pool_members — employees in a pool. F3.3."""
    __tablename__ = "assignment_pool_members"
    __table_args__ = _ARGS

    pool_member_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pool_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("assignment_pools.pool_id"), nullable=False)
    workspace_user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspace_users.workspace_user_id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    pool: Mapped["AssignmentPool"] = relationship("AssignmentPool", back_populates="members")
    user: Mapped["WorkspaceUser"] = relationship("WorkspaceUser")


class EscalationConfig(Base):
    """crm.escalation_configs — per-level timeout in minutes. F3.5."""
    __tablename__ = "escalation_configs"
    __table_args__ = _ARGS

    config_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1=first escalation, 2=second, ...
    notify_role_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("roles.role_id"))
    notify_user_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("workspace_users.workspace_user_id"))
    timeout_minutes: Mapped[int] = mapped_column(nullable=False)


class EscalationEvent(Base):
    """crm.escalation_events — audit trail per escalation trigger. F3.5, F3.9, F4.1."""
    __tablename__ = "escalation_events"
    __table_args__ = _ARGS

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("leads.lead_id"), nullable=False)
    escalation_level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    notified_user_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("workspace_users.workspace_user_id"))
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Lead(Base):
    """
    crm.leads — intake record, assignment, ack timer, escalation state.
    F3.1–F3.9; Q4/Q5: version column for optimistic locking.
    TD-1.1: workspace_id on every query.
    """
    __tablename__ = "leads"
    __table_args__ = _ARGS

    lead_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    opportunity_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("opportunities.opportunity_id"))
    contact_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("contacts.contact_id"))
    source_type: Mapped[int] = mapped_column(SmallInteger, ForeignKey("s_lead_sources.source_id"), nullable=False)
    assigned_to: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("workspace_users.workspace_user_id"))
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[int] = mapped_column(SmallInteger, ForeignKey("s_lead_statuses.status_id"), nullable=False, default=1)
    escalation_level: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    last_escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reassigned_from: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("workspace_users.workspace_user_id"))
    reassigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reassignment_reason: Mapped[str | None] = mapped_column(String(300))
    version: Mapped[int] = mapped_column(BigInteger, default=1, nullable=False)  # Q4/Q5: optimistic lock
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    escalation_events: Mapped[list["EscalationEvent"]] = relationship("EscalationEvent", foreign_keys=[EscalationEvent.lead_id])


# ─── Phase 4: Integrations ────────────────────────────────────────────────────

class IntegrationCredential(Base):
    """
    crm.integration_credentials — per-workspace provider config and secrets.
    I5.2: workspace-scoped. I5.3: encrypted_secret never sent to browser.
    For Easypaisa: integration_type='easypaisa', metadata_json={'account_number': '...'}
    For Retell:    integration_type='retell',    encrypted_secret=api_key
    """
    __tablename__ = "integration_credentials"
    __table_args__ = _ARGS

    credential_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    integration_type: Mapped[str] = mapped_column(String(50), nullable=False)  # easypaisa | retell | google_calendar
    encrypted_secret: Mapped[str] = mapped_column(Text, nullable=False, default="")
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class IntegrationEvent(Base):
    """
    crm.integration_events — raw webhook payload store; idempotency key = provider_event_id.
    I1.8, I2.4: check this before processing any inbound event.
    provider_event_id UNIQUE enforces exactly-once processing.
    """
    __tablename__ = "integration_events"
    __table_args__ = _ARGS

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    integration_type: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_event_id: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaymentRequest(Base):
    """
    crm.payment_links — manual Easypaisa payment requests.
    No Stripe/API: employee creates request → shares Easypaisa number+amount →
    customer pays manually → employee confirms with transaction ref.
    I2.8: no card data stored ever.
    Uses stripe_session_id column as internal_reference, stripe_payment_intent_id as easypaisa_txn_ref.
    """
    __tablename__ = "payment_links"
    __table_args__ = _ARGS

    payment_link_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    opportunity_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("opportunities.opportunity_id"))
    contact_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("contacts.contact_id"))
    created_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspace_users.workspace_user_id"), nullable=False)
    # Repurposed columns (schema-compatible):
    stripe_session_id: Mapped[str] = mapped_column(String(200), nullable=False)   # internal ref UUID
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(200))     # Easypaisa txn ref on confirm
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="PKR")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    provider_event_id: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CallLog(Base):
    """
    Retell AI call log — stored in integration_events for idempotency,
    but a dedicated table gives fast lead-scoped queries.
    Not in canonical 38-table schema — stored as integration_events rows in prod Supabase.
    For SQLite local testing only; routes read integration_events in prod.
    ponytail: local-only table, production uses integration_events queries.
    """
    __tablename__ = "call_logs"
    __table_args__ = _ARGS

    call_log_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspaces.workspace_id"), nullable=False)
    lead_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("leads.lead_id"))
    contact_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("contacts.contact_id"))
    retell_call_id: Mapped[str | None] = mapped_column(String(200), unique=True)
    direction: Mapped[str] = mapped_column(String(20), nullable=False, default="outbound")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="initiated")
    duration_seconds: Mapped[int | None] = mapped_column()
    recording_url: Mapped[str | None] = mapped_column(String(500))
    summary: Mapped[str | None] = mapped_column(Text)
    initiated_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("workspace_users.workspace_user_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
