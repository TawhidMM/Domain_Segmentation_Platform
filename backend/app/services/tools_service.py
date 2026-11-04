import math
from typing import Dict, Any
from copy import deepcopy

from app.schemas.tool import ToolManifest


def generate_frontend_schema(tool_definition: ToolManifest) -> dict:
    frontend_schema = {
        "description": tool_definition.get("description"),
        "requirements": tool_definition.get("requirements", {}),
        "parameters": tool_definition.get("parameters", {}),
        "profiles": {}
    }

    for profile_name, profile_data in tool_definition.get("profiles", {}).items():
        frontend_schema["profiles"][profile_name] = {
            "overrides": profile_data.get("overrides", {})
        }

    return frontend_schema


def resolve_config(
    manifest: ToolManifest,
    user_input: Dict[str, Any]
) -> Dict[str, Any]:

    config = {}

    config = apply_global_defaults(manifest, config)
    config = apply_profile_overrides(manifest, user_input, config)
    config = apply_user_overrides(manifest, user_input, config)
    validate_config(manifest, config)
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


def validate_config(
    manifest: Dict[str, Any],
    config: Dict[str, Any]
) -> None:
   
    errors: list[str] = []
    parameters = manifest.get("parameters", {})

    for param_key, meta in parameters.items():
        value = config.get(param_key)
        label = meta.get("label", param_key)
        param_type = meta.get("type")

        if value is None:
            if "default" not in meta:
                errors.append(f'Parameter "{label}" is required')
            continue

        if param_type == "int":
            if isinstance(value, bool) or not isinstance(value, int):
                errors.append(f'Parameter "{label}" must be a whole number')
            else:
                if "min" in meta and value < meta["min"]:
                    errors.append(f'Parameter "{label}" must be at least {meta["min"]}')
                if "max" in meta and value > meta["max"]:
                    errors.append(f'Parameter "{label}" must be at most {meta["max"]}')
        elif param_type == "float":
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                errors.append(f'Parameter "{label}" must be a valid number')
            else:
                fval = float(value)
                if not math.isfinite(fval):
                    errors.append(f'Parameter "{label}" must be a finite number')
                else:
                    if "min" in meta and fval < meta["min"]:
                        errors.append(f'Parameter "{label}" must be at least {meta["min"]}')
                    if "max" in meta and fval > meta["max"]:
                        errors.append(f'Parameter "{label}" must be at most {meta["max"]}')
        elif param_type == "bool":
            if not isinstance(value, bool):
                errors.append(f'Parameter "{label}" must be a boolean')
        elif param_type == "enum":
            options = meta.get("options") or []
            if value not in options:
                errors.append(f'Parameter "{label}" must be one of: {", ".join(map(str, options))}')
        elif param_type == "int_list":
            if not isinstance(value, list) or len(value) == 0:
                errors.append(f'Parameter "{label}" must contain at least one value')
            elif not all(isinstance(v, int) and not isinstance(v, bool) for v in value):
                errors.append(f'Parameter "{label}" must contain only integers')
            else:
                if "min" in meta and any(v < meta["min"] for v in value):
                    errors.append(f'Parameter "{label}" must be at least {meta["min"]}')
                if "max" in meta and any(v > meta["max"] for v in value):
                    errors.append(f'Parameter "{label}" must be at most {meta["max"]}')
        elif param_type == "float_list":
            if not isinstance(value, list) or len(value) == 0:
                errors.append(f'Parameter "{label}" must contain at least one value')
            elif not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in value):
                errors.append(f'Parameter "{label}" must contain only numbers')
            else:
                if "min" in meta and any(float(v) < meta["min"] for v in value):
                    errors.append(f'Parameter "{label}" must be at least {meta["min"]}')
                if "max" in meta and any(float(v) > meta["max"] for v in value):
                    errors.append(f'Parameter "{label}" must be at most {meta["max"]}')
        elif param_type == "float_range":
            if not isinstance(value, dict):
                errors.append(f'Parameter "{label}" must be a range with min, max, and step')
                continue
            min_v = value.get("min")
            max_v = value.get("max")
            step_v = value.get("step")
            if min_v is None or max_v is None or step_v is None:
                errors.append(f'Parameter "{label}" must have min, max, and step values')
                continue
            if not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in (min_v, max_v, step_v)):
                errors.append(f'Parameter "{label}" min, max, and step must be numbers')
                continue
            min_f, max_f, step_f = float(min_v), float(max_v), float(step_v)
            if not (math.isfinite(min_f) and math.isfinite(max_f) and math.isfinite(step_f)):
                errors.append(f'Parameter "{label}" min, max, and step must be finite numbers')
            elif min_f >= max_f:
                errors.append(f'Parameter "{label}": min must be less than max')
            elif step_f <= 0:
                errors.append(f'Parameter "{label}": step must be greater than 0')

    if errors:
        raise ValueError("; ".join(errors))


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