from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.tools.schema.scribbledom import SCRIBBLEDOM_UI_SCHEMA
from app.tools.schema.staig import STAIG_UI_SCHEMA

router = APIRouter()

# Tool registry - add more tools here as they become available
TOOL_SCHEMAS = {
    "ScribbleDom": SCRIBBLEDOM_UI_SCHEMA,
    "Staig": STAIG_UI_SCHEMA
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
