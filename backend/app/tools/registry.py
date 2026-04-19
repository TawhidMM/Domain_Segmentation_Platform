TOOLS = {
    "scribbledom": {
        "type": "docker",
        "image": "scribbledom:latest",
        "entrypoint": ["/bin/bash", "/run_scribbledom.sh"],
        "adapter": "app.tools.adapters.scribbledom.ScribbleDomAdapter",
        "config_file": "config.json"
    },
    "staig": {
        "type": "docker",
        "image": "staig:latest",
        "entrypoint": ["/bin/bash", "/run_scribbledom.sh"],
        "adapter": "app.tools.adapters.staig.StaigAdapter",
        "config_file": "config.yml"
    },
    "deepst": {
        "type": "docker",
        "image": "deepst:latest",
        "adapter": "app.tools.adapters.deepst.DeepStAdapter",
        "config_file": "config.json"
    }
}
