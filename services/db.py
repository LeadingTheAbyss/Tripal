import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL is not set in environment")
    
    # Remove channel_binding from URL to avoid psycopg2 errors on some platforms
    if "channel_binding=require" in db_url:
        db_url = db_url.replace("&channel_binding=require", "")
        db_url = db_url.replace("?channel_binding=require", "")
        
    return psycopg2.connect(db_url)
