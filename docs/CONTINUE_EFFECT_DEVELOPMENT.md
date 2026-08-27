# Low-token effect-development continuation

This is the short entry point for continuing ME Motion Studio work in a fresh chat or on another computer. Repository-wide rules remain in [`../AGENTS.md`](../AGENTS.md); reusable editor and export behavior remains in [`../.codex/skills/build-font-animation-effects/SKILL.md`](../.codex/skills/build-font-animation-effects/SKILL.md).

## Start without scanning the repository

1. Run `git status --short`, `git fetch origin`, and inspect the current branch divergence before editing. Preserve unrelated or uncommitted work.
2. Read only:
   - `AGENTS.md`;
   - `.codex/skills/build-font-animation-effects/SKILL.md`;
   - the requested effect's `site/<slug>.html`, `site/<slug>.css`, and `site/<slug>.js`;
   - files directly imported by that effect.
3. Load skill references conditionally:
   - editor UI or icon interaction: `references/editor-interaction-contract.md`;
   - new effect or substantial editor upgrade: `references/editor-baseline.md` and `references/reuse-map.md`;
   - reference video: `references/video-analysis-workflow.md` plus a focused video analysis note.
4. Do not read the full README changelog, all effects, or old chat history unless a concrete dependency or conflict requires it.
5. Use the same deterministic timeline and geometry for preview, PNG, GIF, and MP4. MP4 frame-rate choices must use deterministic H.264 frame encoding, not real-time `MediaRecorder` capture.

## Current source of truth

- Development branch: `agent/aug16-sequence-effects`.
- Gallery: `site/gallery.html`, `site/gallery.js`, and `site/gallery.css`.
- Shared effect skill: `.codex/skills/build-font-animation-effects/`.
- Shared fonts: `site/shared-font-library.js` and `site/shared-fonts.css`.
- Shared editor baseline: `site/me-motion-editor.js`, `site/me-motion-editor.css`, `site/workspace-editor.css`.
- Shared assets/media: `site/media-layer.js`, `site/media-layer.css`, and the icon paths documented by the project skill.
- Path Writer (`轨书`): `site/pathwriter.html`, `site/pathwriter.css`, `site/pathwriter.js`; default preset `site/assets/presets/pathwriter-default.json`; gallery video `site/assets/previews/pathwriter-card.mp4`.

## Minimal verification before handoff

- Run syntax checks on changed JavaScript and `git diff --check`.
- For editor UI changes, run the skill's `check_editor_contract.py` against the effect page.
- Test the requested behavior in the real browser at one desktop and one portrait/square size.
- Generate and inspect one real export when export code or rendering changed.
- Bump cache query versions for changed JS, presets, or gallery videos.
- Commit only after incorporating the latest remote branch without dropping another agent's effect or gallery entry.

## Prompt template for a fresh chat

```text
继续开发 opc8838-hub/font-animation 的【动效名/slug】。先按 AGENTS.md 的 Low-token continuation 执行，只读 docs/CONTINUE_EFFECT_DEVELOPMENT.md、build-font-animation-effects Skill、该动效 HTML/CSS/JS 及其直接依赖；不要扫描全仓、README 历史或旧对话。先 fetch 并检查当前分支差异，保留其他 agent 的改动。我的本次要求是：【写具体修改】。完成后做针对性浏览器与真实导出验证，再提交到 agent/aug16-sequence-effects。
```

If the user supplies a video, append: `视频只分析本次要求相关的时间段；普通 Canvas/SVG/CSS/GSAP 动效不要默认调用 oil-motion。`
