from app.core.config import settings


def create_directories():
    settings.EXPERIMENTS_ROOT.mkdir(parents=True, exist_ok=True)
    settings.UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
