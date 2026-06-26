import os
import requests
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

IMAGE_CACHE = {}

def get_serpapi_key():
    key = os.getenv("SERPAPI_KEY")
    if not key or key == "your_serpapi_key_here":
        return None
    return key

def fetch_real_image(query: str) -> str:
    if query in IMAGE_CACHE:
        return IMAGE_CACHE[query]
        
    api_key = get_serpapi_key()
    if not api_key:
        # Fallback to deterministic picsum if no API key
        hash_val = sum(ord(c) for c in query)
        return f"https://picsum.photos/seed/{hash_val}/800/600"
        
    try:
        params = {
            "engine": "google_images",
            "q": query + " tourist attraction",
            "api_key": api_key,
            "num": 1
        }
        res = requests.get("https://serpapi.com/search", params=params, timeout=5)
        res.raise_for_status()
        data = res.json()
        
        images_results = data.get("images_results", [])
        if images_results:
            image_url = images_results[0].get("original")
            IMAGE_CACHE[query] = image_url
            return image_url
            
    except Exception as e:
        print(f"Error fetching image from SerpApi for {query}: {e}")
        
    # Fallback
    hash_val = sum(ord(c) for c in query)
    return f"https://picsum.photos/seed/{hash_val}/800/600"
