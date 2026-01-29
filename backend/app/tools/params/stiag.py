STAIG_PARAMS = {
    "profile": {
        "type": str,
        "required": True
    },

    "num_clusters": {"type": int, "required": False},
    "k": {"type": int, "required": False},
    "num_epochs": {"type": int, "required": False},
    "tau": {"type": float, "required": False},
    "tau_decay": {"type": float, "required": False},
    "num_hidden": {"type": int, "required": False},
    "num_proj_hidden": {"type": int, "required": False},
    "num_layers": {"type": int, "required": False},
    "num_gene": {"type": int, "required": False},
    "num_neigh": {"type": int, "required": False},
    "num_im_neigh": {"type": int, "required": False},
    "learning_rate": {"type": float, "required": False},
    "weight_decay": {"type": float, "required": False},
    "seed": {"type": int, "required": False},
    "activation": {"type": str, "required": False}
}
