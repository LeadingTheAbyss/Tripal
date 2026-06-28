import os
import requests
import threading
import concurrent.futures
import base64
import re

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

IMAGE_CACHE = {}

# Allow max 2 simultaneous Wikipedia requests to prevent rate limiting (429 Too Many Requests)
WIKI_SEMAPHORE = threading.Semaphore(2)

def fetch_real_image(query: str) -> str:
    """
    Fetch a real photo of a tourist attraction using a combined strategy.
    Tries both Unsplash and Wikimedia concurrently, and uses a Vision LLM
    to determine the best matching image if both are found.
    """
    import time
    import random
    from services.unsplash_api import fetch_unsplash_image

    if query in IMAGE_CACHE:
        return IMAGE_CACHE[query]

    headers = {"User-Agent": "TripEasy/1.0 (https://github.com/LeadingTheAbyss/Tripal; admin@tripeasy.com)"}

    # Helper function to make rate-limited Wikipedia/Wikimedia requests
    def _wiki_get(url, params):
        with WIKI_SEMAPHORE:
            for attempt in range(3):
                res = requests.get(url, params=params, headers=headers, timeout=5)
                if res.status_code == 429:
                    time.sleep(random.uniform(0.5, 1.5) * (2 ** attempt))
                    continue
                res.raise_for_status()
                return res.json()
        return {}

    def _try_wikipedia_pageimages(q: str):
        params = {
            "action": "query", "prop": "pageimages", "generator": "search",
            "gsrsearch": q, "format": "json", "pithumbsize": 800, "gsrlimit": 1
        }
        try:
            data = _wiki_get("https://en.wikipedia.org/w/api.php", params)
            pages = data.get("query", {}).get("pages", {})
            if pages:
                page = list(pages.values())[0]
                if "thumbnail" in page:
                    return page["thumbnail"]["source"]
        except Exception as e:
            print(f"[ImageService] Wikipedia Strategy failed for '{q}': {e}")
        return None

    def _try_commons_search(q: str):
        params = {
            "action": "query", "list": "search", "srsearch": q,
            "srnamespace": 6, "srlimit": 5, "format": "json"
        }
        try:
            data = _wiki_get("https://commons.wikimedia.org/w/api.php", params)
            hits = data.get("query", {}).get("search", [])
            
            exclusions = ["map", "logo", "flag", "portrait", "graph", "chart", "diagram"]
            
            for h in hits:
                title = h.get("title", "")
                title_lower = title.lower()
                if title_lower.endswith(('.jpg', '.jpeg', '.png')) and not any(excl in title_lower for excl in exclusions):
                    info_params = {
                        "action": "query", "titles": title,
                        "prop": "imageinfo", "iiprop": "url", "format": "json"
                    }
                    info_data = _wiki_get("https://commons.wikimedia.org/w/api.php", info_params)
                    for p in info_data.get("query", {}).get("pages", {}).values():
                        if "imageinfo" in p:
                            return p["imageinfo"][0].get("url")
        except Exception as e:
            print(f"[ImageService] Commons Strategy failed for '{q}': {e}")
        return None

    # Simplify query: Remove the last word (usually the city name added by the frontend)
    parts = query.split()
    simplified_query = " ".join(parts[:-1]) if len(parts) > 1 else query
    
    def get_unsplash():
        # Try full query first, fallback to simple
        url = fetch_unsplash_image(query)
        if not url:
            url = fetch_unsplash_image(simplified_query)
        return url
        
    def get_wiki():
        # 4-Strategy Pipeline for Wiki
        strategies = [
            (query, _try_commons_search),
            (simplified_query, _try_commons_search),
            (query, _try_wikipedia_pageimages),
            (simplified_query, _try_wikipedia_pageimages)
        ]
        for q, strategy in strategies:
            url = strategy(q)
            if url:
                return url
        return None

    # Fetch concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f_unsplash = executor.submit(get_unsplash)
        f_wiki = executor.submit(get_wiki)
        unsplash_url = f_unsplash.result()
        wiki_url = f_wiki.result()

    if not unsplash_url and not wiki_url:
        return None

    if unsplash_url and not wiki_url:
        IMAGE_CACHE[query] = unsplash_url
        return unsplash_url

    if wiki_url and not unsplash_url:
        IMAGE_CACHE[query] = wiki_url
        return wiki_url

    # Both found: Use VLM to evaluate the best one
    best_url = evaluate_images_with_vlm(query, unsplash_url, wiki_url)
    IMAGE_CACHE[query] = best_url
    return best_url

def evaluate_images_with_vlm(query: str, unsplash_url: str, wiki_url: str) -> str:
    """
    Downloads both images and uses a Vision LLM to rate their relevance to the query.
    Returns the URL of the highest rated image.
    """
    def _get_vlm_score(url, source_name):
        import tempfile
        try:
            # Download image to a temporary file on disk
            res = requests.get(url, stream=True, timeout=5)
            res.raise_for_status()
            
            b64_img = ""
            # NamedTemporaryFile automatically deletes the file from disk when closed
            with tempfile.NamedTemporaryFile(delete=True) as temp_img:
                # Stream the download to disk in chunks to save RAM
                for chunk in res.iter_content(chunk_size=8192):
                    temp_img.write(chunk)
                
                # Seek to the beginning of the file so we can read it
                temp_img.seek(0)
                # Read from disk and encode to base64
                b64_img = base64.b64encode(temp_img.read()).decode('utf-8')
            
            # Use gemma4:12b for vision, with OpenAI format
            payload = {
                "model": "gemma4:12b",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Rate how well this image represents the tourist attraction '{query}'. Is it a good photo? Provide ONLY a single integer score from 1 to 10."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                        ]
                    }
                ]
            }
            
            api_res = requests.post("http://localhost:11434/v1/chat/completions", json=payload, timeout=15)
            api_res.raise_for_status()
            
            text = api_res.json()["choices"][0]["message"]["content"].strip()
            
            # Extract number
            match = re.search(r'\d+', text)
            if match:
                score = int(match.group(0))
                print(f"[ImageService] {source_name} VLM Score for '{query}': {score}")
                return score
            return 0
        except Exception as e:
            print(f"[ImageService] VLM evaluation failed for {source_name}: {e}")
            # Fallback scores if VLM fails (Wikimedia is usually more accurate for specific queries)
            return 8 if source_name == 'Wiki' else 7

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(_get_vlm_score, unsplash_url, 'Unsplash')
        f2 = executor.submit(_get_vlm_score, wiki_url, 'Wiki')
        score_unsplash = f1.result()
        score_wiki = f2.result()

    if score_unsplash > score_wiki:
        print(f"[ImageService] VLM picked Unsplash for '{query}'")
        return unsplash_url
    else:
        print(f"[ImageService] VLM picked Wiki for '{query}'")
        return wiki_url


