TOOLS = {
    "scribbledom": {
        "type": "docker",
        "image": "scribbledom:latest",
        "entrypoint": ["/bin/bash", "/run_scribbledom.sh"],
        "adapter": "app.tools.adapters.scribbledom.ScribbleDomAdapter"
    }
}
