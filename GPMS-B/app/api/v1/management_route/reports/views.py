from .controller import ReportsController

class ReportsView:
    def __init__(self, db_session):
        self.controller = ReportsController(db_session)

    async def get_dashboard_report(self, filter_type: str = "year"):
        sticker_stats = await self.controller.get_sticker_stats()
        payment_stats = await self.controller.get_payment_stats()
        weekly_stats = await self.controller.get_weekly_application_stats(filter_type)
        sticker_distribution = await self.controller.get_sticker_distribution()

        return {
            "reports": {
                "total_vehicle_stickers": sticker_stats,
                "total_payment": payment_stats,
                "sticker_distribution": sticker_distribution,
                "overall_applications": weekly_stats
            }
        }