import json
import xml.etree.ElementTree as ET
from io import BytesIO
from pathlib import Path
from typing import Any, Dict

import matplotlib.pyplot as plt
from matplotlib.figure import Figure


def configure_svg_defaults() -> None:
    plt.rcParams["svg.fonttype"] = "none"
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.size"] = 11


def save_svg(fig: Figure, path: Path) -> None:
    configure_svg_defaults()
    fig.savefig(path, format="svg", dpi=300, bbox_inches="tight")


def save_svg_to_string(fig: Figure) -> str:
    configure_svg_defaults()
    buffer = BytesIO()
    fig.savefig(buffer, format="svg", dpi=300, bbox_inches="tight")
    buffer.seek(0)
    return buffer.read().decode("utf-8")


def embed_svg_metadata(svg_string: str, metadata: Dict[str, Any]) -> str:
    metadata_json = json.dumps(metadata, ensure_ascii=False)

    root = ET.fromstring(svg_string)

    ns = {"svg": "http://www.w3.org/2000/svg"}
    ET.register_namespace("", ns["svg"])

    metadata_elem = root.find("svg:metadata", ns)
    if metadata_elem is None:
        metadata_elem = ET.Element("{http://www.w3.org/2000/svg}metadata")
        root.insert(0, metadata_elem)

    metadata_elem.clear()
    metadata_text = ET.SubElement(metadata_elem, "data")
    metadata_text.text = metadata_json

    return ET.tostring(root, encoding="unicode", method="xml")
