import yaml

from app.core.config import UPLOAD_DIR, UPLOAD_ZIP_FILENAME
from app.tools.adapters.base import ToolAdapter
from app.tools.params.stiag import STAIG_PARAMS
from app.tools.schema.staig import STAIG_UI_SCHEMA
from app.utils.params import ParameterError
from app.utils.visium import merge_predictions_and_coords, get_color_mapped_domain
from app.utils.zip_utils import extract_zip


class StaigAdapter(ToolAdapter):

    def prepare_inputs(self, dataset_id: str):
        zip_dir = UPLOAD_DIR / f"upload_{dataset_id}" / UPLOAD_ZIP_FILENAME
        target_dir = self.workspace["input"]

        target_dir.mkdir(parents=True, exist_ok=True)

        extract_zip(zip_dir, target_dir)

    def build_config(self, user_params: dict) -> dict:
        resolved_params = self.resolve_staig_params(
            user_params=user_params,
            param_schema=STAIG_PARAMS,
            ui_schema=STAIG_UI_SCHEMA
        )

        resolved_params["base_model"] = 'GCNConv'
        resolved_params["drop_feature_rate_1"] = 0.1
        resolved_params["drop_feature_rate_2"] = 0.2

        config_path = self.workspace["config"] / "config.yml"
        with open(config_path, "w") as f:
            yaml.safe_dump(resolved_params, f, sort_keys=False)


    def build_frontend_output(self, job_id: str) -> dict:
        prediction_file = self.workspace["output"] / "predictions.csv"
        coords_file = self.workspace["input"] / "spatial" / "tissue_positions_list.csv"

        spots = merge_predictions_and_coords(prediction_file, coords_file)
        domains = get_color_mapped_domain(spots)

        return {
            "jobId": job_id,
            "spots": spots,
            "domains": domains
        }

    class ParameterError(Exception):
        pass

    def resolve_staig_params(self,
            user_params: dict,
            param_schema: dict,
            ui_schema: dict
    ) -> dict:
        if not user_params or "profile" not in user_params:
            raise ParameterError("Missing required param: profile")

        profile = user_params["profile"]
        resolved = {"profile": profile}

        ui_params = ui_schema["params"]

        for name, rules in param_schema.items():
            if name == "profile":
                continue

            # 1️⃣ user override
            if name in user_params:
                try:
                    resolved[name] = rules["type"](user_params[name])
                except Exception:
                    raise ParameterError(f"Invalid type for {name}")
                continue

            # 2️⃣ profile default from UI schema
            ui_def = ui_params.get(name, {})
            defaults_by = ui_def.get("defaults_by", {})
            profile_defaults = defaults_by.get("profile", {})

            if profile in profile_defaults:
                resolved[name] = profile_defaults[profile]
                continue

            # 3️⃣ required?
            if rules.get("required", False):
                raise ParameterError(f"Missing required param: {name}")

            # 4️⃣ optional & missing → ignore
            # (STAIG code is fine with missing keys)

        return resolved


