from typing import List, Dict, Any

from fastapi import APIRouter, HTTPException

from app.services.tools_service import generate_frontend_schema
from app.tools.manifests.scribbledom import SCRIBBLEDOM_MANIFEST
from app.tools.manifests.staig import STAIG_PARAMS

router = APIRouter()

STAIG_UI_SCHEMA = generate_frontend_schema(STAIG_PARAMS)
SCRIBBLEDOM_UI_SCHEMA = generate_frontend_schema(SCRIBBLEDOM_MANIFEST)

# Tool registry - add more tools here as they become available
TOOL_SCHEMAS = {
    SCRIBBLEDOM_UI_SCHEMA["tool_id"]: SCRIBBLEDOM_UI_SCHEMA,
    STAIG_UI_SCHEMA["tool_id"]: STAIG_UI_SCHEMA,
}


@router.get("/schemas", response_model=List[Dict[str, Any]])
async def get_all_tool_schemas():
    """
    Get all available tool schemas
    """
    return list(TOOL_SCHEMAS.values())


@router.get("/schemas/{tool_id}", response_model=Dict[str, Any])
async def get_tool_schema(tool_id: str):
    """
    Get schema for a specific tool
    """
    if tool_id not in TOOL_SCHEMAS:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    return TOOL_SCHEMAS[tool_id]
