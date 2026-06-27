import requests

url = "http://localhost:3001/trains/getTrainOn"
querystring = {
    "from": "NDLS",
    "to": "LKO",
    "date": "07-07-2026"
}

try:
    response = requests.get(url, params=querystring, timeout=15)
    with open("test_api.log", "w") as f:
        f.write(f"Status: {response.status_code}\n")
        f.write(f"Response: {response.text}\n")
except Exception as e:
    with open("test_api.log", "w") as f:
        f.write(f"Error: {e}\n")
