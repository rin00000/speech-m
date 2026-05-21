# Speech-M Agent Configuration (Codex / Cursor / CLI)

AI 코딩 에이전트(Codex 익스텐션, Cursor, Gemini CLI 등)의 **진입점**이다.  
상세 규칙은 `.cursor/rules/*.mdc`에 있으며, Codex는 Cursor처럼 `.mdc`를 자동 주입하지 않으므로 **작업 시작 전 해당 파일을 직접 읽고 준수**한다.

## 🎯 Core Identity & Pipeline

- **Product:** Speech-M — 방송 아나운서·리포터 취업 준비 올인원 관리 플랫폼
- **Core Pipeline:** `Scrape -> AI Filter -> Human-in-the-loop -> AI Post`
- **Quality Bar:** 게시량보다 "Director's Eye" 큐레이션 품질 우선
- **Stack:** Next.js 16 (App Router), React 19, Supabase, Tailwind v4, Vitest

## 📜 Load Order (Source of Truth)
1. System/platform constraints
2. `.cursor/rules/*.mdc` (Read and explicitly follow all Cursor rules)
3. Explicit user requests via CLI
4. This file

## 🤖 Agent Execution Behavior

- **Language:** 설명·보고·커밋 메시지는 **한국어**. 코드 주석·식별자는 English(별도 지정 없을 때).
- **Autonomy:** 안전한 편집·생성·명령은 자동 진행. 파일 삭제·대규모 설정 변경 등 **파괴적 작업만** 사용자 확인.
- **Git:** 사용자가 **명시적으로 요청할 때만** `git commit` / push. `.env*`·토큰·키 파일 커밋 금지.
- **Scope:** 최소 diff. 요청과 무관한 리팩터·과도한 추상화 금지. 기존 코드 스타일·패턴 재사용.
- **Planning:** 5개 이상 파일 또는 schema/auth/crawl-schedule 등 고영향 영역은 짧은 계획 후 승인 대기.
- **Code review flow:** 구현 전 `<CODE_REVIEW>`(기존 코드 분석) → `<PLANNING>`(단계·트레이드오프)을 간결히 출력.

## 📂 Rule Management

- 새 개발 규칙은 임의 폴더에 두지 않는다. **`.cursor/rules/`** 기존 `.mdc` 수정 또는 신규 `.mdc` 추가.
- 이 `AGENTS.md`는 **인덱스·진입점**으로 유지하고, 상세 규칙은 `.mdc`에 둔다(32 KiB Codex instruction 한도 고려).
- 중첩 디렉터리 전용 규칙이 필요하면 해당 경로에 `AGENTS.override.md` 사용(Codex discovery 규약).

## 🔗 Related Files

- `GEMINI.md` — Gemini CLI용 AGENTS.md 진입 안내
- `CLAUDE.md` — Claude용 AGENTS.md 참조
- `docs/worktree-parallel-status.md` — 병렬 워크트리 브랜치·작업 소유
