from datetime import datetime, timedelta
from sqlalchemy import select, and_, not_, exists, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.application import Application
from app.db.models.application_status import ApplicationStatus
from app.db.models.slip import Slip
from app.db.models.document import Document
from app.db.models.auth_driver import AuthDriver
from app.db.models.assigned_driver import AssignedDriver

async def cleanup_stale_applications(db: AsyncSession) -> int:
    """
    Delete applications that are more than 5 days old and don't have any status records.
    """
    try:
        threshold_date = (datetime.now() - timedelta(days=5)).date()
        print(f"CLEANUP: Starting cleanup for applications older than {threshold_date}")
        
        # Find stale applications
        query = select(Application).where(
            and_(
                Application.date < threshold_date,
                ~exists().where(
                    ApplicationStatus.application_id == Application.application_id
                )
            )
        )
        
        result = await db.execute(query)
        stale_applications = result.scalars().all()
        
        if not stale_applications:
            print("CLEANUP: No stale applications found")
            return 0
            
        print(f"CLEANUP: Found {len(stale_applications)} stale applications to delete")
        
        delete_count = 0
        for app in stale_applications:
            try:
                print(f"CLEANUP: Processing application {app.application_id}")
                
                # 1. First, handle documents referenced by auth_drivers
                doc_query = select(Document).where(Document.application_id == app.application_id)
                doc_result = await db.execute(doc_query)
                documents = doc_result.scalars().all()
                
                for doc in documents:
                    # Check if document is referenced by any auth_driver
                    auth_driver_query = select(AuthDriver).where(AuthDriver.document_id == doc.document_id)
                    auth_driver_result = await db.execute(auth_driver_query)
                    auth_driver = auth_driver_result.scalar_one_or_none()
                    
                    if auth_driver:
                        # If document is referenced by auth_driver, just disassociate it from the application
                        update_stmt = update(Document).where(
                            Document.document_id == doc.document_id
                        ).values(application_id=None)
                        await db.execute(update_stmt)
                        print(f"CLEANUP: Disassociated document {doc.document_id} from application {app.application_id}")
                
                # 2. Now delete documents that aren't referenced by auth_drivers
                unreferenced_query = select(Document).where(
                    and_(
                        Document.application_id == app.application_id,
                        ~exists().where(AuthDriver.document_id == Document.document_id)
                    )
                )
                unreferenced_result = await db.execute(unreferenced_query)
                unreferenced_docs = unreferenced_result.scalars().all()
                
                for doc in unreferenced_docs:
                    await db.delete(doc)
                    print(f"CLEANUP: Deleted document {doc.document_id}")
                
                # 3. Delete assigned drivers
                delete_assigned = delete(AssignedDriver).where(
                    AssignedDriver.application_id == app.application_id
                )
                await db.execute(delete_assigned)
                
                # 4. Delete the application
                await db.delete(app)
                print(f"CLEANUP: Deleted application {app.application_id}")
                
                # 5. Handle slip deletion if needed
                if app.slip_id:
                    slip_check = select(Application).where(
                        Application.slip_id == app.slip_id
                    )
                    slip_result = await db.execute(slip_check)
                    if not slip_result.scalar_one_or_none():
                        slip_query = select(Slip).where(Slip.slip_id == app.slip_id)
                        slip_result = await db.execute(slip_query)
                        slip = slip_result.scalar_one_or_none()
                        if slip:
                            await db.delete(slip)
                            print(f"CLEANUP: Deleted orphaned slip {app.slip_id}")
                
                await db.commit()
                delete_count += 1
                print(f"CLEANUP: Successfully deleted application {app.application_id}")
                
            except Exception as e:
                print(f"CLEANUP ERROR in application {app.application_id}: {str(e)}")
                await db.rollback()
                continue
        
        print(f"CLEANUP: Total applications deleted: {delete_count}")
        return delete_count
        
    except Exception as e:
        await db.rollback()
        print(f"CLEANUP ERROR: {str(e)}")
        return 0