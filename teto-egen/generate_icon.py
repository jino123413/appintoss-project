"""
Generate teto-egen app icon variants with ComfyUI + Flux Schnell GGUF.

Concept: dual-axis circular symbol (Teto vs Egen) with minimal geometry.
Palette A (selected):
  - primary: #007779
  - accent:  #0B3A5C
  - cream:   #FDF4DE

Outputs:
  - app-logos/teto-egen-comfy-a.png
  - app-logos/teto-egen-comfy-b.png
  - app-logos/teto-egen-comfy-c.png
  - app-logos/teto-egen.png (selected final)
"""

import json
import os
import shutil
import time
import urllib.request
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"
PROJECT_ROOT = Path(r"C:\Users\USER-PC\Desktop\appintoss-project")
OUTPUT_DIR = PROJECT_ROOT / "app-logos"
COMFYUI_OUTPUT = Path(
    r"C:\Users\USER-PC\Downloads\ComfyUI_windows_portable_nvidia"
    r"\ComfyUI_windows_portable\ComfyUI\output"
)

SELECTED_VARIANT = "a"

PALETTE = {
    "primary": "007779",
    "accent": "0B3A5C",
    "cream": "FDF4DE",
}

ICON_VARIANTS = [
    {
        "key": "a",
        "seed": 260201,
        "clip_l": (
            "app icon, dual-axis circular symbol, left teal arc and right navy arc, "
            "small center pivot, solid cream background, minimal flat vector, centered, no text"
        ),
        "t5xxl": (
            "a premium mobile app icon for personality axis test, "
            "solid cream background hex FDF4DE, "
            "centered circular symbol split into two balanced arc segments, "
            "left segment in deep teal hex 007779 and right segment in navy hex 0B3A5C, "
            "small central pivot dot and one subtle orbit marker, "
            "clean geometric flat vector style, high contrast, no letters no words no numbers"
        ),
    },
    {
        "key": "b",
        "seed": 260202,
        "clip_l": (
            "app icon, balanced ring with two opposite sectors teal and navy, "
            "cream background, minimal geometric logo, centered, no text"
        ),
        "t5xxl": (
            "a clean app icon on solid cream background hex FDF4DE, "
            "a ring shape with two opposite sectors representing two tendencies, "
            "teal sector hex 007779 and navy sector hex 0B3A5C, "
            "tiny neutral divider lines, perfect center alignment, "
            "minimal vector branding style, no typography, no gradient background"
        ),
    },
    {
        "key": "c",
        "seed": 260203,
        "clip_l": (
            "app icon, circular compass-like dual axis, teal and navy halves, "
            "single pointer mark, cream background, flat minimal logo, no text"
        ),
        "t5xxl": (
            "a modern app icon with solid cream background hex FDF4DE, "
            "center motif is a circular dual-axis emblem with two balanced halves, "
            "left half in teal hex 007779 and right half in navy hex 0B3A5C, "
            "one short pointer notch indicating daily tendency shift, "
            "simple geometric vector artwork, premium and readable at small size, "
            "no text no letters"
        ),
    },
]


def build_workflow(prompt_data):
    return {
        "prompt": {
            "1": {
                "class_type": "UnetLoaderGGUF",
                "inputs": {"unet_name": "flux1-schnell-Q4_K_S.gguf"},
            },
            "2": {
                "class_type": "DualCLIPLoaderGGUF",
                "inputs": {
                    "clip_name1": "clip_l.safetensors",
                    "clip_name2": "t5-v1_1-xxl-encoder-Q4_K_M.gguf",
                    "type": "flux",
                },
            },
            "3": {
                "class_type": "CLIPTextEncodeFlux",
                "inputs": {
                    "clip": ["2", 0],
                    "clip_l": prompt_data["clip_l"],
                    "t5xxl": prompt_data["t5xxl"],
                    "guidance": 3.5,
                },
            },
            "4": {
                "class_type": "CLIPTextEncodeFlux",
                "inputs": {
                    "clip": ["2", 0],
                    "clip_l": "",
                    "t5xxl": "",
                    "guidance": 3.5,
                },
            },
            "5": {
                "class_type": "EmptySD3LatentImage",
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": 1,
                },
            },
            "6": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "seed": prompt_data["seed"],
                    "steps": 4,
                    "cfg": 1.0,
                    "sampler_name": "euler",
                    "scheduler": "simple",
                    "positive": ["3", 0],
                    "negative": ["4", 0],
                    "latent_image": ["5", 0],
                    "denoise": 1.0,
                },
            },
            "7": {
                "class_type": "VAELoader",
                "inputs": {"vae_name": "ae.safetensors"},
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["6", 0], "vae": ["7", 0]},
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["8", 0],
                    "filename_prefix": f"teto_egen_icon_{prompt_data['key']}",
                },
            },
        }
    }


def queue_prompt(workflow):
    data = json.dumps(workflow).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req).read())["prompt_id"]


def wait_for_completion(prompt_id, timeout=300):
    started = time.time()
    while time.time() - started < timeout:
        try:
            resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}")
            history = json.loads(resp.read())
            if prompt_id in history:
                status = history[prompt_id].get("status", {})
                if status.get("completed", False) or status.get("status_str") == "success":
                    return history[prompt_id]
                if status.get("status_str") == "error":
                    return None
        except Exception:
            pass
        time.sleep(2)
    return None


def find_output_filename(history):
    for _node_id, out in history.get("outputs", {}).items():
        images = out.get("images", [])
        if images:
            return images[0].get("filename", "")
    return ""


def resolve_output_path(filename):
    direct = COMFYUI_OUTPUT / filename
    if direct.exists():
        return direct

    try:
        for child in COMFYUI_OUTPUT.iterdir():
            candidate = child / filename
            if child.is_dir() and candidate.exists():
                return candidate
    except Exception:
        pass

    return direct


def resize_or_copy(src, dst, width=600, height=600):
    try:
        from PIL import Image

        image = Image.open(src)
        image = image.resize((width, height), Image.LANCZOS)
        image.save(dst, "PNG", optimize=True)
    except Exception:
        shutil.copy2(src, dst)


def ensure_comfyui_running():
    urllib.request.urlopen(f"{COMFYUI_URL}/system_stats", timeout=5).read()


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=== teto-egen icon generation ===")
    print(f"palette primary=#{PALETTE['primary']} accent=#{PALETTE['accent']} cream=#{PALETTE['cream']}")
    print("checking ComfyUI...")
    ensure_comfyui_running()
    print("ComfyUI ready")

    generated = {}
    for variant in ICON_VARIANTS:
        print(f"\n[{variant['key']}] seed={variant['seed']}")
        prompt_id = queue_prompt(build_workflow(variant))
        history = wait_for_completion(prompt_id)
        if not history:
            print("  failed")
            continue

        filename = find_output_filename(history)
        if not filename:
            print("  no output")
            continue

        src = resolve_output_path(filename)
        if not src.exists():
            print(f"  missing file: {src}")
            continue

        dst = OUTPUT_DIR / f"teto-egen-comfy-{variant['key']}.png"
        resize_or_copy(str(src), str(dst), 600, 600)
        generated[variant["key"]] = dst
        print(f"  saved: {dst.name}")

    selected = generated.get(SELECTED_VARIANT)
    if not selected:
        print(f"\nselected variant '{SELECTED_VARIANT}' was not generated")
        return

    final_path = OUTPUT_DIR / "teto-egen.png"
    shutil.copy2(selected, final_path)
    print(f"\nfinal: {selected.name} -> {final_path.name}")


if __name__ == "__main__":
    main()
