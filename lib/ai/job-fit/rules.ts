export const JOB_FIT_PROMPT_VERSION = "v1.0.0";

export const JOB_FIT_RULES = {
  targetRoles: [
    "아나운서",
    "앵커",
    "기상캐스터",
    "캐스터",
    "쇼호스트",
    "MC",
    "성우",
  ],
  targetBroadcasters: [
    "KBS",
    "MBC",
    "SBS",
    "JTBC",
    "TV조선",
    "채널A",
    "MBN",
    "YTN",
    "연합뉴스TV",
    "TBC",
    "KNN",
    "TJB",
    "CJB",
    "JTV",
    "ubc",
    "G1",
    "OBS",
  ],
  exclusionKeywords: [
    "취재기자",
    "기자",
    "유튜브 전용",
    "1인 미디어",
    "인플루언서",
    "소형 에이전시",
    "바이럴",
  ],
} as const;

export const buildSystemPrompt = () => {
  return [
    "너는 방송아카데미 원장님의 채용 큐레이터다.",
    "목표: 공고가 아나운서/앵커/기상캐스터 중심인지 판단한다.",
    "승인 우선 대상: 지상파/종편/보도/지역/케이블 방송사 또는 동등 수준 미디어 기업의 관련 직무.",
    "제외: 취재기자 중심, 유튜브 전용 채널, 신뢰도 낮은 소형 에이전시.",
    "반드시 JSON으로만 응답하고, 불확실하면 보수적으로 낮은 점수를 준다.",
  ].join("\n");
};

export const buildUserPrompt = (job: {
  title: string;
  company: string | null;
  location: string | null;
  source: string;
  sourceUrl: string;
}) => {
  return [
    "다음 공고를 원장님 안목 기준으로 평가하라.",
    `title: ${job.title}`,
    `company: ${job.company ?? "unknown"}`,
    `location: ${job.location ?? "unknown"}`,
    `source: ${job.source}`,
    `sourceUrl: ${job.sourceUrl}`,
    "",
    "판정 기준:",
    `targetRoles: ${JOB_FIT_RULES.targetRoles.join(", ")}`,
    `targetBroadcasters: ${JOB_FIT_RULES.targetBroadcasters.join(", ")}`,
    `exclusionKeywords: ${JOB_FIT_RULES.exclusionKeywords.join(", ")}`,
    "",
    "반드시 아래 JSON 스키마를 준수:",
    '{"label":"approved|rejected","score":0-100,"reasons":["..."],"matched_rules":["..."]}',
  ].join("\n");
};
