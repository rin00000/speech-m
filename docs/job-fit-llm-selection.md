# 원장님 안목 기반 LLM 운영 기준 (Gemini 2.5 Flash)

## 운영 모델
- Primary: `gemini-2.5-flash`
- Backup: `gpt-4.1-mini`

## 전환 규칙
- 골든셋 벤치마크에서 오탐(FP), 미탐(FN) 임계치를 동일하게 만족하면 더 저렴한 모델로 교체한다.
- 경계 점수(45~59)는 자동 승인/거절하지 않고 `pending`으로 유지한다.
- 런타임 호출 순서는 Gemini 우선, 실패 시 OpenAI 폴백이다.

## 벤치마크 실행
```bash
npm run bench:job-fit
```

필수 환경변수 중 하나 이상:
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

배포 환경에서 **집계 메트릭만** threshold 대비 검증할 때는 [job-fit-benchmark.md](./job-fit-benchmark.md)와 `npm run check:job-fit-benchmark`를 사용한다.
