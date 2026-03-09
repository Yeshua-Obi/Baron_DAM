from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, uuid, re, urllib.parse, logging
from datetime import datetime, timezone
from typing import Dict, Optional

# Setup basic logging to see errors in the terminal
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Database Connection
client = AsyncIOMotorClient('mongodb://localhost:27017')
db = client['baron_dam']

@api_router.post("/projects")
async def create_project(data: Dict):
    try:
        folder_name = data.get("name", "Unknown Project")
        print(f"📥 Processing folder: {folder_name}")

        # Default values
        serial, month, year = 0, 1, 2026
        loc, typ = "Unassigned", "Unassigned"
        final_name = folder_name
        p_date = datetime(2026, 1, 1, tzinfo=timezone.utc)

        # REGEX: Look for 8 digits at the start (Project# Month Year)
        match = re.match(r"^(\d{2})(\d{2})(\d{4})\s*[-]?\s*(.*)", folder_name)
        
        if match:
            serial = int(match.group(1))
            month = int(match.group(2))
            year = int(match.group(3))
            rest = match.group(4)
            
            # Create a safe date
            try:
                # Clamp month between 1-12 just in case
                safe_month = max(1, min(12, month))
                p_date = datetime(year, safe_month, 1, tzinfo=timezone.utc)
            except Exception as e:
                print(f"⚠️ Date parsing warning: {e}")

            # Parse Name, Location, Typology
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

        # Build the final document
        project_doc = {
            "id": str(uuid.uuid4()),
            "name": final_name,
            "location": loc,
            "typology": typ,
            "project_serial": serial,
            "project_date": p_date.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "original_name": folder_name
        }

        result = await db.projects.insert_one(project_doc)
        print(f"✅ Successfully saved: {final_name}")
        return {"id": project_doc["id"], "name": final_name}

    except Exception as e:
        # This will print the EXACT error to your uvicorn terminal
        print(f"❌ DATABASE ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/assets")
async def create_asset(asset: Dict):
    asset["id"] = str(uuid.uuid4())
    await db.assets.insert_one(asset)
    return {"ok": True}

@api_router.get("/projects")
async def get_projects():
    return await db.projects.find({}, {"_id": 0}).to_list(1000)

@api_router.get("/stats")
async def get_stats():
    tp = await db.projects.count_documents({})
    ta = await db.assets.count_documents({})
    return {"total_projects": tp, "total_assets": ta, "assets_by_category": {}}

# --- File Bridges ---
@api_router.post("/open-file")
async def open_file(req: Dict):
    path = urllib.parse.unquote(req['file_url'].replace("file:///", "").replace("/", "\\"))
    os.startfile(path)
    return {"ok": True}

@api_router.get("/serve-image")
async def serve_image(file_url: str):
    path = urllib.parse.unquote(file_url).replace("file:///", "").replace("/", "\\")
    return FileResponse(path)

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])