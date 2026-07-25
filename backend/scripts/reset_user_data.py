import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import AsyncSessionLocal
from app.models import User, CreditReport, Tradeline, BureauTradelineDetail, ComplianceViolation, DisputeCampaign, DisputeLetter, DataLeak, OptOutRequest
from sqlalchemy import select, delete

async def reset_all_user_data():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User))
        users = user_res.scalars().all()
        print(f"Found {len(users)} users in database.")

        # Delete all credit reports, tradelines, violations, campaigns, letters, leaks, opt-outs
        await db.execute(delete(BureauTradelineDetail))
        await db.execute(delete(ComplianceViolation))
        await db.execute(delete(Tradeline))
        await db.execute(delete(DisputeLetter))
        await db.execute(delete(DisputeCampaign))
        await db.execute(delete(CreditReport))
        await db.execute(delete(DataLeak))
        await db.execute(delete(OptOutRequest))

        await db.commit()
        print("Successfully reset all credit reports, tradelines, violations, campaigns, leaks, and opt-out requests to 0!")

if __name__ == "__main__":
    asyncio.run(reset_all_user_data())
