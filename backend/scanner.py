import os
import httpx
import asyncio
import time

COMPANY_SERVER_PATH = r"Y:\BARON_ ARCHITECTURE\BARON PROJECTS\BAL 2026"
API_BASE_URL = "http://127.0.0.1:8000/api"

async def scan_server():
    print(f"🚀 Starting scan: {COMPANY_SERVER_PATH}")
    
    if not os.path.exists(COMPANY_SERVER_PATH):
        print("❌ Drive not found!")
        return

    async with httpx.AsyncClient(timeout=120.0) as client:
        for folder in os.listdir(COMPANY_SERVER_PATH):
            full_path = os.path.join(COMPANY_SERVER_PATH, folder)
            if not os.path.isdir(full_path) or folder.startswith('.'): continue

            print(f"📁 Processing: {folder}")
            try:
                # Create Project
                res = await client.post(f"{API_BASE_URL}/projects", json={"name": folder})
                if res.status_code == 200:
                    p_id = res.json()["id"]
                    # Scan Assets
                    count = 0
                    for root, dirs, files in os.walk(full_path):
                        for file in files:
                            if file.startswith('.') or file.lower() in ['thumbs.db', 'desktop.ini']: continue
                            f_path = os.path.join(root, file)
                            asset_data = {
                                "name": file,
                                "file_url": f"file:///{f_path.replace(chr(92), '/')}",
                                "project_id": p_id
                            }
                            await client.post(f"{API_BASE_URL}/assets", json=asset_data)
                            count += 1
                    print(f"   ✅ Linked {count} files.")
                else:
                    print(f"   ⚠️ Server Error: {res.text}")
                
                # Small pause to let the server breathe
                time.sleep(0.1)

            except Exception as e:
                print(f"   ❌ Connection Failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(scan_server())