# 원장님 안목 기반 LLM 운영 기준 (Gemini 2.5 Flash)

## 운영 모델

- 프로덕션 job-fit 호출은 **Gemini 한 종류**만 사용한다 (`gemini-2.5-flash` 기본, `JOB_FIT_MODEL_GEMINI`로 덮어쓸 수 있음).
- **HTTP 재시도:** 429·5xx 및 일시적 `fetch` 실패에 대해 지수 백오프(짧은 지터)로 최대 여러 번 재시도한 뒤, 그래도 실패하면 예외로 처리한다. 배치에서는 해당 건이 `failed`로 집계되고 DB `pending`은 유지된다(사람 검수).
- **응답 정규화:** LLM이 `matched_rules`를 비우거나 생략하면 `llm_matched_rules_fallback` 태그 한 개로 보정한 뒤 평가를 계속한다. 그 밖의 JSON·Zod 오류는 예외로 처리된다.

## 전환 규칙

- 골든셋 벤치마크에서 오탐(FP), 미탐(FN) 임계치를 만족하는 한 비용 효율적인 모델 구성을 유지한다.
- 경계 점수(45~59)는 자동 승인/거절하지 않고 `pending`으로 유지한다.

## 벤치마크 실행

```bash
npm run bench:job-fit
```

필수 환경 변수:

- `GEMINI_API_KEY`

선택(재시도·타임아웃 튜닝, 미설정 시 기본값 사용):

- `JOB_FIT_GEMINI_MAX_ATTEMPTS` — 총 시도 횟수(기본 5)
- `JOB_FIT_GEMINI_BACKOFF_BASE_MS` — 백오프 초기 간격 ms(기본 500)
- `JOB_FIT_GEMINI_BACKOFF_MAX_MS` — 대기 상한 ms(기본 10000)
- `JOB_FIT_GEMINI_TIMEOUT_MS` — 요청당 타임아웃 ms(기본 60000)

배포 환경에서 **집계 메트릭만** threshold 대비 검증할 때는 [job-fit-benchmark.md](./job-fit-benchmark.md)와 `npm run check:job-fit-benchmark`를 사용한다.
