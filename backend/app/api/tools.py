from typing import List, Dict, Any
from fastapi import APIRouter

from app.tools.tool_registry import get_registry
from app.services.tools_service import generate_frontend_schema

router = APIRouter()


@router.get("/schemas", response_model=List[Dict[str, Any]])
async def get_all_tool_schemas():
    """
    Get all available tool schemas
    """
    tools_schemas = {}

    for tool in get_registry().list():
        manifest = tool.manifest

        if manifest:
            ui_schema = generate_frontend_schema(manifest)

            ui_schema["tool_id"] = tool.spec.id
            ui_schema["label"] = tool.spec.id
            ui_schema["registry_key"] = tool.spec.id
            
            tools_schemas[tool.spec.id] = ui_schema

    return list(tools_schemas.values())

# @router.get("/schemas/{tool_id}", response_model=Dict[str, Any])
# async def get_tool_schema(tool_id: str):
#     """
#     Get schema for a specific tool
#     """
#     if tool_id not in TOOL_SCHEMAS:
#         raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")
#
#     return TOOL_SCHEMAS[tool_id]
