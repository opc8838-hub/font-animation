"""One-time helper to fill gaps in the static site locale dictionary.

Sends public, visible site copy to Google Translate and saves reviewed/static
results. Normal builds use the resulting JSON file and never make network calls.
"""
from __future__ import annotations

import json
import re
import runpy
import time
import urllib.parse
import urllib.request
from collections import OrderedDict
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
OUTPUT = SITE / "site-locale-machine.json"
SEPARATOR = "<<<CELLMOTION_ITEM_6C9F>>>"
ENDPOINT = "https://translate.googleapis.com/translate_a/single"
CJK = re.compile(r"[\u3400-\u9fff]")


def collect_candidates() -> list[str]:
    module = runpy.run_path(str(ROOT / "scripts/build_site_locale_dictionary.py"))
    translations: dict[str, str] = {}
    for source in (SITE / "stg-cn.js", SITE / "typecascade-locale.js"):
        for chinese, english in module["dictionary_pairs"](source):
            translations[chinese] = english
            translations[english] = chinese
    catalog = json.loads((SITE / "cellmotion-catalog.json").read_text(encoding="utf-8"))
    for effect in catalog["effects"]:
        if effect.get("name") and effect.get("english"):
            translations[effect["name"]] = effect["english"]
    existing = json.loads((SITE / "site-locale-dictionary.json").read_text(encoding="utf-8"))
    translations.update(existing)

    class Audit(module["VisibleTextAudit"]):
        pass

    unique: OrderedDict[str, None] = OrderedDict()
    for page in SITE.rglob("*.html"):
        audit = Audit()
        audit.feed(page.read_text(encoding="utf-8"))
        for value in audit.strings:
            if value and value not in translations and CJK.search(value):
                unique[value] = None
    return list(unique)


def chunks(values: list[str], max_chars: int = 2400):
    group: list[str] = []
    size = 0
    for value in values:
        addition = len(value) + len(SEPARATOR)
        if group and size + addition > max_chars:
            yield group
            group, size = [], 0
        group.append(value)
        size += addition
    if group:
        yield group


def translate_batch(values: list[str]) -> list[str]:
    text = f"\n{SEPARATOR}\n" + f"\n{SEPARATOR}\n".join(values) + f"\n{SEPARATOR}\n"
    query = urllib.parse.urlencode({"client": "gtx", "sl": "zh-CN", "tl": "en", "dt": "t", "q": text})
    request = urllib.request.Request(ENDPOINT + "?" + query, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    translated = "".join(part[0] for part in payload[0] if part and part[0])
    result = [part.strip() for part in translated.split(SEPARATOR)]
    while result and not result[0]:
        result.pop(0)
    while result and not result[-1]:
        result.pop()
    if len(result) != len(values):
        raise ValueError(f"Expected {len(values)} translations, got {len(result)}")
    return result


def main() -> None:
    candidates = collect_candidates()
    cache = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
    pending = [value for value in candidates if value not in cache]
    groups = list(chunks(pending))
    print(f"Translating {len(pending)} missing phrases in {len(groups)} batches")
    for index, group in enumerate(groups, start=1):
        for attempt in range(3):
            try:
                results = translate_batch(group)
                for original, english in zip(group, results):
                    if english and english != original and CJK.search(original) and not CJK.search(english):
                        cache[original] = english
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(1.5 * (attempt + 1))
        OUTPUT.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if index % 10 == 0 or index == len(groups):
            print(f"{index}/{len(groups)} batches · {len(cache)} translations cached")
        time.sleep(0.12)


if __name__ == "__main__":
    main()
