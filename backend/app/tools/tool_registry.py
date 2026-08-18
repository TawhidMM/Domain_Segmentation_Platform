from importlib import import_module

from app.schemas.tool import ToolRegistryKey, ToolManifest, ToolConfig



TOOL_REGISTRY: dict[ToolRegistryKey, ToolConfig] = {

    ToolRegistryKey.SCRIBBLEDOM: ToolConfig(
        image="tawhidmm/st_tools:scribbledom-latest",
        config_file="config.json",
        manifest_module="app.tools.manifests.scribbledom",
        manifest_attr="SCRIBBLEDOM_MANIFEST"
    ),
    ToolRegistryKey.STAIG: ToolConfig(
        image="tawhidmm/st_tools:staig-latest",
        config_file="config.yml",
        manifest_module="app.tools.manifests.staig",
        manifest_attr="STAIG_MANIFEST"
    ),
    ToolRegistryKey.DEEPST: ToolConfig(
        image="tawhidmm/st_tools:deepst-latest",
        config_file="config.json",
        manifest_module="app.tools.manifests.deepst",
        manifest_attr="DEEPST_MANIFEST"
    )
}


def get_tool_manifest(
    tool_key: ToolRegistryKey
) -> ToolManifest:

    config = TOOL_REGISTRY[tool_key]
    module = import_module(config["manifest_module"])

    return getattr(module, config["manifest_attr"])