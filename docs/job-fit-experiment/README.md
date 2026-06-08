# Job-fit batch experiment

## 1. 실험 목적

Speech-M의 AI 직무 적합도 판별 배치에서 `ADMIN_JOB_FIT_BATCH_LIMIT`, `JOB_FIT_BATCH_CONCURRENCY`, `JOB_FIT_DB_UPDATE_CONCURRENCY`, Gemini RPM 제한의 운영 적정값을 찾는다. 목표는 가장 빠른 설정이 아니라 처리 속도, 안정성, 429 발생, 실패율, skipped 비율, 락 점유 시간, API 호출량, 서버 자원 참고값을 함께 비교해 운영 가능한 값을 고르는 것이다.

## 2. 기존 구조

- 진입점: `runJobFitBatch()` in `lib/ai/job-fit/pipeline/batch.ts`
- 관리자 실행: `POST /api/admin/job-fit/run` in `app/api/admin/job-fit/run/route.ts`
- 관리자 실행 락: `acquireAdminJobFitRunLock()` in `lib/ai/job-fit/pipeline/admin-run-lock.ts`
- LLM provider와 Gemini 큐: `lib/ai/job-fit/pipeline/providers.ts`
- 동시 처리 풀: `lib/async/pool-all-settled.ts`

현재 흐름은 pending 공고 조회, deterministic rule 분리, rule 결과 DB 반영, LLM 대상 처리, 결과 합산 순서다. `JOB_FIT_BATCH_CONCURRENCY`는 LLM 대상 처리 풀에 적용되고, `JOB_FIT_DB_UPDATE_CONCURRENCY`는 현재 deterministic rule 결과 DB 반영 풀에 직접 적용된다. LLM 결과 DB 업데이트는 LLM worker 내부에서 실행되므로 LLM concurrency에 의해 간접 제한된다.

## 3. 변수 정의

| Variable | Meaning | Default / cap in experiment |
|---|---|---:|
| `ADMIN_JOB_FIT_BATCH_LIMIT` | 관리자 실험 실행 1회에서 가져올 pending 공고 수 | default 30, experiment cap 40 |
| `JOB_FIT_BATCH_CONCURRENCY` | LLM 대상 공고 처리 promise 동시성 | default 1, max 30, batch limit 초과 시 cap |
| `JOB_FIT_DB_UPDATE_CONCURRENCY` | deterministic rule 결과 DB update 동시성 | default 8, max 30, batch limit 초과 시 cap |
| `JOB_FIT_GEMINI_RPM_LIMIT` | Gemini 요청 시작 속도 제한 계산값 | default 10, experiment mode에서 10 초과 차단 |
| `JOB_FIT_GEMINI_MIN_INTERVAL_MS` | Gemini 요청 시작 최소 간격 override | experiment mode에서 0 이하 차단 |
| `JOB_FIT_ADMIN_RUN_LOCK_TTL_MS` | 관리자 배치 TTL 락 | 600000ms |

## 4. 통제 변수

Phase별로 하나의 핵심 변수만 바꾼다. RPM은 기본 실험에서 10으로 고정한다. Gemini 공식 quota와 운영 정책이 확인되기 전에는 RPM 상향 실험을 하지 않는다.

## 5. 측정 지표

- 전체 배치 시간: `durationMs`
- 락 점유 참고값: `lockHeldMs`, `ttlUtilization = lockHeldMs / lockTtlMs`
- 선택/분기: `selectedCount`, `ruleProcessedCount`, `llmWorkCount`
- 결과: `llmSuccessCount`, `completedCount`, `skippedCount`, `failedCount`
- provider: `providerRequestCount`, `provider429Count`, `providerErrorCount`, `maxRetryAfterMs`
- 큐/응답: `queueWaitAvgMs`, `queueWaitP95Ms`, `providerDurationAvgMs`, `providerDurationP95Ms`
- 자원 참고값: `memoryRssDeltaMb`, `heapUsedDeltaMb`, `cpuUserMs`, `cpuSystemMs`
- 입력 분포: `inputTextLengthMin`, `inputTextLengthMax`, `inputTextLengthAvg`, `inputTextLengthMedian`

