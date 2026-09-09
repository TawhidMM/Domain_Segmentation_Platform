from app.tools.tool_registry import TOOL_REGISTRY


if __name__ == "__main__":
    images = [config["image"] for config in TOOL_REGISTRY.values()]
    print("\n".join(images))