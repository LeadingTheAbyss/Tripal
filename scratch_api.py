import os
import requests
import json
from dotenv import load_dotenv

load_dotenv(r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\.env")
api_key = os.getenv("RAILRADAR_API_KEY")

res = requests.get("https://api.railradar.in/v1/trains/12558", headers={"Authorization": f"Bearer {api_key}"})
with open(r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\output.json", "w") as f:
    json.dump(res.json(), f, indent=2)
