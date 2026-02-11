from copy import deepcopy
from typing import Dict, Any


def generate_frontend_schema(tool_definition: dict) -> dict:
    frontend_schema = {
        "tool_id": tool_definition.get("tool_id"),
        "label": tool_definition.get("label"),
        "description": tool_definition.get("description"),
        "parameters": tool_definition.get("parameters", {}),
        "profiles": {}
    }

    for profile_name, profile_data in tool_definition.get("profiles", {}).items():
        frontend_schema["profiles"][profile_name] = {
            "overrides": profile_data.get("overrides", {})
        }

    return frontend_schema


def resolve_config(
    manifest: Dict[str, Any],
    user_input: Dict[str, Any]
) -> Dict[str, Any]:

    config = {}

    config = apply_global_defaults(manifest, config)
    config = apply_profile_overrides(manifest, user_input, config)
    config = apply_user_overrides(manifest, user_input, config)
    config = normalize_param_values(manifest, config)

    return config


def apply_global_defaults(
    manifest: Dict[str, Any],
    config: Dict[str, Any]
) -> Dict[str, Any]:

    for param_name, meta in manifest.get("parameters", {}).items():
        if "default" in meta:
            config[param_name] = deepcopy(meta["default"])

    return config


from copy import deepcopy


def apply_profile_overrides(
        manifest: Dict[str, Any],
        user_input: Dict[str, Any],
        config: Dict[str, Any]
) -> Dict[str, Any]:

    profile = user_input.get("profile") or config.get("profile") or "default"

    profiles_dict = manifest.get("profiles", {})
    if not profiles_dict:
        return config

    profile_data = profiles_dict.get(profile)
    if not profile_data:
        return config

    if "overrides" in profile_data:
        config.update(deepcopy(profile_data["overrides"]))

    if "internal_params" in profile_data:
        config.update(deepcopy(profile_data["internal_params"]))

    return config


def apply_user_overrides(
    manifest: Dict[str, Any],
    user_input: Dict[str, Any],
    config: Dict[str, Any]
) -> Dict[str, Any]:

    allowed_params = manifest.get("parameters", {}).keys()

    for key, value in user_input.items():
        if key in allowed_params:
            config[key] = value

    return config


def normalize_param_values(
    manifest: Dict[str, Any],
    config: Dict[str, Any]
) -> Dict[str, Any]:

    for key, value in list(config.items()):
        meta = manifest.get("parameters", {}).get(key, {})

        if meta.get("type") == "float_range" and isinstance(value, dict):
            config[key] = _expand_range(value)

    return config


def _expand_range(range_obj: dict) -> list[float]:
    start = float(range_obj["min"])
    end   = float(range_obj["max"])
    step  = float(range_obj["step"])

    values = []
    current = start

    while current <= end + 1e-10:
        values.append(round(current, 3))
        current += step

    return values