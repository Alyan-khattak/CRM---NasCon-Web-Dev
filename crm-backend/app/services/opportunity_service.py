"""
Opportunity business logic — stage move validation.
F2.4: required fields must be filled before an opportunity can move to a target stage.
BR-009: checked in pipeline router (stage deletion blocked while occupied).
"""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orm import CustomFieldDefinition, CustomFieldValue, StageRequiredField


async def assert_required_fields_filled(
    db: AsyncSession,
    opportunity_id: int,
    target_stage_id: int,
) -> None:
    """
    F2.4: raises HTTP 422 listing missing field names if any stage-required
    custom field has no value recorded for this opportunity.
    """
    req_result = await db.execute(
        select(StageRequiredField).where(StageRequiredField.stage_id == target_stage_id)
    )
    required = req_result.scalars().all()
    if not required:
        return  # no required fields for this stage

    req_ids = [r.field_def_id for r in required]

    filled_result = await db.execute(
        select(CustomFieldValue.field_def_id).where(
            CustomFieldValue.entity_type == "opportunity",
            CustomFieldValue.entity_id == opportunity_id,
            CustomFieldValue.field_def_id.in_(req_ids),
            # at least one typed value column is non-null
            (
                CustomFieldValue.value_text.isnot(None)
                | CustomFieldValue.value_number.isnot(None)
                | CustomFieldValue.value_date.isnot(None)
                | CustomFieldValue.value_option_id.isnot(None)
            ),
        )
    )
    filled_ids = {row[0] for row in filled_result.fetchall()}

    missing_ids = [fid for fid in req_ids if fid not in filled_ids]
    if not missing_ids:
        return

    names_result = await db.execute(
        select(CustomFieldDefinition.field_name).where(
            CustomFieldDefinition.field_def_id.in_(missing_ids)
        )
    )
    missing_names = [row[0] for row in names_result.fetchall()]
    raise HTTPException(
        status_code=422,
        detail=f"Required fields not filled before stage move: {', '.join(missing_names)} (F2.4)",
    )
