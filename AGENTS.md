# Speech-M Gemini Agent Configuration (Index)

This file guides the Gemini/Antigravity CLI agent behavior. Keep it intentionally minimal for token efficiency.

## 🎯 Core Identity & Pipeline
- **Product:** Speech-M (All-in-one management platform for broadcaster job prep)
- **Core Pipeline:** `Scrape -> AI Filter -> Human-in-the-loop -> AI Post`
- **Quality Bar:** Prioritize "Director's Eye" curation quality over posting volume

## 📜 Load Order (Source of Truth)
1. System/platform constraints
2. `.cursor/rules/*.mdc` (Read and explicitly follow all Cursor rules)
3. Explicit user requests via CLI
4. This file

## 🤖 Agent Execution Behavior
- **Language:** Always communicate, log, and explain in **Korean**.
- **Autonomy:** Auto-approve safe edits, creations, and commands. Ask for explicit user confirmation (y/n) **ONLY** for destructive actions (e.g., file deletion, major config overrides).
- **Efficiency:** Optimize compute effort. Use lighter models for simple UI/boilerplate tasks; save heavy reasoning models for complex logic.

## 📂 Rule Management & Notes
- **Single Source of Truth:** 당신이 새로운 개발 규칙을 제안하거나 생성할 때 절대 임의의 폴더를 만들지 마세요. 무조건 `.cursor/rules/` 폴더 내의 기존 `.mdc` 파일을 수정하거나, 새 `.mdc` 파일로 저장해야 합니다.
- **Project Structure:** Repo folder placement (app / components / lib) rules are in `.cursor/rules/project-structure.mdc`.
- **Worktree:** Parallel worktree status is tracked in `docs/worktree-parallel-status.md`.