from typing import Dict, Any

from pydantic import BaseModel


class TusdHook(BaseModel):
    Type: str
    Event: Dict[str, Any]