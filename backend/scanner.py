import os
import motor.motor_asyncio
import asyncio
import uuid
from datetime import datetime

# Connection to your local Baron database
client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
db = client.baron_dam

# Maps extensions to strict mime types for the backend validation
MIME_TYPES = {    
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',    
    '.gif': 'image/gif', '.webp': 'image/webp',    
    '.pdf': 'application/pdf',    
    '.dwg': 'application/acad', '.dxf': 'application/dxf',    
    '.rvt': 'application/revit', '.skp': 'application/sketchup',    
    '.mp4': 'video/mp4', '.mov': 'video/quicktime',    
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',    
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',    
    '.zip': 'application/zip', '.db': 'application/octet-stream',
}

async def scan_project_folder(project_name, root_path):
    print(f"--- 🔍 Deep Scanning Baron Project: {project_name} ---")
        
    if not os.path.exists(root_path):
        print(f"❌ ERROR: Cannot find folder at {root_path}")
        return

    new_project_id = str(uuid.uuid4())
    
    project_data = {
        "_id": new_project_id,
        "id": new_project_id,
        "name": project_name,
        "location": "Lagos, Nigeria",
        "typology": "Commercial",
        "status": "active",
        "updated_at": datetime.now(),
        "created_at": datetime.now(),
        "tags": [],
        "asset_count": 0,
    }
        
    await db.projects.insert_one(project_data)
    print(f"   [Created Project] ID: {new_project_id}")

    count = 0
    for root, dirs, files in os.walk(root_path):
        relative_path = os.path.relpath(root, root_path)
        path_parts = [] if relative_path == "." else relative_path.split(os.sep)

        for file in files:
            if file.startswith('.'): continue
                        
            file_path = os.path.join(root, file)
            extension = os.path.splitext(file)[1].lower()
                        
            path_parts_upper = [p.upper() for p in path_parts]
            
            if "DRAWINGS" in path_parts_upper:
                category = "Floor Plan"
            elif "PRESENTATION" in path_parts_upper:
                category = "Render"
            elif "ADMIN" in path_parts_upper:
                category = "Admin"
            else:
                category = "Uncategorized"

            is_image = extension in ['.jpg', '.png', '.jpeg', '.gif', '.webp']
            actual_file_type = "image" if is_image else "document"
            mime_type = MIME_TYPES.get(extension, 'application/octet-stream')
            
            asset_id = str(uuid.uuid4())
            asset_data = {
                "_id": asset_id,
                "id": asset_id,
                "project_id": new_project_id,
                "name": file,
                "file_type": actual_file_type,
                "mime_type": mime_type, 
                "file_url": f"file://{file_path.replace(os.sep, '/')}",
                "size_bytes": os.path.getsize(file_path),
                "ai_category": category,
                "ai_tags": [],
                "custom_tags": [],
                "metadata": { 
                     "path": path_parts, 
                     "extension": extension 
                 },
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }
            await db.assets.insert_one(asset_data)
            count += 1
            print(f"   [Added] {file} in {path_parts}")

    # Update project with the exact asset count
    await db.projects.update_one(
        {"_id": new_project_id},
        {"$set": {"asset_count": count}}
    )
        
    print(f"\n--- ✅ SUCCESS! Added {count} files to {project_name} ---")

if __name__ == "__main__":
    async def main():
        print("🧹 Clearing old database entries...")
        await db.projects.delete_many({}) 
        await db.assets.delete_many({})
        
        PATH = r"C:\Users\oladi\Desktop\nibbs test"
        await scan_project_folder("NIBSS Project", PATH)

    asyncio.run(main())