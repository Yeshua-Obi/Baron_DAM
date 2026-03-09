import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def reset():
    print("🧹 Wiping old database entries...")
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['baron_dam']
    await db.projects.delete_many({})
    await db.assets.delete_many({})
    print("✅ Database is clean! Ready for a fresh scan.")

asyncio.run(reset())