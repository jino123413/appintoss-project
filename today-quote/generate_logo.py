"""
Generate today-quote logo variants via ComfyUI + Flux Schnell GGUF.

Output:
- app-logos/today-quote-comfy-a.png
- app-logos/today-quote-comfy-b.png
- app-logos/today-quote-comfy-c.png
- app-logos/today-quote.png (selected variant)
"""

import json
import os
import shutil
import time
import urllib.request
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = Path(r"C:\Users\USER-PC\Desktop\appintoss-project\app-logos")
COMFYUI_OUTPUT = Path(
    r"C:\Users\USER-PC\Downloads\ComfyUI_windows_portable_nvidia"
    r"\ComfyUI_windows_portable\ComfyUI\output"
)

# Select one variant as final logo
SELECTED_VARIANT = "a"

VARIANTS = [
    {
        "key": "a",
        "label": "Sage Library",
        "seed": 260217,
        "bg_hex": "2F6B62",
        "main_hex": "FFFFFF",
        "accent_hex": "D9A441",
    },
    {
        "key": "b",
        "label": "Deep Forest",
        "seed": 260218,
        "bg_hex": "25564E",
        "main_hex": "F8F6F1",
        "accent_hex": "C89A3A",
    },
    {
        "key": "c",
        "label": "Warm Paper",
        "seed": 260219,
        "bg_hex": "3A756C",
        "main_hex": "FFFDF9",
        "accent_hex": "E2B35C",
    },
]


def prompt_from_variant(v):
    bg = v["bg_hex"]
    main = v["main_hex"]
    accent = v["accent_hex"]
    return {
        "name": f"today_quote_comfy_{v['key']}",
        "seed": v["seed"],
        "clip_l": (
            "mobile app icon, centered open book with quote mark, "
            f"solid background #{bg}, flat vector style, no text"
        ),
        "t5xxl": (
            "A minimal premium app icon for a daily quote app. "
            f"Solid background color hex {bg}. "
            f"Center has a simple open book shape in hex {main}. "
            "Inside the book, place subtle quote mark glyph. "
            f"Add a tiny spark accent in hex {accent} near the top-right. "
            "Symmetric, geometric, clean, modern, centered composition. "
            "No letters, no words, no gradients, no photo style."
        ),
    }


def build_txt2img_workflow(prompt_data):
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
                    "width": 600,
                    "height": 600,
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
                    "filename_prefix": prompt_data["name"],
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
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}")
            history = json.loads(resp.read())
            if prompt_id in history:
                status = history[prompt_id].get("status", {})
                if status.get("completed", False) or status.get("status_str") == "success":
                    return history[prompt_id]
                if status.get("status_str") == "error":
                    print(f"  ERROR: {status}")
                    return None
        except Exception:
            pass
        time.sleep(3)
    return None


def find_output_file(history):
    try:
        for _node_id, node_out in history.get("outputs", {}).items():
            if "images" in node_out:
                return node_out["images"][0].get("filename", "")
    except Exception:
        pass
    return ""


def resolve_output_path(filename):
    direct = COMFYUI_OUTPUT / filename
    if direct.exists():
        return direct
    for sub in COMFYUI_OUTPUT.iterdir():
        if sub.is_dir() and (sub / filename).exists():
            return sub / filename
    return direct


def check_comfyui_ready():
    try:
        urllib.request.urlopen(f"{COMFYUI_URL}/system_stats", timeout=3)
        return True
    except Exception:
        return False


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if not check_comfyui_ready():
        print("ComfyUI is not reachable at http://127.0.0.1:8188")
        print("Start ComfyUI first, then run this script again.")
        return

    prompts = [prompt_from_variant(v) for v in VARIANTS]
    generated = {}

    print("=" * 64)
    print("today-quote ComfyUI logo generation")
    print(f"ComfyUI endpoint: {COMFYUI_URL}")
    print("=" * 64)

    for prompt in prompts:
        print(f"\n[{prompt['name']}] seed={prompt['seed']}")
        try:
            prompt_id = queue_prompt(build_txt2img_workflow(prompt))
            print(f"  Queued: {prompt_id}")
        except Exception as error:
            print(f"  FAILED to queue: {error}")
            continue

        history = wait_for_completion(prompt_id, timeout=300)
        if not history:
            print("  Failed or timed out")
            continue

        filename = find_output_file(history)
        if not filename:
            print("  No output file found")
            continue

        src = resolve_output_path(filename)
        if not src.exists():
            print(f"  Output not found: {src}")
            continue

        key = prompt["name"].rsplit("_", 1)[-1]
        dst = OUTPUT_DIR / f"today-quote-comfy-{key}.png"
        shutil.copy2(src, dst)
        generated[key] = dst
        print(f"  Saved: {dst.name}")

    if SELECTED_VARIANT not in generated:
        print(f"\nSelected variant '{SELECTED_VARIANT}' not generated. No final copy.")
        return

    final_path = OUTPUT_DIR / "today-quote.png"
    shutil.copy2(generated[SELECTED_VARIANT], final_path)
    print("\nFinal selection copied:")
    print(f"  {generated[SELECTED_VARIANT].name} -> {final_path.name}")


if __name__ == "__main__":
    main()
