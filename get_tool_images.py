from backend.app.tools.registry import TOOLS 


if __name__ == "__main__":
    # Just print the image strings separated by spaces
    # images = [info['image'] for info in TOOLS.values() if 'image' in info]
    # print("\n".join(images))

    print(TOOLS['deepst']['image'])