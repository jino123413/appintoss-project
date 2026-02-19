from __future__ import annotations

import json
import shutil
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
APP_DIR = ROOT / "pyeonhye"
LOGO_DIR = APP_DIR / "assets" / "logo"
SUBMISSION_DIR = APP_DIR / "submission"
UX_CAPTURES = APP_DIR / "docs" / "ux-captures"
APP_LOGOS_DIR = ROOT / "app-logos"

COMFY_BASE = "http://127.0.0.1:8188"
COMFY_INPUT = ROOT / ".tools" / "ComfyUI" / "input"
COMFY_OUTPUT = ROOT / ".tools" / "ComfyUI" / "output"
MODEL_NAME = "v1-5-pruned-emaonly.safetensors"

FONT_REGULAR = Path("C:/Windows/Fonts/malgun.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/malgunbd.ttf")


def http_json(method: str, url: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None
    headers: dict[str, str] = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(url=url, data=data, method=method, headers=headers)
    with urlopen(req, timeout=120) as res:
        return json.loads(res.read().decode("utf-8"))


def assert_comfy_ready() -> None:
    try:
        http_json("GET", f"{COMFY_BASE}/system_stats")
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            f"ComfyUI is not reachable at {COMFY_BASE}. Start ComfyUI first."
        ) from exc


def create_base_icon_template() -> Path:
    COMFY_INPUT.mkdir(parents=True, exist_ok=True)
    template = COMFY_INPUT / "pyeonhye_base.png"

    img = Image.new("RGB", (1024, 1024), "#0EA5A4")
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((290, 220, 734, 804), radius=90, fill="white")
    draw.polygon([(610, 220), (734, 220), (734, 344)], fill="#0EA5A4")
    draw.ellipse((355, 315, 445, 405), fill="#0EA5A4")
    draw.rounded_rectangle((430, 500, 594, 560), radius=28, fill="#0EA5A4")
    draw.rounded_rectangle((482, 448, 542, 612), radius=28, fill="#0EA5A4")
    img.save(template)
    return template


def generate_logo_with_comfy(template_name: str, seed: int = 16538005) -> Path:
    client_id = str(uuid.uuid4())
    workflow = {
        "1": {
            "class_type": "LoadImage",
            "inputs": {"image": template_name, "upload": "image"},
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": MODEL_NAME},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": (
                    "minimal flat app icon, clean geometric edges, white price tag with plus sign "
                    "on solid teal background, icon only, no text"
                ),
                "clip": ["4", 1],
            },
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "letters, words, watermark, photo, realistic scene, mockup, 3d render",
                "clip": ["4", 1],
            },
        },
        "10": {
            "class_type": "VAEEncode",
            "inputs": {"pixels": ["1", 0], "vae": ["4", 2]},
        },
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 20,
                "cfg": 6,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 0.08,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["10", 0],
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "pyeonhye/comfy_logo_img2img",
                "images": ["8", 0],
            },
        },
    }

    queued = http_json("POST", f"{COMFY_BASE}/prompt", {"prompt": workflow, "client_id": client_id})
    prompt_id = queued["prompt_id"]

    deadline = time.time() + 600
    while time.time() < deadline:
        history = http_json("GET", f"{COMFY_BASE}/history/{prompt_id}")
        if prompt_id in history:
            outputs = history[prompt_id].get("outputs", {})
            for node in outputs.values():
                images = node.get("images")
                if not images:
                    continue
                image = images[0]
                subfolder = image.get("subfolder", "")
                filename = image["filename"]
                output_path = COMFY_OUTPUT / subfolder / filename
                if output_path.exists():
                    return output_path
        time.sleep(1.2)

    raise RuntimeError("Timed out waiting for ComfyUI logo output")


def fit_cover(image: Image.Image, width: int, height: int) -> Image.Image:
    src = image.copy().convert("RGB")
    ratio = max(width / src.width, height / src.height)
    nw = int(src.width * ratio)
    nh = int(src.height * ratio)
    src = src.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - width) // 2
    top = (nh - height) // 2
    return src.crop((left, top, left + width, top + height))


def gradient_canvas(width: int, height: int) -> Image.Image:
    top = (12, 168, 164)
    bottom = (11, 87, 117)
    img = Image.new("RGB", (width, height), top)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def draw_phone(canvas: Image.Image, screenshot: Image.Image, x: int, y: int, w: int, h: int, radius: int = 40) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=(21, 30, 45))
    margin = max(10, int(w * 0.04))
    sx, sy = x + margin, y + margin
    sw, sh = w - margin * 2, h - margin * 2
    content = fit_cover(screenshot, sw, sh)
    canvas.paste(content, (sx, sy))


def draw_title_block(
    canvas: Image.Image,
    title: str,
    subtitle: str,
    x: int,
    y: int,
    w: int,
) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.text((x, y), title, fill=(255, 255, 255), font=font(54, bold=True))
    draw.text((x, y + 72), subtitle, fill=(221, 245, 247), font=font(30, bold=False))
    draw.rounded_rectangle((x, y + 130, x + w, y + 170), radius=20, fill=(255, 255, 255, 60))


