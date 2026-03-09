import os
import httpx
import asyncio
import time

# CONFIG
DRIVE_PATH = r"Y:\BARON_ ARCHITECTURE\BARON PROJECTS\BAL 2026"
API_URL = "http://127.0.0.1:8000/api"

def get_hero_image(project_path):
    """
    1. Finds any folder containing 'render' (e.g., PRESENTATION/RENDERS).
    2. Recursively searches ALL subfolders inside that 'render' folder.
    3. Priority: Filename containing 'view 01'.
    4. Fallback: The absolute latest image by modification date.
    """
    valid_exts = ('.jpg', '.jpeg', '.png', '.webp')
    all_found_images = []
    
    # Step 1: Look for any folder that has "render" in the name
    for root, dirs, files in os.walk(project_path):
        if "render" in root.lower():
            # Step 2: Once a 'render' folder is found, walk through ALL its subfolders
            for r, d, f in os.walk(root):
                for file in f:
                    if file.lower().endswith(valid_exts):
                        img_full_path = os.path.join(r, file)
                        all_found_images.append(img_full_path)

    if not all_found_images:
        return None

    # Step 3: Priority 1 - Look for "view 01" in the entire collected list
    for img_path in all_found_images:
        if "view 01" in os.path.basename(img_path).lower():
            return f"file:///{img_path.replace(chr(92), '/')}"
    
    # Step 4: Priority 2 - Pick the latest image by modification time
    try:
        all_found_images.sort(key=os.path.getmtime, reverse=True)
        latest_img = all_found_images[0]
        return f"file:///{latest_img.replace(chr(92), '/')}"
    except Exception as e:
        print(f"      ⚠️ Sorting error: {e}")
        return None

async def run_scan():
    print(f"🚀 Starting Deep-Dive Visual Scan...")
    print(f"📍 Target: {DRIVE_PATH}")
    
    async with httpx.AsyncClient(timeout=None) as client:
        # Get list of top-level project folders
        try:
            folders = [f for f in os.listdir(DRIVE_PATH) if os.path.isdir(os.path.join(DRIVE_PATH, f))]
        except Exception as e:
            print(f"❌ Could not access Y: Drive. Error: {e}")
            return

        for folder in folders:
            if folder.startswith('.'): continue
            full_path = os.path.join(DRIVE_PATH, folder)
            
            print(f"📁 Project: {folder}")
            hero = get_hero_image(full_path)
            
            try:
                # Create the Project entry
                res = await client.post(f"{API_URL}/projects", json={
                    "name": folder, 
                    "thumbnail_url": hero
                })
                
                if res.status_code == 200:
                    p_id = res.json()["id"]
                    
                    # Quick Asset Scan (all files in the project for searchability)
                    asset_count = 0
                    for root, dirs, files in os.walk(full_path):
                        for f in files:
                            if f.startswith('.') or f.lower() in ['thumbs.db', 'desktop.ini']: continue
                            f_path = os.path.join(root, f)
                            await client.post(f"{API_URL}/assets", json={
                                "name": f, 
                                "file_url": f"file:///{f_path.replace(chr(92), '/')}", 
                                "project_id": p_id
                            })
                            asset_count += 1
                    
                    status = f"FOUND ({os.path.basename(hero)})" if hero else "NOT FOUND"
                    print(f"   ✅ Linked {asset_count} files. Hero: {status}")
                else:
                    print(f"   ⚠️ Server returned error {res.status_code}")

            except Exception as e:
                print(f"   ❌ Network/Database Error: {e}")

    print("\n✨ Scan Complete. Refresh the Dashboard.")

if __name__ == "__main__":
    asyncio.run(run_scan())