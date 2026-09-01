# Low-token effect-development continuation

This is the short entry point for continuing ME Motion Studio work in a fresh chat or on another computer. Repository-wide rules remain in [`../AGENTS.md`](../AGENTS.md); reusable editor and export behavior remains in [`../.codex/skills/build-font-animation-effects/SKILL.md`](../.codex/skills/build-font-animation-effects/SKILL.md).

## Start without scanning the repository

1. Run `git status --short --branch`, `git fetch origin`, and inspect the current branch divergence before editing. Preserve unrelated or uncommitted work. Before replaying or merging a completed task branch, check whether its tip is already an ancestor of `origin/main`; when a squash merge is possible, also compare the scoped files and skip work whose content is already present. If the tree is clean, fast-forward local `main` and create a fresh `agent/YYYYMMDD-<slug>` branch; if it is dirty or switching could overwrite work, stop and report the exact state.
2. Read only:
   - `AGENTS.md`;
   - `.codex/skills/build-font-animation-effects/SKILL.md`;
   - for a new effect, the HTML/CSS/JS of only the closest existing effect; for a refinement, the requested effect's `site/<slug>.html`, `site/<slug>.css`, and `site/<slug>.js`;
   - files directly imported by that effect.
3. Load skill references conditionally:
   - editor UI or icon interaction: `references/editor-interaction-contract.md`;
   - new effect or substantial editor upgrade: `references/editor-baseline.md` and `references/reuse-map.md`;
   - reference video: `references/video-analysis-workflow.md` plus a focused video analysis note.
4. Do not read the full README changelog, all effects, or old chat history unless a concrete dependency or conflict requires it.
5. Use the same deterministic timeline and geometry for preview, PNG, GIF, and MP4. MP4 frame-rate choices must use deterministic H.264 frame encoding, not real-time `MediaRecorder` capture.

## Current source of truth

- Base branch: latest `origin/main`. Create a fresh task branch for each new effect or focused refinement; do not reuse a historical branch named in an old prompt.
- Gallery: `site/gallery.html`, `site/gallery.js`, and `site/gallery.css`.
- Shared effect skill: `.codex/skills/build-font-animation-effects/`.
- Shared fonts: `site/shared-font-library.js` and `site/shared-fonts.css`.
- Shared editor baseline: `site/me-motion-editor.js`, `site/me-motion-editor.css`, `site/workspace-editor.css`.
- Shared assets/media: `site/shared-icon-library.js`, `site/media-layer.js`, `site/media-layer.css`, and the icon paths documented by the project skill.
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
继续开发当前工作区里的 opc8838-hub/font-animation，新建动效【中文名 / English name / slug】。不要重新克隆，也不要扫描整台电脑。先完整读取 AGENTS.md、docs/CONTINUE_EFFECT_DEVELOPMENT.md 和 .codex/skills/build-font-animation-effects/SKILL.md；再只读取 Skill 为本任务明确路由的 references、最接近的一个现有动效 HTML/CSS/JS，以及它直接引用的共享文件。不要读取全仓、README 历史、Git 完整历史、旧对话、无关动效、work/ 或输出缓存。

开始前执行 git fetch origin 和 git status --short --branch。保留所有未提交改动；若工作区干净，则从最新 origin/main 创建 agent/YYYYMMDD-【slug】；若不干净、分支被占用或切换可能覆盖文件，停止切换并报告具体状态。

本次动效要求：【填写】。参考视频：【没有就写“无”；有则填写本机路径】。有参考视频时，按 video-analysis-workflow 先锁定运动契约，正常速度判断节奏、慢动作和密集切帧判断顺序与重叠；冻结已经确认的阶段。普通 Canvas/SVG/CSS/GSAP 动效不要调用 oil-motion。

预览、PNG、GIF、MP4 共用同一确定性时间轴与几何。完成后只做与本次需求相关的浏览器、尺寸和真实导出验证，运行语法检查、编辑器契约检查与 git diff --check；只提交本次文件，不推送或合并到 main，除非我明确要求。
```
