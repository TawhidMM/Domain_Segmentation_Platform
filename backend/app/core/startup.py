from app.core.config import settings


def create_directories():
    settings.INTERNAL_EXPERIMENTS_ROOT.mkdir(parents=True, exist_ok=True)
    settings.INTERNAL_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
