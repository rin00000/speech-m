# Job-fit benchmark (HTTP)

## 목적

배포된 앱의 `POST /api/admin/benchmark-job-fit`에 **집계 메트릭**(precision, recall, f1, driftDelta)을 넣어 threshold 대비 pass/fail을 확인한다. LLM을 다시 호출하지 않는다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `BENCHMARK_BASE_URL` | 배포 베이스 URL (예: `https://example.com`) |
| `CRAWL_API_SECRET` | 크롤 API와 동일; 요청 헤더 `x-crawl-secret`에 사용 |
| `JOB_FIT_METRICS_PATH` | (선택) 메트릭 JSON 경로. 기본값: `data/job-fit/golden-metrics.sample.json` |

## 로컬 / CI 실행

```bash
npm run check:job-fit-benchmark
```

CI에서는 위 시크릿이 모두 설정된 경우에만 워크플로가 검증을 수행한다. 스테이징 URL이 없으면 해당 job은 스킵한다.

## 배치(`runJobFitBatch`)와의 관계

현재 정책은 **옵션 A**: 배치 본문은 변경하지 않고, 골든 런·메트릭 산출은 **배치 외부**(`npm run bench:job-fit` → `lib/ai/job-fit/bench/golden-llm-run.ts`, `tsx --tsconfig tsconfig.bench.json`)에서 수행한 뒤, 산출된 메트릭으로 이 엔드포인트를 호출한다.

## 관련 파일

- [app/api/admin/benchmark-job-fit/route.ts](../app/api/admin/benchmark-job-fit/route.ts)
- [lib/ai/job-fit/bench/benchmark.ts](../lib/ai/job-fit/bench/benchmark.ts)
- [lib/ai/job-fit/domain/config.ts](../lib/ai/job-fit/domain/config.ts) (`JOB_FIT_BENCHMARK_THRESHOLDS`)
