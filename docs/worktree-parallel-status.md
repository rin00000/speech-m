# Worktree Parallel Status

Last Updated: 2026-05-08 18:31 (KST)
Base Branch: `feature/admin-layout`
Worktree Root: `C:/Users/rinju/speech-m-wt`

## 1) crawler
- Path: `C:/Users/rinju/speech-m-wt/crawler`
- Branch: `feat/crawler-pipeline`
- Objective: crawling reliability (timeout/retry/dedupe/concurrency control)
- Latest Commit: `-` (uncommitted changes)
- Status: in_progress (fetchWithRetry + timeout wired)
- Next Step: run dependency-ready lint/build check, then commit in `feat/crawler-pipeline`

## 2) ai-filter
- Path: `C:/Users/rinju/speech-m-wt/ai-filter`
- Branch: `feat/ai-filtering`
- Objective: job-fit quality (golden-set thresholds, drift reduction, fallback policy)
- Latest Commit: `-` (uncommitted changes)
- Status: in_progress (benchmark threshold config connected)
- Next Step: connect benchmark evaluation action to admin trigger and commit in `feat/ai-filtering`

## 3) admin-ui
- Path: `C:/Users/rinju/speech-m-wt/admin-ui`
- Branch: `feat/admin-ui-density`
- Objective: HITL dashboard density/usability improvements
- Latest Commit: `-` (uncommitted changes)
- Status: in_progress (sticky header + density toggle applied)
- Next Step: UI regression check on jobs table interactions, then commit in `feat/admin-ui-density`

## Main Workspace
- Path: `C:/Users/rinju/speech-m`
- Branch: `feature/admin-layout`
- Latest Commit: `b17d999`
- Note: baseline updates committed before parallel feature implementation

## Update Rule
- Update this file whenever:
  1. a worktree gets a new commit
  2. task scope changes
  3. blocker appears or is resolved
