from datetime import datetime, timedelta
from typing import Optional
import uuid

from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.email_change import EmailChangeAuditLog, EmailChangeRequest


async def create_email_change_request(
    db: AsyncSession,
    user_id: uuid.UUID,
    old_email: str,
    new_email: str,
    otp_code: str,
    expires_at: datetime,
) -> EmailChangeRequest:
    request = EmailChangeRequest(
        user_id=user_id,
        old_email=old_email,
        new_email=new_email,
        otp_code=otp_code,
        status="pending",
        requested_at=datetime.utcnow(),
        last_sent_at=datetime.utcnow(),
        expires_at=expires_at,
    )
    db.add(request)
    await db.flush()
    return request


async def get_latest_active_email_change_request(
    db: AsyncSession, user_id: uuid.UUID
) -> Optional[EmailChangeRequest]:
    result = await db.execute(
        select(EmailChangeRequest)
        .where(
            and_(
                EmailChangeRequest.user_id == user_id,
                EmailChangeRequest.status == "pending",
                EmailChangeRequest.expires_at >= datetime.utcnow(),
            )
        )
        .order_by(EmailChangeRequest.requested_at.desc())
    )
    return result.scalars().first()


async def count_recent_email_change_requests(
    db: AsyncSession, user_id: uuid.UUID, within_minutes: int
) -> int:
    since = datetime.utcnow() - timedelta(minutes=within_minutes)
    result = await db.execute(
        select(func.count(EmailChangeRequest.request_id)).where(
            and_(
                EmailChangeRequest.user_id == user_id,
                EmailChangeRequest.requested_at >= since,
            )
        )
    )
    return int(result.scalar_one() or 0)


async def invalidate_pending_email_change_requests(
    db: AsyncSession, user_id: uuid.UUID
) -> None:
    result = await db.execute(
        select(EmailChangeRequest).where(
            and_(
                EmailChangeRequest.user_id == user_id,
                EmailChangeRequest.status == "pending",
            )
        )
    )
    for item in result.scalars().all():
        item.status = "cancelled"
    await db.flush()


async def add_email_change_audit_log(
    db: AsyncSession,
    user_id: uuid.UUID,
    old_email: str,
    new_email: Optional[str],
    action: str,
    status: str,
    details: Optional[str] = None,
) -> None:
    audit = EmailChangeAuditLog(
        user_id=user_id,
        old_email=old_email,
        new_email=new_email,
        action=action,
        status=status,
        details=details,
    )
    db.add(audit)
    await db.flush()


async def delete_all_user_email_change_requests(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(delete(EmailChangeRequest).where(EmailChangeRequest.user_id == user_id))
    await db.flush()
