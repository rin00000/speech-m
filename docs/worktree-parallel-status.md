# Worktree parallel status

- **통합 브랜치:** `dev` — 작업 전 `git pull origin dev`로 맞춥니다.
- **메인 워크스페이스:** `C:/Users/rinju/speech-m` (로컬 경로는 각자 환경에 맞게 사용)

병렬 Git 워크트리 워크플로는 종료되었습니다. 다시 워크트리를 쓰게 되면 여기에 워크트리별 경로·브랜치·다음 액션만 짧게 적으면 됩니다.

- **CI:** 저장소 시크릿 `BENCHMARK_BASE_URL`, `CRAWL_API_SECRET`이 있으면 [job-fit benchmark 워크플로](../.github/workflows/job-fit-benchmark-check.yml)가 `dev` 등 푸시 시 HTTP 검증을 수행합니다(없으면 스킵).

Last updated: 2026-05-11 (문서 축소)
