import urllib.request
from PIL import Image
import io

url = "https://assets.codepen.io/557388/background-reduced.jpg"
req = urllib.request.urlopen(url)
img = Image.open(io.BytesIO(req.read()))
r, g, b = img.getpixel((0, 0))
print(f"#{r:02x}{g:02x}{b:02x}")
