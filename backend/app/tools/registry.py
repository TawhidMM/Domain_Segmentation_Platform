TOOLS = {
    # "scribbledom": {
    #     "type": "docker",
    #     "image": "tawhidmm/st_tools:scribbledom-latest",
    #     "entrypoint": ["/bin/bash", "/run_scribbledom.sh"],
    #     "adapter": "app.tools.adapters.scribbledom.ScribbleDomAdapter",
    #     "config_file": "config.json"
    # },
    "staig": {
        "type": "docker",
        "image": "tawhidmm/st_tools:staig-latest",
        "entrypoint": ["/bin/bash", "/run_scribbledom.sh"],
        "adapter": "app.tools.adapters.staig.StaigAdapter",
        "config_file": "config.yml"
    },
    "deepst": {
        "type": "docker",
        "image": "tawhidmm/st_tools:deepst-latest",
        "adapter": "app.tools.adapters.deepst.DeepStAdapter",
        "config_file": "config.json"
    }
}
