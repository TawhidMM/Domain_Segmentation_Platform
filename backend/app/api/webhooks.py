from fastapi import APIRouter

from app.schemas.tusd import TusdHook
from app.webhooks.tus import get_handler

router = APIRouter()


@router.post("")
async def tus_webhook(hook: TusdHook):
    print(f"Received webhook: \n {hook} ")
    metadata = hook.Event.get("Upload", {}).get("MetaData", {})
    handler = get_handler(metadata.get("upload_type"))

    if hook.Type == "pre-create":
        return await handler.pre_create(hook.Event)
    elif hook.Type == "post-finish":
        return await handler.post_finish(hook.Event)
    return {"status": "ignored"}