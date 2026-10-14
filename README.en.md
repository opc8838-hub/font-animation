# CellMotion — Editable motion and video creation

[简体中文](README.md) · [English](README.en.md)

Questions and pull requests: see the [bilingual contribution guide](CONTRIBUTING.md).

**Let creativity grow freely.**

**2026-10-14 Type Pour:** [Open the editor](https://cellmotion.cn/typepour.html). Fluid typography with a transparent glass, blue markers or pure type, synchronized procedural water audio, shared fonts/assets, image/GIF/video backgrounds and trimming. Includes the current three-column CellMotion UI, scheme history, responsive canvas, For AI live-state components, PNG/GIF/MP4 and WAV export. [Validation](docs/analyses/typepour.md).

CellMotion is a browser-based motion design system. Text, icons, images, and shapes are independent design cells that can move, connect, separate, and recombine into visual stories.

**Move · Connect · Recombine · Grow.**

**2026-10-14 Video Compare release:** [Before / After editor](https://cellmotion.cn/video-compare.html?v=20261014-vcompare10) separates source dimensions, video frame aspect and output canvas. Landscape and portrait sources fit 16:9, 9:16, square and custom outputs without stretching. Landscape sources stack on portrait canvases; portrait sources stay side by side. Before remains 45%–85% of After in both width and height. Both labels and captions are editable, including by clicking the canvas text. Stacked layouts have more breathing room; every output aspect includes a tiny editable “have a good day” at the top. Includes the supplied B2W logo, shared three-column bilingual editor, black/white palettes, embedded JSON schemes, local autosave and PNG/GIF/deterministic H.264 MP4 export with independent Before / After audio switches (After enabled by default), equal mixing and audio that follows trim / loop settings. The standard For AI menu preserves the full live scheme through 31 parameter definitions and a verified shared-renderer component, including cross-origin copied code. Listed under Recently Added, media and web components. See [template and validation](docs/analyses/video-compare.md).

**2026-10-10 CardBot editors:** [Card Login](https://opc8838-hub.github.io/font-animation/card-login.html?from=gallery) preserves the size-matched handoff, white-face crossover and smooth login reveal; [Card Deck](https://opc8838-hub.github.io/font-animation/carddeck.html?from=gallery) edits the animated expression cards, spread/drift/gather timing and individual assets. Both use the CellMotion editor shell, responsive canvas presets, scheme persistence, PNG/GIF/H.264 MP4 export and live-state For AI components. The login canvas is visual, not authentication; the original interactive HTML/CSS kit remains available separately. See [usage and integration](docs/CARDBOT_EDITORS.md) and [source licenses](docs/licenses/CARDBOT_MOTION.md).

**2026-10-09 Curved Gallery / 弧廊归标** starts with intact curved pictures and no preset black strokes. As the ring retreats and shrinks, the same pictures narrow geometrically while retaining their pixels and colors, including the final thin strips. The entire group moves left before the editable word rises, letter by letter. Upload, replace, crop and reorder photos, import an embedded-image backup from [Parallax Studio](https://opc8838-hub.github.io/xiaoguo-/), and export PNG, GIF or H.264 MP4 from the same deterministic renderer. Each image now owns all seven parallax shader effects and seven editable photo looks. Replacement retains effects/crops; Parallax Studio imports preserve shader types and parameters. Photo looks are procedural interpretations of the baked samples, not recovered original filter projects. See [motion evidence and validation](docs/analyses/curvedgallery.md).

**2026-10-10 update:** The [Curved Gallery editor](https://opc8838-hub.github.io/font-animation/curvedgallery.html?v=20261010-ai1) now includes all five standard For AI actions, its live photos/effects/brand configuration and 55 parameter definitions, using the authoritative renderer in the shared player. The full-width timeline places overlapping stages in aligned lanes and keeps the seek label on one line.

The current editor is available from the homepage’s recent releases, the media component library and the editor directory. Select an image for a large live effect/crop preview; brand-text descenders remain visible in preview and exports.

**PRO SVG Lab / 彩铸** adapts [Johnlzx/pro-svg-lab](https://github.com/Johnlzx/pro-svg-lab), inspired by Mike Bespalov / Refero. The material is not original work by this repository’s maintainer. CellMotion contributes the Sprout Shift editor integration, editable content, responsive sizes and deterministic PNG/GIF/MP4 export. See [attribution and upstream license status](docs/PRO_SVG_LAB_ATTRIBUTION.md).

The project includes a growing library of editable motion effects, a shared editor, multilingual typography, image/GIF/video media, responsive canvases, and in-browser previews and exports. The live catalog labels unfinished effects separately; availability can change as the project develops.

- **Website:** [CellMotion](https://opc8838-hub.github.io/font-animation/cellmotion.html)
- **Chinese project overview and detailed history:** [README.md](README.md)
- **Reference-video workflow:** [docs/REFERENCE_VIDEO_WORKFLOW.md](docs/REFERENCE_VIDEO_WORKFLOW.md)
- **Pending-release notes:** [docs/PENDING_RELEASE.md](docs/PENDING_RELEASE.md)

## Contact, collaboration, and consulting

CellMotion is still evolving. Bug reports, ideas, collaboration, and consulting inquiries are welcome.

<img src="site/assets/cellmotion/contact-wechat.jpg" alt="WeChat allen_8838, scan to connect" width="360">

- X / Twitter: [x.com/opc_8838](https://x.com/opc_8838)
- WeChat: `allen_8838`; scan the QR code above

<details>
<summary>Contact</summary>

Say hello, follow the repository, or report a bug.

</details>

<details>
<summary>Collaboration</summary>

For motion, editor, or open-source collaboration, reach out on WeChat or X.

</details>

<details>
<summary>Consulting</summary>

For project consulting or custom motion, scan the code and tell us what you need.

</details>

## Run locally

Serve the `site` directory over HTTP. For example:

```bash
cd site
python -m http.server 8080
```

Then open <http://127.0.0.1:8080/cellmotion.html>. HTTP is required for browser font loading and local site assets.

## Repository layout

```text
font-animation/
├── README.md                 # Chinese overview and project history
├── README.en.md              # English overview
├── AGENTS.md                 # Repository development rules
├── docs/                     # Workflows, analyses, and release notes
└── site/                     # Website, editors, effects, and shared assets
    ├── cellmotion.html       # Brand homepage
    ├── cellmotion-components.html
    ├── cellmotion-editors.html
    ├── cellmotion-catalog.json
    └── assets/               # Fonts, previews, images, and video
```

## Contributing

Please keep changes focused, preserve attribution and third-party licenses, and follow the repository guidance in `AGENTS.md`. When building an effect from a reference video, document the observed timing and motion before implementation; see the reference-video workflow above.

CellMotion builds on open-source work and published motion references. See the Chinese README and the relevant in-repository license files for attribution and licensing details.
