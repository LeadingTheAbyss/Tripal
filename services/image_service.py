import os
import httpx
import asyncio
import re
import json
from typing import Optional
from models.image import PlaceImage

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# We will use Upstash REST API for caching
UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")

OPENVERSE_SEMAPHORE = asyncio.Semaphore(5)
WIKI_SEMAPHORE = asyncio.Semaphore(5)
PEXELS_SEMAPHORE = asyncio.Semaphore(5)

async def _cache_get(key: str) -> Optional[str]:
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return None
    try:
        headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{UPSTASH_URL}/get/imgcache:{key}", headers=headers, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                return data.get("result")
    except Exception as e:
        print(f"[Cache Error] get: {e}")
    return None

async def _cache_set(key: str, value: str, ttl_seconds: int = 86400):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return
    try:
        # Upstash REST API for SET requires POST or putting value in URL. 
        # Better to use POST with body for large JSONs, but Upstash GET/POST semantics for SET are:
        # POST /set/{key}  with body as value
        headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        async with httpx.AsyncClient() as client:
            await client.post(f"{UPSTASH_URL}/pipeline", headers=headers, json=[
                ["SET", f"imgcache:{key}", value, "EX", ttl_seconds]
            ], timeout=5.0)
    except Exception as e:
        print(f"[Cache Error] set: {e}")

async def search_openverse(query: str) -> Optional[PlaceImage]:
    # Try openverse first
    async with OPENVERSE_SEMAPHORE:
        try:
            async with httpx.AsyncClient() as client:
                headers = {"User-Agent": "TripEasy/1.0"}
                params = {
                    "q": query,
                    "format": "json"
                }
                res = await client.get("https://api.openverse.org/v1/images/", params=params, headers=headers, timeout=8.0)
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("results", [])
                    
                    best_img = None
                    best_score = -1
                    
                    for img in results:
                        score = 0
                        
                        title = img.get("title", "").lower()
                        # Penalize maps, logos, vectors
                        if any(x in title for x in ["map", "logo", "flag", "icon", "vector", "illustration"]):
                            continue
                            
                        # Reward landscape
                        w = img.get("width") or 0
                        h = img.get("height") or 0
                        if w > h:
                            score += 5
                            if w >= 1200:
                                score += 3
                        elif w > 0:
                            score += 1
                        
                        # Exact name match
                        q_words = query.lower().split()
                        if any(w in title for w in q_words if len(w) > 3):
                            score += 5
                            
                        if score > best_score:
                            best_score = score
                            best_img = img
                            
                    if best_img:
                        return PlaceImage(
                            image_url=best_img.get("url"),
                            source="Openverse",
                            photographer=best_img.get("creator"),
                            attribution=best_img.get("attribution")
                        )
        except Exception as e:
            print(f"[Openverse API Error]: {e}")
    return None

async def search_wikimedia(query: str) -> Optional[PlaceImage]:
    async with WIKI_SEMAPHORE:
        try:
            async with httpx.AsyncClient() as client:
                headers = {"User-Agent": "TripEasy/1.0 (https://github.com/LeadingTheAbyss/Tripal)"}
                params = {
                    "action": "query", "prop": "pageimages", "generator": "search",
                    "gsrsearch": query, "format": "json", "pithumbsize": 1000, "gsrlimit": 3
                }
                res = await client.get("https://en.wikipedia.org/w/api.php", params=params, headers=headers, timeout=8.0)
                if res.status_code == 200:
                    data = res.json()
                    pages = data.get("query", {}).get("pages", {})
                    for page in pages.values():
                        if "thumbnail" in page:
                            url = page["thumbnail"]["source"]
                            return PlaceImage(
                                image_url=url,
                                source="Wikimedia Commons",
                                photographer="Wikipedia Contributor",
                                attribution=url
                            )
        except Exception as e:
            print(f"[Wikimedia API Error]: {e}")
    return None

async def search_pexels(query: str) -> Optional[PlaceImage]:
    if not PEXELS_API_KEY:
        return None
        
    async with PEXELS_SEMAPHORE:
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": PEXELS_API_KEY}
                params = {"query": query, "per_page": 1, "orientation": "landscape"}
                res = await client.get("https://api.pexels.com/v1/search", headers=headers, params=params, timeout=8.0)
                if res.status_code == 200:
                    data = res.json()
                    photos = data.get("photos", [])
                    if photos:
                        photo = photos[0]
                        return PlaceImage(
                            image_url=photo.get("src", {}).get("large2x", photo.get("src", {}).get("original")),
                            source="Pexels",
                            photographer=photo.get("photographer"),
                            attribution=photo.get("url")
                        )
        except Exception as e:
            print(f"[Pexels API Error]: {e}")
    return None

def normalize_query(place_name: str) -> str:
    # Remove special characters
    q = re.sub(r'[^\w\s]', '', place_name)
    return q.strip()

async def get_best_place_image(place_name: str) -> Optional[PlaceImage]:
    # 1. Check Cache
    safe_key = re.sub(r'[^a-zA-Z0-9]', '_', place_name.lower())
    cached_json = await _cache_get(safe_key)
    if cached_json:
        try:
            data = json.loads(cached_json)
            print(f"[Cache Hit] Image for {place_name}")
            return PlaceImage(**data)
        except Exception:
            pass
            
    q = normalize_query(place_name)
    print(f"[ImageService] Fetching image for '{q}'")
    
    # 2. Openverse
    img = await search_openverse(q)
    if img and img.image_url:
        print(f"[ImageService] Picked Openverse for {place_name}")
        await _cache_set(safe_key, img.model_dump_json())
        return img
        
    # 3. Wikimedia
    img = await search_wikimedia(q)
    if img and img.image_url:
        print(f"[ImageService] Picked Wikimedia for {place_name}")
        await _cache_set(safe_key, img.model_dump_json())
        return img
        
    # 4. Pexels
    img = await search_pexels(q)
    if img and img.image_url:
        print(f"[ImageService] Picked Pexels for {place_name}")
        await _cache_set(safe_key, img.model_dump_json())
        return img
        
    print(f"[ImageService] No image found for {place_name}")
    return None

# Keep a dummy fetch_real_image for backwards compatibility during migration
async def fetch_real_image(query: str) -> Optional[str]:
    img = await get_best_place_image(query)
    return img.image_url if img else None
