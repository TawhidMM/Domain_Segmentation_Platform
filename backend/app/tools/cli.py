import argparse
import json
import logging
import sys

from app.tools.tool_registry import get_registry


def _configure_logging() -> None:
    logging.basicConfig(stream=sys.stderr, level=logging.WARNING)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Inspect declarative tool packages")
    subparsers = parser.add_subparsers(dest="command", required=True)

    images = subparsers.add_parser("list-images")
    images.add_argument("--format", choices=("lines", "space", "json"), default="lines")
    subparsers.add_parser("list")
    subparsers.add_parser("validate")
    return parser


def _warn_on_image_refs(images: list[str]) -> None:
    for image in images:
        last_component = image.rsplit("/", 1)[-1]
        if last_component.endswith(":latest"):
            print(f"warning: image uses :latest: {image}", file=sys.stderr)
        elif ":" not in last_component and "@" not in last_component:
            print(f"warning: image has no tag or digest: {image}", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    _configure_logging()
    args = _build_parser().parse_args(argv)
    registry = get_registry()

    if args.command == "validate":
        errors = registry.validation_errors()
        for package, reason in sorted(errors.items()):
            print(f"{package}: {reason}", file=sys.stderr)
        for tool in registry.list():
            _warn_on_image_refs([tool.spec.image])
        return 1 if errors else 0

    if args.command == "list-images":
        images = registry.images()
        if not images:
            print("No valid tool images found.", file=sys.stderr)
            return 1
        if args.format == "json":
            print(json.dumps(images))
        elif args.format == "space":
            print(" ".join(images))
        else:
            print("\n".join(images))
        return 0

    if args.command == "list":
        print(f"{'ID':<15} {'NAME':<20} {'VERSION':<12} IMAGE")
        for tool in registry.list():
            print(
                f"{tool.spec.id:<15} {tool.spec.name:<20} "
                f"{tool.spec.version:<12} {tool.spec.image}"
            )
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
