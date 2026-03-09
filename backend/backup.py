import json
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def run_backup():
    # Setup paths
    backup_dir = os.path.join(os.getcwd(), "backups")
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder_path = os.path.join(backup_dir, f"backup_{timestamp}")
    os.makedirs(folder_path)

    # Connect to DB
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['baron_dam']
    
    collections = ['projects', 'assets']
    
    print(f"📂 Starting backup to: {folder_path}")
    
    for coll_name in collections:
        cursor = db[coll_name].find({}, {"_id": 0})
        data = await cursor.to_list(length=None)
        
        file_path = os.path.join(folder_path, f"{coll_name}.json")
        with open(file_path, 'w') as f:
            json.dump(data, f, default=str, indent=4)
        
        print(f"✅ Exported {len(data)} items from '{coll_name}'")

    print("\n📦 Backup Complete. You can now safely experiment.")

if __name__ == "__main__":
    asyncio.run(run_backup())