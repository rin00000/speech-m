# Worktree Parallel Status

Last Updated: 2026-05-11 (KST)
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
- Next Step: golden-set JSON 경로·CI에서 `/api/admin/benchmark-job-fit` 호출 스크립트 정리

## 3) admin-ui
- Path: `C:/Users/rinju/speech-m-wt/admin-ui`
- Branch: `feat/admin-ui-density`
- Objective: HITL dashboard density/usability improvements
- Latest Commit: `d0bd25f` (pushed; merged into base)
- Status: merged_to_base
- Next Step: 추가 관리자 화면에 동일 밀도 패턴 적용 여부 검토

## Main Workspace
- Path: `C:/Users/rinju/speech-m`
- Branch: `feature/admin-layout`
- Latest Commit: `cb5c17d` (로컬: 세 브랜치 merge + 상태 문서; push 시 `git push origin feature/admin-layout`)
- Note: `lib/ai/job-fit/config.ts`에 `JOB_FIT_CONFIG`와 benchmark threshold가 공존

## Update Rule
- Update this file whenever:
  1. a worktree gets a new commit
  2. task scope changes
  3. blocker appears or is resolved
