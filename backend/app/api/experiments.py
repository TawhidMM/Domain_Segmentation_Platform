from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.experiment_service import create_experiment
import json

from app.services.tool_executor import run_tool
from app.utils.workspace import get_workspace

router = APIRouter()

@router.post("/submit")
async def submit_experiment(
    upload_id: str = Form(...),
    tool_name: str = Form(...),
    params: str = Form(...),
    experiment_name: str = Form(None)
):
    try:
        params_dict = json.loads(params)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid params JSON")
    # [][][][][][][][][][][][][
    job_id = create_experiment(
        space_ranger_zip=upload_id,
        tool_name=tool_name,
        experiment_name=experiment_name
    )

    run_tool(job_id, tool_name, params_dict, upload_id)

    return {
        "job_id": job_id,
        "status": "submitted"
    }

@router.get("/result/{job_id}")
def get_result(job_id: str):
    path = get_workspace(job_id)["output"] / "frontend_result.json"
    if not path.exists():
        raise HTTPException(404, "Result not ready")

    return json.loads(path.read_text())

