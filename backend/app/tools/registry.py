from app.tools.manifests.scribbledom import SCRIBBLEDOM_MANIFEST
from app.tools.manifests.staig import STAIG_MANIFEST
from app.tools.manifests.deepst import DEEPST_MANIFEST


TOOLS = {
    "scribbledom": {
        "type": "docker",
        "image": "tawhidmm/st_tools:scribbledom-latest",
        "manifest": SCRIBBLEDOM_MANIFEST,
        "entrypoint": ["/bin/bash", "/run_scribbledom.sh"],
        "adapter": "app.tools.adapters.scribbledom.ScribbleDomAdapter",
        "config_file": "config.json"
    },
    "staig": {
        "type": "docker",
        "image": "tawhidmm/st_tools:staig-latest",
        "manifest": STAIG_MANIFEST,
        "entrypoint": ["/bin/bash", "/run_scribbledom.sh"],
        "adapter": "app.tools.adapters.staig.StaigAdapter",
        "config_file": "config.yml"
    },
    "deepst": {
        "type": "docker",
        "image": "tawhidmm/st_tools:deepst-latest",
        "manifest": DEEPST_MANIFEST,
        "adapter": "app.tools.adapters.deepst.DeepStAdapter",
        "config_file": "config.json"
    }
}
