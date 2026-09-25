# CellMotion — Editable motion and video creation

[简体中文](README.md) · [English](README.en.md)

Questions and pull requests: see the [bilingual contribution guide](CONTRIBUTING.md).

**Let creativity grow freely.**

CellMotion is a browser-based motion design system. Text, icons, images, and shapes are independent design cells that can move, connect, separate, and recombine into visual stories.

**Move · Connect · Recombine · Grow.**

The project includes a growing library of editable motion effects, a shared editor, multilingual typography, image/GIF/video media, responsive canvases, and in-browser previews and exports. The live catalog labels unfinished effects separately; availability can change as the project develops.

- **Website:** [CellMotion](https://opc8838-hub.github.io/font-animation/cellmotion.html)
- **Chinese project overview and detailed history:** [README.md](README.md)
- **Reference-video workflow:** [docs/REFERENCE_VIDEO_WORKFLOW.md](docs/REFERENCE_VIDEO_WORKFLOW.md)
- **Pending-release notes:** [docs/PENDING_RELEASE.md](docs/PENDING_RELEASE.md)

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
