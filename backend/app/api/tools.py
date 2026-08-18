from typing import List, Dict, Any
from fastapi import APIRouter

from app.tools.tool_registry import TOOL_REGISTRY, get_tool_manifest
from app.services.tools_service import generate_frontend_schema

router = APIRouter()


@router.get("/schemas", response_model=List[Dict[str, Any]])
async def get_all_tool_schemas():
    """
    Get all available tool schemas
    """
    tools_schemas = {}

    for tool_key, config in TOOL_REGISTRY.items():
        manifest = get_tool_manifest(tool_key)

        if manifest:
            ui_schema = generate_frontend_schema(manifest)

            ui_schema["tool_id"] = tool_key.value
            ui_schema["label"] = tool_key.value
            ui_schema["registry_key"] = tool_key.value
            
            tools_schemas[tool_key.value] = ui_schema

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