Node.js `process.memoryUsage()`는 현재 Node 프로세스 메모리, `process.cpuUsage()`는 현재 프로세스 user/system CPU time을 반환한다. Vercel Functions는 인스턴스를 재사용할 수 있고 Fluid Compute에서는 같은 인스턴스 내 동시 실행이 가능하므로, 이 값은 절대적인 인프라 사용량이 아니라 같은 배포/환경 안의 반복 실행 간 비교용 참고값이다. 공식 참고: [Vercel Functions](https://vercel.com/docs/functions), [Vercel Functions limits](https://vercel.com/docs/functions/limitations), [Node.js process docs](https://nodejs.org/api/process.html).

## 6. 실험 환경

기록할 항목:

| Item | Value |
|---|---|
| Deployment | TODO |
| Vercel plan / function duration | TODO |
| Region | TODO |
| Gemini model | TODO |
| Gemini quota 확인 여부 | TODO |
| Supabase project | TODO |
| Experiment window | TODO |

## 7. 테스트 데이터 조건

공정한 비교 우선순위:

1. 개발/스테이징에서 동일 테스트 데이터셋을 반복 실행한다.
2. 동일 공고 ID 목록을 입력받는 별도 실험 함수를 추가한다.
3. 운영 pending 데이터를 쓴다면 `selectedCount`, `ruleProcessedCount`, `llmWorkCount`, 입력 길이 통계를 반드시 함께 해석한다.

현재 최소 구현은 운영 로직을 그대로 실행하므로 pending 상태가 실제로 변경된다. 동일 공고를 반복 재사용하거나 Gemini 비용을 과도하게 발생시키는 dry-run은 아직 구현하지 않았다.

## 8. Phase A 결과 표

고정값:

- `ADMIN_JOB_FIT_BATCH_LIMIT=30`
- `JOB_FIT_DB_UPDATE_CONCURRENCY=8`
- `JOB_FIT_GEMINI_RPM_LIMIT=10`
- `JOB_FIT_GEMINI_MIN_INTERVAL_MS`: 운영값

| Concurrency | Runs | Avg duration | P95 duration | Throughput | 429 runs | Failure rate | Skip rate | Avg memory delta | Decision |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 2 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 4 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 8 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |

## 9. Phase A 분석 및 concurrency 선정 이유

작성 가이드:

- 429가 반복 발생한 concurrency는 제외한다.
- skipped 또는 failed 비율이 증가한 설정은 제외한다.
- 처리 시간 개선이 10% 미만이면 더 낮은 concurrency를 우선한다.
- queue wait가 RPM 제한으로 지배된다면 concurrency 증가는 실효가 작을 수 있다.
- LLM worker 증가가 DB update 병목을 만들었는지 함께 확인한다.

선정값: TODO

## 10. Phase B 결과 표

Phase A 선정 concurrency를 고정한다.

| Batch limit | Runs | Avg selected | Avg LLM work | Avg duration | Throughput | 429 runs | TTL utilization | Failure rate | Decision |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 10 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 20 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 30 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| 40 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |

## 11. Phase B 분석 및 batch limit 선정 이유

작성 가이드:

- TTL 사용률이 70% 이상이면 주의 또는 제외한다.
- 한 번의 429/실패가 영향을 주는 LLM 대상 범위를 본다.
- 관리자 입장에서 필요한 반복 실행 횟수와 실패 blast radius를 함께 본다.
- `selectedCount` 대비 `llmWorkCount` 비율이 비슷한 실행끼리 비교한다.

선정값: TODO

## 12. 필요 시 Phase C 결과

Phase A/B 선정값을 고정하고 `JOB_FIT_DB_UPDATE_CONCURRENCY=1,2,4,8`을 비교한다. 현재 코드상 이 값은 deterministic rule 결과 DB 반영에 직접 적용되고 LLM 결과 update는 LLM worker 내부에서 실행된다. deterministic rule 처리량이 작거나 DB update 시간이 provider 시간에 비해 작다면 Phase C는 생략할 수 있다.

| DB update concurrency | Runs | Avg duration | Rule processed | Failure rate | DB-related failures | Decision |
|---:|---:|---:|---:|---:|---:|---|
| 1 | TODO | TODO | TODO | TODO | TODO | TODO |
| 2 | TODO | TODO | TODO | TODO | TODO | TODO |
| 4 | TODO | TODO | TODO | TODO | TODO | TODO |
| 8 | TODO | TODO | TODO | TODO | TODO | TODO |

## 13. 최종 설정값

| Setting | Selected value | Reason |
|---|---:|---|
| `ADMIN_JOB_FIT_BATCH_LIMIT` | TODO | TODO |
| `JOB_FIT_BATCH_CONCURRENCY` | TODO | TODO |
| `JOB_FIT_DB_UPDATE_CONCURRENCY` | TODO | TODO |
| `JOB_FIT_GEMINI_RPM_LIMIT` | 10 | Gemini quota/policy 확인 전 고정 |
| `JOB_FIT_GEMINI_MIN_INTERVAL_MS` | TODO | TODO |

## 14. 선택하지 않은 값과 제외 이유

| Setting | Value | Exclusion reason |
|---|---:|---|
| TODO | TODO | TODO |

## 15. 한계

- 최소 구현은 실제 pending 공고 상태를 변경한다.
- 동일 데이터셋 반복 실행 경로와 dry-run 저장 분리는 아직 없다.
- provider request count는 LLM invocation 기준이다. fetch helper 내부의 모든 재시도 attempt별 세분화는 별도 확장이다.
- Vercel CPU/메모리 값은 인스턴스 재사용과 동시 실행의 영향을 받는다.
- 여러 Vercel 함수 인스턴스가 동시에 실행되면 Gemini 큐는 인스턴스 간 공유되지 않는다. 관리자 API의 DB TTL 락으로 관리자 수동 실행 중복은 막는다.

## 16. 추후 재실험 조건

- Gemini quota 또는 모델이 바뀐 경우
- batch route `maxDuration`이나 Vercel plan이 바뀐 경우
- job-fit prompt 또는 deterministic rule이 크게 바뀐 경우
- `job_postings` 입력 필드가 늘어나 본문/상세 텍스트가 LLM에 들어가기 시작한 경우
- Supabase region, DB 성능, RLS/인덱스가 바뀐 경우

## 17. 포트폴리오용 요약

Speech-M job-fit 배치는 LLM 호출 속도 제한, 서버리스 실행 시간, DB update 동시성, 관리자 락 TTL을 함께 고려해 운영값을 선정한다. 실험은 한 번에 하나의 변수만 바꾸고, 429/실패/skipped/TTL 사용률을 먼저 통과한 설정 중 처리량 개선이 유의미한 값을 선택한다. 결과는 구조화 JSON 로그, CSV, Markdown 집계표로 남겨 재실험 가능성을 확보한다.

## 실행 절차

관리자 API에서만 실험 모드가 적용된다. cron은 `JOB_FIT_EXPERIMENT_ENABLED=true`가 있어도 실험 override를 사용하지 않는다.

Phase A 예:

```env
JOB_FIT_EXPERIMENT_ENABLED=true
JOB_FIT_EXPERIMENT_NAME=job-fit-tuning-v1
JOB_FIT_EXPERIMENT_PHASE=A-concurrency
JOB_FIT_EXPERIMENT_CASE=A-C1
JOB_FIT_EXPERIMENT_REPETITION=1
ADMIN_JOB_FIT_BATCH_LIMIT=30
JOB_FIT_BATCH_CONCURRENCY=1
JOB_FIT_DB_UPDATE_CONCURRENCY=8
JOB_FIT_GEMINI_RPM_LIMIT=10
```

관리자 화면의 AI 배치 버튼 또는 `POST /api/admin/job-fit/run`을 관리자 세션으로 실행한다. 각 case는 최소 3회 반복한다.

## 로그 수집 및 변환

Vercel 로그에서 `job_fit_batch_started`, `job_fit_llm_item_completed`, `job_fit_batch_completed` JSON 로그를 포함한 로그 파일을 저장한 뒤:

```bash
npx tsx scripts/job-fit-experiment/parse-logs.ts vercel-job-fit.log --out docs/job-fit-experiment/results/raw-results.csv
```

집계:

```bash
npx tsx scripts/job-fit-experiment/summarize-results.ts docs/job-fit-experiment/results/raw-results.csv --out docs/job-fit-experiment/results/summary.md
```

## 원복

1. Vercel 환경변수에서 `JOB_FIT_EXPERIMENT_ENABLED=false` 또는 삭제.
2. `ADMIN_JOB_FIT_BATCH_LIMIT`, `JOB_FIT_BATCH_CONCURRENCY`, `JOB_FIT_DB_UPDATE_CONCURRENCY`, `JOB_FIT_GEMINI_RPM_LIMIT`, `JOB_FIT_GEMINI_MIN_INTERVAL_MS`를 운영 기본값으로 복구.
3. 배포 후 `job_fit_batch_started` 로그가 더 이상 나오지 않는지 확인.
