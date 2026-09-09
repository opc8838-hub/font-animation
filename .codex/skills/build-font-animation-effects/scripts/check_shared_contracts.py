from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
SITE = ROOT / "site"
errors = []

decoder_owners = [path.name for path in SITE.glob("*.js") if "new ImageDecoder" in path.read_text(encoding="utf-8")]
if decoder_owners != ["cellmotion-animated-image.js"]:
    errors.append(f"ImageDecoder must be owned only by cellmotion-animated-image.js: {decoder_owners}")

consumers = {
    "colorrecompose.js": ("colorrecompose.html",),
    "continuation.js": ("continuation.html",),
    "currentwall.js": ("currentwall.html",),
    "glyphmorph.js": ("glyphmorph.html",),
    "impactbuild.js": ("impactbuild.html",),
    "morphports-reviewed.js": ("typecascade.html", "glyphreveal.html", "mistlift.html", "sproutshift.html"),
    "morphports.js": ("dotresolve.html",),
    "ribbonink.js": ("ribbonink.html",),
    "split-flip.js": ("split-flip.html",),
    "verticalwall.js": ("verticalwall.html",),
}
for script, pages in consumers.items():
    source = (SITE / script).read_text(encoding="utf-8")
    if "CellMotionAnimatedImage" not in source:
        errors.append(f"{script} does not use the shared animated-image interface")
    for page in pages:
        html = (SITE / page).read_text(encoding="utf-8")
        if html.find("cellmotion-animated-image.js") < 0 or html.find("cellmotion-animated-image.js") > html.find(script):
            errors.append(f"{page} must load the shared animated-image module before {script}")

descriptor = json.loads((SITE / "effects" / "typecascade.component.json").read_text(encoding="utf-8"))
if not descriptor.get("runtime", {}).get("entry", "").startswith("typecascade.html"):
    errors.append("Type Cascade runtime.entry must resolve from the site/editor base")
typecascade = (SITE / "typecascade.html").read_text(encoding="utf-8")
for required in ("cellmotion-ai-manifest.js", "typecascade-ai.js"):
    if required not in typecascade:
        errors.append(f"typecascade.html is missing {required}")
bridge = (SITE / "morphports-reviewed.js").read_text(encoding="utf-8")
for command in ("configure", "play", "pause", "restart", "seek", "ready", "duration"):
    if f"cellmotion:{command}" not in bridge:
        errors.append(f"Type Cascade bridge is missing {command}")
runtime = (SITE / "cellmotion-animated-image.js").read_text(encoding="utf-8")
for operation in ("decode", "frameAt", "dispose", "readGifFrameDurations"):
    if operation not in runtime:
        errors.append(f"animated-image runtime is missing {operation}")

if errors:
    print("FAIL: shared contract audit")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)
print("PASS: shared GIF timing ownership and Type Cascade AI pilot seams are present.")
