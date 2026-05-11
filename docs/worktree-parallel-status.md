# Worktree Parallel Status

Last Updated: 2026-05-11 (post-merge follow-up)
Base Branch: `feature/admin-layout`
Worktree Root: `C:/Users/rinju/speech-m-wt`

## 1) crawler
- Path: `C:/Users/rinju/speech-m-wt/crawler`
- Branch: `feat/crawler-pipeline`
- Objective: crawling reliability (timeout/retry/dedupe/concurrency control)
- Latest Commit: `362117c` (pushed; merged into base)
- Status: merged_to_base
- Next Step: 운영 모니터링 후 필요 시 동시성 상수·타임아웃 튜닝

## 2) ai-filter
- Path: `C:/Users/rinju/speech-m-wt/ai-filter`
- Branch: `feat/ai-filtering`
- Objective: job-fit quality (golden-set thresholds, drift reduction, fallback policy)
- Latest Commit: `d8c1be2` (pushed; merged into base)
- Status: merged_to_base
- Next Step: 실제 메트릭 파일·스테이징 시크릿으로 `npm run check:job-fit-benchmark` 운영 검증

## 3) admin-ui
- Path: `C:/Users/rinju/speech-m-wt/admin-ui`
- Branch: `feat/admin-ui-density`
- Objective: HITL dashboard density/usability improvements
- Latest Commit: `d0bd25f` (pushed; merged into base)
- Status: merged_to_base
- Next Step: [admin-ui-table-density.md](./admin-ui-table-density.md) 기준, 신규 장문 테이블에만 패턴 적용

## Main Workspace
- Path: `C:/Users/rinju/speech-m`
- Branch: `feature/admin-layout`
- Status: merged_and_pushed — `feat/crawler-pipeline`, `feat/ai-filtering`, `feat/admin-ui-density` 통합 후 `origin/feature/admin-layout` 반영됨
- Note: `lib/ai/job-fit/config.ts`에 `JOB_FIT_CONFIG`와 benchmark threshold가 공존
- PR: `main` ← `feature/admin-layout` — 비교/생성: https://github.com/rin00000/speech-m/compare/main...feature/admin-layout (로컬에 `gh` 없으면 웹에서 PR 생성)
- CI: 저장소 시크릿 `BENCHMARK_BASE_URL`, `CRAWL_API_SECRET` 설정 시 [`.github/workflows/job-fit-benchmark-check.yml`](../.github/workflows/job-fit-benchmark-check.yml)에서 HTTP benchmark 검증 실행

## Update Rule
- Update this file whenever:
  1. a worktree gets a new commit
  2. task scope changes
  3. blocker appears or is resolved
