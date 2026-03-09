from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, uuid, re, urllib.parse, logging
from datetime import datetime, timezone
from typing import Dict

# Setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
try:
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['baron_dam']
except Exception as e:
    print(f"❌ MONGODB CONNECTION ERROR: {e}")

@app.get("/api/stats")
async def get_stats():
    try:
        tp = await db.projects.count_documents({})
        ta = await db.assets.count_documents({})
        return {"total_projects": tp, "total_assets": ta, "assets_by_category": {}}
    except Exception as e:
        return {"total_projects": 0, "total_assets": 0}

@app.get("/api/projects")
async def get_projects():
    return await db.projects.find({}, {"_id": 0}).to_list(1000)

@app.post("/api/projects")
async def create_project(data: dict = Body(...)):
    try:
        folder_name = data.get("name", "Unknown Project")
        thumb = data.get("thumbnail_url")
        
        # Initialize defaults
        serial = 0
        loc = "Unassigned"
        typ = "Unassigned"
        final_name = folder_name
        p_date = datetime(2026, 1, 1, tzinfo=timezone.utc)

        # Regex parsing
        match = re.match(r"^(\d{2})(\d{2})(\d{4})\s*[-]?\s*(.*)", folder_name)
        if match:
            serial = int(match.group(1))
            month = int(match.group(2))
            year = int(match.group(3))
            rest = match.group(4)
            
            # Safe Date logic
            try:
                p_date = datetime(year, max(1, min(12, month)), 1, tzinfo=timezone.utc)
            except:
                pass

            # Name/Loc/Typ logic
            parts = [p.strip() for p in re.split(r"\s*-\s*", rest) if p.strip()]
            if len(parts) == 1:
                final_name = parts[0].upper()
            elif len(parts) == 2:
                final_name = parts[0].upper()
                loc = parts[1].title()
            elif len(parts) >= 3:
                typ = parts[-1].title()
                loc = parts[-2].title()
                final_name = " - ".join(parts[:-2]).upper()

        # Build Document
        project_doc = {
            "id": str(uuid.uuid4()),
            "name": final_name,
            "location": loc,
            "typology": typ,
            "project_serial": serial,
            "project_date": p_date.isoformat(),
            "thumbnail_url": thumb,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "original_name": folder_name
        }

        await db.projects.insert_one(project_doc)
        return {"id": project_doc["id"]}

    except Exception as e:
        # This will print the EXACT error in your server terminal
        print(f"❌ PROJECT CREATE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/assets")
async def create_asset(asset: dict = Body(...)):
    try:
        asset["id"] = str(uuid.uuid4())
        await db.assets.insert_one(asset)
        return {"ok": True}
    except Exception as e:
        print(f"❌ ASSET CREATE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/serve-image")
async def serve_image(file_url: str):
    try:
        path = urllib.parse.unquote(file_url.replace("file:///", "").replace("/", "\\"))
        if os.path.exists(path): return FileResponse(path)
        raise HTTPException(status_code=404)
    except:
        raise HTTPException(status_code=500)

@app.post("/api/open-file")
async def open_file(req: dict = Body(...)):
    try:
        path = urllib.parse.unquote(req['file_url'].replace("file:///", "").replace("/", "\\"))
        os.startfile(path)
        return {"ok": True}
    except:
        raise HTTPException(status_code=500)