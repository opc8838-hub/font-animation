#!/usr/bin/env python3
"""Check the shared editor contract for one effect page.

Usage: python check_editor_contract.py <html> <javascript>
"""

from __future__ import annotations

import sys
from pathlib import Path


def fail(message: str) -> None:
    print(f"FAIL: {message}")


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: check_editor_contract.py <html> <javascript>")
        return 2

    html_path, js_path = map(Path, sys.argv[1:])
    if not html_path.is_file() or not js_path.is_file():
        print("FAIL: both HTML and JavaScript files must exist")
        return 2

    html = html_path.read_text(encoding="utf-8")
    js = js_path.read_text(encoding="utf-8")
    errors: list[str] = []

    text_only = 'data-editor-capabilities="text-only"' in html
    required_html = {
        "scheme Save": "保存方案",
        "scheme Import": "导入方案",
        "scheme Restore Default": "恢复默认",
        "scheme Clear/Rebuild": "清理重做",
        "colored choreography": "me-choreo-track",
        "stage playback": "me-stage-controls",
        "selected asset panel": "me-layer-panel",
        "selected asset toggle": "me-layer-toggle",
        "selected asset list": "me-layer-items",
        "asset editor drawer": "me-asset-drawer",
        "asset library": "me-asset-library",
        "selection-first card": "me-asset-choice",
        "explicit commit": "me-asset-commit",
        "single asset editor": "me-asset-editor",
    }
    if text_only:
        asset_labels = {
            "selected asset panel", "selected asset toggle", "selected asset list",
            "asset editor drawer", "asset library", "selection-first card",
            "explicit commit", "single asset editor",
        }
        required_html = {label: token for label, token in required_html.items() if label not in asset_labels}
    source = html + "\n" + js
    for label, token in required_html.items():
        if token not in source:
            errors.append(f"missing {label}: {token}")

    background = html.find('id="backgroundColor"')
    text_color = html.find('id="textColor"')
    asset_panel = html.find("me-layer-panel")
    if text_only:
        if min(background, text_color) < 0:
            errors.append("text-only effects still require background and text color controls")
    elif min(background, text_color, asset_panel) < 0 or not (background < asset_panel and text_color < asset_panel):
        errors.append("background/text color controls must be inside the text area before the asset panel")

    state_checks = {
        "expanded state": ("is-list-expanded",),
        "manager state transition": ("setAssetManager", "setLayerManager"),
        "selected list rebuild": ("renderSelectedAssets", "renderAssets"),
    }
    if text_only:
        state_checks = {}
    for label, alternatives in state_checks.items():
        if not any(token in js for token in alternatives):
            errors.append(f"missing {label}: one of {', '.join(alternatives)}")

    inline_icons = "iconBoundary" in source or "插入到光标" in source
    if inline_icons:
        for label, alternatives in {
            "row-local icon insertion": ("插入图标",),
            "row-local pause for editing": ("暂停修改",),
            "explicit inline-icon edit": ('data-action="edit-icon"', "edit-icon"),
            "candidate-adjacent insert": ("quick-insert", "quickInsert"),
            "row seek before editing": ("seekToRowStart", "seekToPage", "seekToRow"),
            "responsive library drawer": ("setIconLibraryDrawer", "setLibraryDrawer", "setAssetLibraryDrawer"),
        }.items():
            if not any(token in source for token in alternatives):
                errors.append(f"missing {label}: one of {', '.join(alternatives)}")

    if errors:
        for error in errors:
            fail(error)
        return 1
    print(f"PASS: {html_path.name} follows the shared editor structure; browser interaction checks are still required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