def save_logo_assets(comfy_logo: Path) -> Path:
    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    APP_LOGOS_DIR.mkdir(parents=True, exist_ok=True)

    base = Image.open(comfy_logo).convert("RGB")
    logo_600 = base.resize((600, 600), Image.Resampling.LANCZOS)
    logo_1024 = base.resize((1024, 1024), Image.Resampling.LANCZOS)

    logo_600_path = LOGO_DIR / "pyeonhye-logo-600.png"
    logo_1024_path = LOGO_DIR / "pyeonhye-logo-1024.png"
    logo_600.save(logo_600_path, format="PNG")
    logo_1024.save(logo_1024_path, format="PNG")

    shutil.copy2(logo_600_path, APP_LOGOS_DIR / "pyeonhye.png")
    return logo_600_path


def generate_submission_assets(icon_600_path: Path) -> None:
    SUBMISSION_DIR.mkdir(parents=True, exist_ok=True)

    cap_01 = Image.open(UX_CAPTURES / "01-home-list.png").convert("RGB")
    cap_02 = Image.open(UX_CAPTURES / "02-sort-price-asc.png").convert("RGB")
    cap_04 = Image.open(UX_CAPTURES / "04-compare-expanded.png").convert("RGB")
    cap_06 = Image.open(UX_CAPTURES / "06-bookmark-refresh-result.png").convert("RGB")
    icon = Image.open(icon_600_path).convert("RGBA")

    # 1) thumb-square (1000x1000)
    img = gradient_canvas(1000, 1000)
    draw = ImageDraw.Draw(img)
    draw_title_block(img, "편의점 행사 한눈에", "브랜드별 1+1/2+1/할인 빠른 탐색", 80, 92, 680)
    icon_sq = fit_cover(icon, 360, 360).convert("RGBA")
    img.paste(icon_sq, (320, 516), icon_sq)
    img.save(SUBMISSION_DIR / "thumb-square.png")

    # 2) thumb-landscape (1932x828)
    img = gradient_canvas(1932, 828)
    draw_title_block(img, "가격 비교, 바로 결정", "찾기 -> 비교 -> 저장, 필요한 흐름만", 100, 120, 840)
    draw_phone(img, cap_02, 1380, 90, 410, 650, radius=58)
    icon_l = fit_cover(icon, 130, 130).convert("RGBA")
    img.paste(icon_l, (102, 42), icon_l)
    img.save(SUBMISSION_DIR / "thumb-landscape.png")

    # 3) screenshot-1 (636x1048)
    img = gradient_canvas(636, 1048)
    draw_title_block(img, "발견", "필요한 행사상품만 빠르게", 48, 56, 360)
    draw_phone(img, cap_01, 83, 236, 470, 772, radius=56)
    img.save(SUBMISSION_DIR / "screenshot-1.png")

    # 4) screenshot-2 (636x1048)
    img = gradient_canvas(636, 1048)
    draw_title_block(img, "비교", "같은 상품, 브랜드별 가격 확인", 48, 56, 440)
    draw_phone(img, cap_04, 83, 236, 470, 772, radius=56)
    img.save(SUBMISSION_DIR / "screenshot-2.png")

    # 5) screenshot-3 (636x1048)
    img = gradient_canvas(636, 1048)
    draw_title_block(img, "재확인", "북마크 갱신 체크로 변동 확인", 48, 56, 470)
    draw_phone(img, cap_06, 83, 236, 470, 772, radius=56)
    img.save(SUBMISSION_DIR / "screenshot-3.png")

    # 6) screenshot-landscape (1504x741)
    img = gradient_canvas(1504, 741)
    draw_title_block(img, "편혜 UX 흐름", "발견 -> 비교 -> 저장 -> 재확인", 74, 52, 760)
    draw_phone(img, cap_01, 120, 210, 300, 500, radius=44)
    draw_phone(img, cap_04, 600, 180, 320, 540, radius=46)
    draw_phone(img, cap_06, 1090, 210, 300, 500, radius=44)
    img.save(SUBMISSION_DIR / "screenshot-landscape.png")


def main() -> None:
    assert_comfy_ready()
    template = create_base_icon_template()
    comfy_logo = generate_logo_with_comfy(template_name=template.name)
    icon_600 = save_logo_assets(comfy_logo)
    generate_submission_assets(icon_600)

    print(f"Comfy logo: {comfy_logo}")
    print(f"Saved logo: {LOGO_DIR / 'pyeonhye-logo-600.png'}")
    print(f"Saved logo: {LOGO_DIR / 'pyeonhye-logo-1024.png'}")
    print(f"Submission dir: {SUBMISSION_DIR}")


if __name__ == "__main__":
    main()
