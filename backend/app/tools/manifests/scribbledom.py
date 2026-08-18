SCRIBBLEDOM_MANIFEST = {
    "description": "Weakly supervised spatial domain detection",
    "requirements": {
            "manual_annotation": {
                "is_required": True,
                "depends_on": {
                    "schema": ["expert"]
                },
            }
        },
    "parameters": {
        "technology": {
            "type": "enum",
            "label": "Technology",
            "options": ["visium", "st"],
            "default": "visium",
            "ui_group": "basic",
        },
        "schema": {
            "type": "enum",
            "label": "Annotation schema",
            "options": ["expert", "mclust"],
            "default": "expert",
            "ui_group": "basic",
        },
        "n_pcs": {
            "type": "int",
            "label": "Number of PCs",
            "default": 15,
            "min": 5,
            "max": 50,
            "ui_group": "basic",
        },
        "n_cluster_for_auto_scribble": {
            "type": "int",
            "label": "Clusters for auto scribble",
            "default": 7,
            "min": 2,
            "max": 10,
            "ui_group": "basic",
        },
        "max_iter": {
            "type": "int",
            "label": "Maximum iterations",
            "default": 300,
            "ui_group": "basic",
        },
        "nConv": {
            "type": "int",
            "label": "Number of GCN layers",
            "default": 1,
            "ui_group": "advanced",
        },
        "alpha_options": {
            "type": "float_range",
            "label": "Alpha range",
            "default": {
                "min": 0.05,
                "max": 0.95,
                "step": 0.05,
            },
            "ui": {
                "min": 0.05,
                "max": 0.95,
                "step": 0.05,
            },
            "ui_group": "advanced",
        },
        "beta_options": {
            "type": "float_range",
            "label": "Beta range",
            "default": {
                "min": 0.25,
                "max": 0.4,
                "step": 0.05,
            },
            "ui": {
                "min": 0.25,
                "max": 0.4,
                "step": 0.05,
            },
            "depends_on": {
                "schema": ["mclust"],
            },
            "ui_group": "advanced",
        },
        # "seed_options": {
        #     "type": "int_list",
        #     "label": "Random seeds",
        #     "default": [4],
        #     "ui_group": "advanced",
        # },
        "lr_options": {
            "type": "float_list",
            "label": "Learning rates",
            "default": [0.1],
            "ui_group": "advanced",
        },
    },
    "profiles": {
        "default": {
            "overrides": {},
            "internal_params": {
                "preprocessed_data_folder": "processed_data",
                "matrix_represenation_of_ST_data_folder": "matrix_representation",
                "model_output_folder": "model_outputs",
                "final_output_folder": "final_outputs",
                "dataset": "dataset_001",
                "samples": ["sample_001"],
                "space_ranger_output_directory": "space_ranger_directory",
            },
        },
    },
}