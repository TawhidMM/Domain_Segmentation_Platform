import os
from dotenv import load_dotenv
from sqlalchemy.engine.url import URL
from pathlib import Path




load_dotenv()

def get_database_url():
    return URL.create(
        drivername="postgresql",
        username=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", 5432)),
        database=os.getenv("POSTGRES_DB")
    )



DATABASE_URL = get_database_url().render_as_string(hide_password=False)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
EXPERIMENTS_ROOT = BASE_DIR / "experiments"
UPLOAD_DIR = BASE_DIR / "uploads"

directories = [EXPERIMENTS_ROOT, UPLOAD_DIR]

for directory in directories:
    directory.mkdir(parents=True, exist_ok=True)


FRONTEND_RESULT_FILENAME = "frontend_result.json"
UPLOAD_ZIP_FILENAME = "input.zip"




