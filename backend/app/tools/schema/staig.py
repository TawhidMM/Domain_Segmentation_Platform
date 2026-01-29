STAIG_UI_SCHEMA = {
    "tool_id": "STAIG",
    "label": "STAIG",
    "description": "Self-supervised spatial domain identification with graph contrastive learning",

    "params": {
        "profile": {
            "type": "enum",
            "label": "Dataset profile",
            "options": [
                "DLPFC",
                "Human_Breast_Cancer"
            ],
            "default": "DLPFC",
            "ui_group": "basic"
        },

        "num_clusters": {
            "type": "int",
            "label": "Number of clusters",
            "min": 3,
            "max": 30,
            "ui_group": "basic",
            "defaults_by": {
                "profile": {
                    "DLPFC": 7,
                    "Human_Breast_Cancer": 20
                }
            }
        },

        "k": {
            "type": "int",
            "label": "Graph neighborhood size (k)",
            "min": 5,
            "max": 150,
            "ui_group": "basic",
            "defaults_by": {
                "profile": {
                    "DLPFC": 80,
                    "Human_Breast_Cancer": 80
                }
            }
        },

        "num_epochs": {
            "type": "int",
            "label": "Training epochs",
            "min": 100,
            "max": 1000,
            "ui_group": "basic",
            "defaults_by": {
                "profile": {
                    "DLPFC": 300,
                    "Human_Breast_Cancer": 580
                }
            }
        },

        "tau": {
            "type": "float",
            "label": "Contrastive temperature (tau)",
            "min": 0.1,
            "max": 50.0,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 35,
                    "Human_Breast_Cancer": 3.0
                }
            }
        },

        "tau_decay": {
            "type": "float",
            "label": "Tau decay",
            "min": 0.0,
            "max": 1.0,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "Human_Breast_Cancer": 0.0
                }
            },
            "depends_on": {
                "profile": ["Human_Breast_Cancer"]
            }
        },

        "num_hidden": {
            "type": "int",
            "label": "Hidden dimension",
            "min": 16,
            "max": 256,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 64,
                    "Human_Breast_Cancer": 64
                }
            }
        },

        "num_proj_hidden": {
            "type": "int",
            "label": "Projection hidden dimension",
            "min": 16,
            "max": 256,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 64,
                    "Human_Breast_Cancer": 64
                }
            }
        },

        "num_layers": {
            "type": "int",
            "label": "GCN layers",
            "min": 1,
            "max": 5,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 1,
                    "Human_Breast_Cancer": 2
                }
            }
        },

        "num_gene": {
            "type": "int",
            "label": "Number of genes",
            "min": 1000,
            "max": 10000,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 3000,
                    "Human_Breast_Cancer": 3000
                }
            }
        },

        "num_neigh": {
            "type": "int",
            "label": "Spatial neighbors",
            "min": 1,
            "max": 20,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 5,
                    "Human_Breast_Cancer": 5
                }
            }
        },

        "num_im_neigh": {
            "type": "int",
            "label": "Image neighbors",
            "min": 0,
            "max": 10,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "Human_Breast_Cancer": 2
                }
            },
            "depends_on": {
                "profile": ["Human_Breast_Cancer"]
            }
        },

        "learning_rate": {
            "type": "float",
            "label": "Learning rate",
            "min": 1e-5,
            "max": 1e-2,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 0.0005,
                    "Human_Breast_Cancer": 0.0005
                }
            }
        },

        "weight_decay": {
            "type": "float",
            "label": "Weight decay",
            "min": 0.0,
            "max": 1e-3,
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 1e-5,
                    "Human_Breast_Cancer": 1e-5
                }
            }
        },

        "activation": {
            "type": "enum",
            "label": "Activation function",
            "options": ["relu", "prelu"],
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": "relu",
                    "Human_Breast_Cancer": "relu"
                }
            }
        },

        "seed": {
            "type": "int",
            "label": "Random seed",
            "ui_group": "advanced",
            "defaults_by": {
                "profile": {
                    "DLPFC": 39788,
                    "Human_Breast_Cancer": 39788
                }
            }
        }
    }
}
