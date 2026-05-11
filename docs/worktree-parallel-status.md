# Worktree Parallel Status

Last Updated: 2026-05-11 (KST)
Base Branch: `feature/admin-layout`
Worktree Root: `C:/Users/rinju/speech-m-wt`

## 1) crawler
- Path: `C:/Users/rinju/speech-m-wt/crawler`
- Branch: `feat/crawler-pipeline`
- Objective: crawling reliability (timeout/retry/dedupe/concurrency control)
- Latest Commit: `f3ed2b8` (pushed)
- Status: pushed — phase 1 done (`fetchWithRetry` + timeout)
- Next Step: phase 2 — crawl HTTP concurrency cap + same-run URL dedupe; then merge to base

## 2) ai-filter
- Path: `C:/Users/rinju/speech-m-wt/ai-filter`
- Branch: `feat/ai-filtering`
- Objective: job-fit quality (golden-set thresholds, drift reduction, fallback policy)
- Latest Commit: `6da5c95` (pushed)
- Status: pushed — benchmark thresholds + evaluator wired to server action
- Next Step: phase 2 — secure admin/diagnostic API (metrics POST → pass/fail); golden-set JSON path

## 3) admin-ui
- Path: `C:/Users/rinju/speech-m-wt/admin-ui`
- Branch: `feat/admin-ui-density`
- Objective: HITL dashboard density/usability improvements
- Latest Commit: `e5075e8` (pushed)
- Status: pushed — sticky table header + density toggle
- Next Step: phase 2 — Korean density labels + scroll/sticky UX polish; then merge to base

## Main Workspace
- Path: `C:/Users/rinju/speech-m`
- Branch: `feature/admin-layout`
- Latest Commit: `e92ae24` (pushed)
- Note: parallel status doc + worktree rules tracked here; merge feature branches when ready

## Update Rule
- Update this file whenever:
  1. a worktree gets a new commit
  2. task scope changes
  3. blocker appears or is resolved
