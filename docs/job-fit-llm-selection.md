# 원장님 안목 기반 LLM 운영 기준 (Gemini 2.5 Flash)

## 운영 모델

- 프로덕션 job-fit 호출은 **Gemini 한 종류**만 사용한다 (`gemini-2.5-flash` 기본, `JOB_FIT_MODEL_GEMINI`로 덮어쓸 수 있음).
- API 오류·파싱 실패 시에는 재시도 대신 예외로 처리되며, 배치에서는 해당 건이 `failed`로 집계되고 DB `pending`은 유지된다(사람 검수).

## 전환 규칙

- 골든셋 벤치마크에서 오탐(FP), 미탐(FN) 임계치를 만족하는 한 비용 효율적인 모델 구성을 유지한다.
- 경계 점수(45~59)는 자동 승인/거절하지 않고 `pending`으로 유지한다.

## 벤치마크 실행

```bash
npm run bench:job-fit
```

필수 환경 변수:

- `GEMINI_API_KEY`

배포 환경에서 **집계 메트릭만** threshold 대비 검증할 때는 [job-fit-benchmark.md](./job-fit-benchmark.md)와 `npm run check:job-fit-benchmark`를 사용한다.
