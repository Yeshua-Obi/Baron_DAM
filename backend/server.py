from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from fuzzywuzzy import fuzz, process
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
# Added fallback to local so it doesn't crash before we set up the .env file
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'baron_dam')]

# Create the main app
app = FastAPI(title="Baron Architecture DAM")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ Models ============

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    location: str
    typology: str  # Residential, Commercial, Masterplan
    client_name: Optional[str] = None
    status: str = "active"  # active, archived, completed
    clickup_task_id: Optional[str] = None
    clickup_list_id: Optional[str] = None
    tags: List[str] = []

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    asset_count: int = 0
    thumbnail_url: Optional[str] = None

class AssetBase(BaseModel):
    name: str
    file_url: str
    file_type: str  # image, document, video
    mime_type: str
    size_bytes: int
    project_id: str
    ai_category: str = "Uncategorized"  # Render, Floor Plan, Elevation, Site Photo, Sketch
    ai_tags: List[str] = []
    custom_tags: List[str] = []
    metadata: Dict[str, Any] = {}

class AssetCreate(BaseModel):
    name: str
    file_url: str
    file_type: str
    mime_type: str
    size_bytes: int
    project_id: str
    custom_tags: List[str] = []
    metadata: Dict[str, Any] = {}

class Asset(AssetBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SearchResult(BaseModel):
    projects: List[Project] = []
    assets: List[Asset] = []

class ClickUpConfig(BaseModel):
    api_key: str
    workspace_id: Optional[str] = None
    default_list_id: Optional[str] = None

class ClickUpTask(BaseModel):
    id: str
    name: str
    status: str
    url: Optional[str] = None

class StatsResponse(BaseModel):
    total_projects: int
    total_assets: int
    assets_by_category: Dict[str, int]
    projects_by_typology: Dict[str, int]
    recent_activity_count: int

# ============ Mock AI Tagging Service ============

def mock_ai_categorize(filename: str, mime_type: str) -> tuple:
    """
    Mock AI categorization based on filename patterns.
    Will be replaced with CLIP model later.
    """
    filename_lower = filename.lower()
    
    # Category detection based on filename patterns
    if any(kw in filename_lower for kw in ['render', '3d', 'viz', 'cgi', 'visual']):
        category = "Render"
        tags = ["3D Visualization", "CGI"]
    elif any(kw in filename_lower for kw in ['floor', 'plan', 'layout', 'fp']):
        category = "Floor Plan"
        tags = ["Technical Drawing", "Layout"]
    elif any(kw in filename_lower for kw in ['elevation', 'elev', 'facade', 'front', 'side']):
        category = "Elevation"
        tags = ["Technical Drawing", "Facade"]
    elif any(kw in filename_lower for kw in ['site', 'photo', 'construction', 'progress', 'img']):
        category = "Site Photo"
        tags = ["Documentation", "Progress"]
    elif any(kw in filename_lower for kw in ['sketch', 'concept', 'hand', 'draft']):
        category = "Sketch"
        tags = ["Concept", "Hand Drawing"]
    elif any(kw in filename_lower for kw in ['section', 'cut', 'cross']):
        category = "Section"
        tags = ["Technical Drawing", "Cross Section"]
    elif any(kw in filename_lower for kw in ['detail', 'dtl', 'node']):
        category = "Detail"
        tags = ["Technical Drawing", "Construction Detail"]
    else:
        category = "Uncategorized"
        tags = []
    
    return category, tags

# ============ ClickUp Integration ============

class ClickUpClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.clickup.com/api/v2"
        self.headers = {
            "Authorization": api_key,
            "Content-Type": "application/json"
        }
    
    async def get_workspaces(self) -> List[Dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/team",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json().get("teams", [])
    
    async def get_spaces(self, team_id: str) -> List[Dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/team/{team_id}/space",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json().get("spaces", [])
    
    async def get_folders(self, space_id: str) -> List[Dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/space/{space_id}/folder",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json().get("folders", [])
    
    async def get_lists(self, folder_id: str) -> List[Dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/folder/{folder_id}/list",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json().get("lists", [])
    
    async def get_task(self, task_id: str) -> Dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/task/{task_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def update_task_status(self, task_id: str, status: str) -> Dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{self.base_url}/task/{task_id}",
                headers=self.headers,
                json={"status": status}
            )
            response.raise_for_status()
            return response.json()
    
    async def create_task(self, list_id: str, name: str, description: str = "") -> Dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/list/{list_id}/task",
                headers=self.headers,
                json={"name": name, "description": description}
            )
            response.raise_for_status()
            return response.json()

# ============ API Routes ============

@api_router.get("/")
async def root():
    return {"message": "Baron Architecture DAM API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# --- Projects ---

@api_router.get("/projects", response_model=List[Project])
async def get_projects(
    typology: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    query = {}
    if typology:
        query["typology"] = typology
    if status:
        query["status"] = status
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    projects = await db.projects.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'].replace('Z', '+00:00'))
        if isinstance(project.get('updated_at'), str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'].replace('Z', '+00:00'))
    
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'].replace('Z', '+00:00'))
    if isinstance(project.get('updated_at'), str):
        project['updated_at'] = datetime.fromisoformat(project['updated_at'].replace('Z', '+00:00'))
    
    return project

@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate):
    project = Project(**project_data.model_dump())
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.projects.insert_one(doc)
    return project

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectCreate):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'].replace('Z', '+00:00'))
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'].replace('Z', '+00:00'))
    
    return updated

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Also delete associated assets
    await db.assets.delete_many({"project_id": project_id})
    
    return {"message": "Project deleted successfully"}

# --- Assets ---

@api_router.get("/assets", response_model=List[Asset])
async def get_assets(
    project_id: Optional[str] = None,
    ai_category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if ai_category:
        query["ai_category"] = ai_category
    
    assets = await db.assets.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for asset in assets:
        if isinstance(asset.get('created_at'), str):
            asset['created_at'] = datetime.fromisoformat(asset['created_at'].replace('Z', '+00:00'))
        if isinstance(asset.get('updated_at'), str):
            asset['updated_at'] = datetime.fromisoformat(asset['updated_at'].replace('Z', '+00:00'))
    
    return assets

@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str):
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if isinstance(asset.get('created_at'), str):
        asset['created_at'] = datetime.fromisoformat(asset['created_at'].replace('Z', '+00:00'))
    if isinstance(asset.get('updated_at'), str):
        asset['updated_at'] = datetime.fromisoformat(asset['updated_at'].replace('Z', '+00:00'))
    
    return asset

@api_router.post("/assets", response_model=Asset)
async def create_asset(asset_data: AssetCreate):
    # Apply mock AI categorization
    category, ai_tags = mock_ai_categorize(asset_data.name, asset_data.mime_type)
    
    asset = Asset(
        **asset_data.model_dump(),
        ai_category=category,
        ai_tags=ai_tags
    )
    
    doc = asset.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.assets.insert_one(doc)
    
    # Update project asset count
    await db.projects.update_one(
        {"id": asset_data.project_id},
        {"$inc": {"asset_count": 1}}
    )
    
    return asset

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    result = await db.assets.delete_one({"id": asset_id})
    
    # Update project asset count
    await db.projects.update_one(
        {"id": asset["project_id"]},
        {"$inc": {"asset_count": -1}}
    )
    
    return {"message": "Asset deleted successfully"}

# --- Search ---

@api_router.get("/search", response_model=SearchResult)
async def search(q: str = Query(..., min_length=1)):
    """Fuzzy search across projects and assets"""
    
    # Search projects
    all_projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    project_matches = []
    
    for project in all_projects:
        # Calculate fuzzy match score
        name_score = fuzz.partial_ratio(q.lower(), project.get('name', '').lower())
        location_score = fuzz.partial_ratio(q.lower(), project.get('location', '').lower())
        tags_score = max([fuzz.partial_ratio(q.lower(), tag.lower()) for tag in project.get('tags', [])] or [0])
        
        max_score = max(name_score, location_score, tags_score)
        
        if max_score >= 60:  # Threshold for match
            if isinstance(project.get('created_at'), str):
                project['created_at'] = datetime.fromisoformat(project['created_at'].replace('Z', '+00:00'))
            if isinstance(project.get('updated_at'), str):
                project['updated_at'] = datetime.fromisoformat(project['updated_at'].replace('Z', '+00:00'))
            project_matches.append((max_score, project))
    
    # Sort by score descending
    project_matches.sort(key=lambda x: x[0], reverse=True)
    projects = [p[1] for p in project_matches[:20]]
    
    # Search assets
    all_assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    asset_matches = []
    
    for asset in all_assets:
        name_score = fuzz.partial_ratio(q.lower(), asset.get('name', '').lower())
        category_score = fuzz.partial_ratio(q.lower(), asset.get('ai_category', '').lower())
        tags_score = max(
            [fuzz.partial_ratio(q.lower(), tag.lower()) for tag in asset.get('ai_tags', []) + asset.get('custom_tags', [])]
            or [0]
        )
        
        max_score = max(name_score, category_score, tags_score)
        
        if max_score >= 60:
            if isinstance(asset.get('created_at'), str):
                asset['created_at'] = datetime.fromisoformat(asset['created_at'].replace('Z', '+00:00'))
            if isinstance(asset.get('updated_at'), str):
                asset['updated_at'] = datetime.fromisoformat(asset['updated_at'].replace('Z', '+00:00'))
            asset_matches.append((max_score, asset))
    
    asset_matches.sort(key=lambda x: x[0], reverse=True)
    assets = [a[1] for a in asset_matches[:20]]
    
    return SearchResult(projects=projects, assets=assets)

# --- Stats ---

@api_router.get("/stats", response_model=StatsResponse)
async def get_stats():
    total_projects = await db.projects.count_documents({})
    total_assets = await db.assets.count_documents({})
    
    # Assets by category
    category_pipeline = [
        {"$group": {"_id": "$ai_category", "count": {"$sum": 1}}}
    ]
    category_results = await db.assets.aggregate(category_pipeline).to_list(100)
    assets_by_category = {r["_id"]: r["count"] for r in category_results if r["_id"]}
    
    # Projects by typology
    typology_pipeline = [
        {"$group": {"_id": "$typology", "count": {"$sum": 1}}}
    ]
    typology_results = await db.projects.aggregate(typology_pipeline).to_list(100)
    projects_by_typology = {r["_id"]: r["count"] for r in typology_results if r["_id"]}
    
    # Recent activity (last 7 days)
    recent_count = await db.assets.count_documents({})
    
    return StatsResponse(
        total_projects=total_projects,
        total_assets=total_assets,
        assets_by_category=assets_by_category,
        projects_by_typology=projects_by_typology,
        recent_activity_count=recent_count
    )

# --- ClickUp Integration ---

@api_router.post("/clickup/test-connection")
async def test_clickup_connection(config: ClickUpConfig):
    """Test ClickUp API connection with provided key"""
    try:
        clickup = ClickUpClient(config.api_key)
        workspaces = await clickup.get_workspaces()
        return {
            "success": True,
            "workspaces": workspaces,
            "message": f"Connected successfully. Found {len(workspaces)} workspace(s)."
        }
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=401, detail="Invalid ClickUp API key")
    except Exception as e:
        logger.error(f"ClickUp connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/clickup/workspaces")
async def get_clickup_workspaces(api_key: str = Query(...)):
    """Get ClickUp workspaces"""
    try:
        clickup = ClickUpClient(api_key)
        workspaces = await clickup.get_workspaces()
        return {"workspaces": workspaces}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/clickup/spaces/{team_id}")
async def get_clickup_spaces(team_id: str, api_key: str = Query(...)):
    """Get ClickUp spaces for a workspace"""
    try:
        clickup = ClickUpClient(api_key)
        spaces = await clickup.get_spaces(team_id)
        return {"spaces": spaces}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/clickup/folders/{space_id}")
async def get_clickup_folders(space_id: str, api_key: str = Query(...)):
    """Get ClickUp folders for a space"""
    try:
        clickup = ClickUpClient(api_key)
        folders = await clickup.get_folders(space_id)
        return {"folders": folders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/clickup/lists/{folder_id}")
async def get_clickup_lists(folder_id: str, api_key: str = Query(...)):
    """Get ClickUp lists for a folder"""
    try:
        clickup = ClickUpClient(api_key)
        lists = await clickup.get_lists(folder_id)
        return {"lists": lists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/clickup/sync-project/{project_id}")
async def sync_project_to_clickup(
    project_id: str,
    api_key: str = Query(...),
    list_id: str = Query(...)
):
    """Create or update a ClickUp task for a project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        clickup = ClickUpClient(api_key)
        
        if project.get('clickup_task_id'):
            # Update existing task
            task = await clickup.get_task(project['clickup_task_id'])
            return {"success": True, "task": task, "action": "fetched"}
        else:
            # Create new task
            task = await clickup.create_task(
                list_id,
                project['name'],
                f"Location: {project['location']}\nTypology: {project['typology']}\n\n{project.get('description', '')}"
            )
            
            # Save task ID to project
            await db.projects.update_one(
                {"id": project_id},
                {"$set": {"clickup_task_id": task['id'], "clickup_list_id": list_id}}
            )
            
            return {"success": True, "task": task, "action": "created"}
    except Exception as e:
        logger.error(f"ClickUp sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Seed Demo Data ---

@api_router.post("/seed-demo")
async def seed_demo_data():
    """Seed database with demo projects and assets for testing"""
    
    # Clear existing demo data
    await db.projects.delete_many({})
    await db.assets.delete_many({})
    
    demo_projects = [
        {
            "id": str(uuid.uuid4()),
            "name": "The Waterfront Residences",
            "description": "A luxury 24-story residential tower with panoramic ocean views",
            "location": "Dubai Marina, UAE",
            "typology": "Residential",
            "client_name": "Emaar Properties",
            "status": "active",
            "tags": ["Luxury", "High-rise", "Waterfront", "Contemporary"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "asset_count": 4,
            "thumbnail_url": "https://images.unsplash.com/photo-1753577397032-84547293171d?w=800"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Central Business Hub",
            "description": "Mixed-use commercial development featuring Grade A office space",
            "location": "Singapore CBD",
            "typology": "Commercial",
            "client_name": "CapitaLand",
            "status": "active",
            "tags": ["Office", "Retail", "Mixed-use", "Sustainable"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "asset_count": 3,
            "thumbnail_url": "https://images.unsplash.com/photo-1733836851111-656a85e676ce?w=800"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Green Valley Masterplan",
            "description": "Sustainable township development with integrated green spaces",
            "location": "Melbourne, Australia",
            "typology": "Masterplan",
            "client_name": "Lendlease",
            "status": "completed",
            "tags": ["Masterplan", "Sustainable", "Township", "Green"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "asset_count": 3,
            "thumbnail_url": "https://images.unsplash.com/photo-1765547682681-428452039cd8?w=800"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Heritage Boutique Hotel",
            "description": "Adaptive reuse of a heritage building into a luxury boutique hotel",
            "location": "London, UK",
            "typology": "Commercial",
            "client_name": "Four Seasons",
            "status": "active",
            "tags": ["Hotel", "Heritage", "Renovation", "Luxury"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "asset_count": 2,
            "thumbnail_url": "https://images.unsplash.com/photo-1768617154338-f7cd88a87039?w=800"
        }
    ]
    
    await db.projects.insert_many(demo_projects)
    
    # Demo assets for first project
    project_1_id = demo_projects[0]["id"]
    demo_assets = [
        {
            "id": str(uuid.uuid4()),
            "name": "Waterfront_Render_Dusk_01.jpg",
            "file_url": "https://images.unsplash.com/photo-1753577397032-84547293171d?w=1200",
            "file_type": "image",
            "mime_type": "image/jpeg",
            "size_bytes": 2500000,
            "project_id": project_1_id,
            "ai_category": "Render",
            "ai_tags": ["3D Visualization", "CGI", "Dusk"],
            "custom_tags": ["Hero Image", "Marketing"],
            "metadata": {"width": 1920, "height": 1080},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Floor_Plan_Level_01.pdf",
            "file_url": "https://images.unsplash.com/photo-1721244654346-9be0c0129e36?w=1200",
            "file_type": "image",
            "mime_type": "image/jpeg",
            "size_bytes": 1500000,
            "project_id": project_1_id,
            "ai_category": "Floor Plan",
            "ai_tags": ["Technical Drawing", "Layout"],
            "custom_tags": ["Level 1", "Approved"],
            "metadata": {"width": 1200, "height": 800},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Site_Photo_Progress_Week12.jpg",
            "file_url": "https://images.unsplash.com/photo-1765547682681-428452039cd8?w=1200",
            "file_type": "image",
            "mime_type": "image/jpeg",
            "size_bytes": 3200000,
            "project_id": project_1_id,
            "ai_category": "Site Photo",
            "ai_tags": ["Documentation", "Progress"],
            "custom_tags": ["Week 12", "Construction"],
            "metadata": {"width": 4000, "height": 3000},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Concept_Sketch_Initial.jpg",
            "file_url": "https://images.unsplash.com/photo-1724786594289-41ebbf53a35b?w=1200",
            "file_type": "image",
            "mime_type": "image/jpeg",
            "size_bytes": 800000,
            "project_id": project_1_id,
            "ai_category": "Sketch",
            "ai_tags": ["Concept", "Hand Drawing"],
            "custom_tags": ["Initial Concept"],
            "metadata": {"width": 1600, "height": 1200},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Assets for second project
    project_2_id = demo_projects[1]["id"]
    demo_assets.extend([
        {
            "id": str(uuid.uuid4()),
            "name": "CBD_Tower_Render_Day.jpg",
            "file_url": "https://images.unsplash.com/photo-1733836851111-656a85e676ce?w=1200",
            "file_type": "image",
            "mime_type": "image/jpeg",
            "size_bytes": 2800000,
            "project_id": project_2_id,
            "ai_category": "Render",
            "ai_tags": ["3D Visualization", "CGI"],
            "custom_tags": ["Daytime", "Street View"],
            "metadata": {"width": 1920, "height": 1080},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Elevation_North_Facade.jpg",
            "file_url": "https://images.unsplash.com/photo-1768617154338-f7cd88a87039?w=1200",
            "file_type": "image",
            "mime_type": "image/jpeg",
            "size_bytes": 1200000,
            "project_id": project_2_id,
            "ai_category": "Elevation",
            "ai_tags": ["Technical Drawing", "Facade"],
            "custom_tags": ["North", "Final"],
            "metadata": {"width": 1400, "height": 2000},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ])
    
    # Assets for third project
    project_3_id = demo_projects[2]["id"]
    demo_assets.extend([
        {
            "id": str(uuid.uuid4()),
            "name": "Masterplan_Aerial_Render.jpg",
            "file_url": "https://images.unsplash.com/photo-1765547682681-428452039cd8?w=1200",
            "file_type": "image",
            "mime_type": "image/jpeg",
            "size_bytes": 4500000,
            "project_id": project_3_id,
            "ai_category": "Render",
            "ai_tags": ["3D Visualization", "Aerial"],
            "custom_tags": ["Masterplan", "Overview"],
            "metadata": {"width": 3840, "height": 2160},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ])
    
    await db.assets.insert_many(demo_assets)
    
    return {
        "message": "Demo data seeded successfully",
        "projects_created": len(demo_projects),
        "assets_created": len(demo_assets)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()