class ParameterError(Exception):
    pass


def resolve_params(user_params: dict, schema: dict) -> dict:
    resolved = {}

    user_params = user_params or {}

    for name, rules in schema.items():
        if name in user_params:
            try:
                resolved[name] = rules["type"](user_params[name])
            except Exception:
                raise ParameterError(f"Invalid type for {name}")
        else:
            if rules.get("required", False):
                raise ParameterError(f"Missing required param: {name}")
            resolved[name] = rules.get("default")

    # Ignore unknown params silently OR log them
    return resolved
