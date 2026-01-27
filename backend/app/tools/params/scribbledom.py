SCRIBBLEDOM_PARAMS = {
    "technology": {
        "type": str,
        "default": "visium",
        "required": False
    },
    "schema": {
        "type": str,
        "default": "expert",
        "required": False
    },
    "n_pcs": {
        "type": int,
        "default": 15,
        "required": False
    },
    "n_cluster_for_auto_scribble": {
        "type": int,
        "default": 2,
        "required": False
    },
    "max_iter": {
        "type": int,
        "default": 10,
        "required": False
    },
    "nConv": {
        "type": int,
        "default": 1,
        "required": False
    },
    "seed_options": {
        "type": list,
        "default": [4],
        "required": False
    },
    "alpha_options": {
        "type": list,
        "default": [
            0.05, 0.1, 0.15, 0.2, 0.25,
            0.3, 0.35, 0.4, 0.45, 0.5,
            0.55, 0.6, 0.65, 0.7, 0.75,
            0.8, 0.85, 0.9, 0.95
        ],
        "required": False
    },
    "beta_options": {
        "type": list,
        "default": [0.25, 0.3, 0.35, 0.4],
        "required": False
    },
    "lr_options": {
        "type": list,
        "default": [0.1],
        "required": False
    }
}
