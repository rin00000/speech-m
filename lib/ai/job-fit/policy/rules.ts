export const JOB_FIT_PROMPT_VERSION = "v2.1.0";

export const JOB_FIT_INTERN_SOURCE = "mediajob_intern";

export const JOB_FIT_INTERN_ALLOWED_KEYWORDS = ["기자", "아나운서", "리포터"] as const;

/** Company-name markers for internet/small newspaper (after broadcaster check). */
export const JOB_FIT_INTERNET_NEWSPAPER_COMPANY_MARKERS = [
  "신문",
  "일보",
  "뉴스",
  "저널",
] as const;

/** Known internet/small newspaper companies (substring match). */
export const JOB_FIT_INTERNET_NEWSPAPER_EXCLUSION_COMPANIES = [
  "뉴스포스트",
  "뉴스포스트신문사",
] as const;

/** Whitelist roles at internet/small newspaper — only these go to LLM. */
export const JOB_FIT_TARGET_ROLE_KEYWORDS = [
  "아나운서",
  "앵커",
  "MC",
  "진행자",
  "기상캐스터",
  "캐스터",
  "쇼호스트",
  "성우",
] as const;

export const JOB_FIT_BLOCK_COMPANIES = [
  "206",
  "원투원TV",
  "베트남골프킹",
  "경제풍월미디어",
  "DM",
  "전업농신문사",
  "더리브스",
  "스틸앤스틸",
  "나무신문사",
  "당진신",
] as const;

export const JOB_FIT_TITLE_HARD_EXCLUDE = [
  "촬영",
  "카메라",
  "행정",
  "편집",
  "ad",
  "에디터",
  "차량",
  "인플루언서",
  "기획",
  "제작",
  "학원",
  "돌잔치",
  "결혼식",
  "bj",
  "신문",
  "실버",
  "아동",
  "틱톡",
  "라이브방송",
  "SNS",
  "의류",
  "라이브 커머스",
  "판매",
] as const;

export const JOB_FIT_KEYWORD_HARD_EXCLUDE = ["유튜버", "강사"] as const;

export const JOB_FIT_TITLE_ENTERTAINMENT = "엔터테인먼트";

export const JOB_FIT_POSITIVE_SIGNALS = ["보도국", "진행", "생방송", "진행자", "mc"] as const;

export const JOB_FIT_RULES = {
  targetRoles: [
    "아나운서",
    "앵커",
    "기상캐스터",
    "캐스터",
    "쇼호스트",
    "MC",
    "성우",
    "기자",
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
    "법률방송",
    "연합뉴스",
    "뉴시스",
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
    "보도기자",
    "유튜브 전용",
    "1인 미디어",
    "인플루언서",
    "소형 에이전시",
    "바이럴",
  ],
} as const;

const FINANCIAL_POLICY_LINES = [
  "금융기관 관련: 시중은행·증권사가 공고에 구체적으로 드러나면 포함 후보. 금융기관만 광의로 쓰이고 은행·증권사가 특정되지 않으면 제외 쪽.",
  "금융기관 라이브 등 애매한 경우: label은 rejected에 가깝게 두고 score는 45~59로 두어 관리자 보류(pending)로 가게 할 수 있다.",
];

const PRIORITY_LINES = [
  "규칙 우선순위: (1) company를 먼저 본다. (2) company가 targetBroadcasters에 부분일치하면 방송사 신호 — 취재·보도·기자 직무도 포함 후보(자동 거절 금지). (3) ELSE company가 신문/일보/뉴스/저널 마커 또는 internetNewspaperCompanies 목록이면 인터넷/중소 신문사 — title에 targetRoleKeywords만 평가 대상, 그 외(기자·취재·불명확)는 rejected. (4) 무조건 제외 회사·제목 차단·유튜버/강사·엔터. (5) 제목 한경은 (4)에 걸리지 않을 때만.",
];

const REPORTER_POLICY_LINES = [
  "기자·취재 직무 분기:",
  "- IF source가 mediajob_intern AND title/company에 기자·아나운서·리포터 중 하나 → 인턴 포함 후보(무조건 넣음).",
  "- ELSE IF company ∈ targetBroadcasters AND title에 취재기자·보도기자·취재·기자 → 방송사 취재·기자 포함 후보(자동 거절 금지).",
  "- ELSE IF 인터넷/중소 신문사 AND title에 취재기자·보도기자·기자·취재 → rejected.",
  "- ELSE IF 인터넷/중소 신문사 AND title에 targetRoleKeywords → 평가(approved/pending 가능).",
  "- ELSE IF 인터넷/중소 신문사 AND 그 외 → rejected.",
  "인터넷/중소 신문사 맥락에서는 targetRoles의 기자 항목을 적용하지 않는다.",
];

const FEW_SHOT_ANNOUNCER = [
  'Example (approved): title=KBS 아나운서 공채, company=KBS → {"label":"approved","score":92,"reasons":["지상파 아나운서 공채","회사가 targetBroadcasters"],"matched_rules":["targetBroadcasters","targetRoles"]}',
  'Example (approved): title=취재기자 모집, company=JTV → {"label":"approved","score":78,"reasons":["지역방송사 취재기자","targetBroadcasters"],"matched_rules":["targetBroadcasters","broadcaster_reporter"]}',
  'Example (rejected): title=경제·금융 경력 기자, company=(주)뉴스포스트신문사 → {"label":"rejected","score":15,"reasons":["인터넷 신문사 기자직"],"matched_rules":["internet_newspaper_non_target_role"]}',
  'Example (rejected): title=채용 담당, company=○○일보 → {"label":"rejected","score":12,"reasons":["신문사 비대상 직무"],"matched_rules":["internet_newspaper_non_target_role"]}',
  'Example (pending-ish): title=아나운서 모집, company=○○신문사 → {"label":"approved","score":58,"reasons":["신문사이나 아나운서 직무"],"matched_rules":["targetRoleKeywords"]}',
  'Example (rejected): title=유튜브 전속 크리에이터, company=스타트업 → {"label":"rejected","score":18,"reasons":["유튜브 전용 채널 성격"],"matched_rules":["exclusionKeywords"]}',
  'Example (pending-ish): title=금융기관 라이브 진행, company=핀테크X → {"label":"rejected","score":52,"reasons":["은행·증권사 미특정"],"matched_rules":["financial_ambiguous"]}',
].join("\n");

export function buildSystemPrompt(source: string): string {
  if (source === JOB_FIT_INTERN_SOURCE) {
    return [
      "너는 방송아카데미 인턴 채용관의 1차 서류 큐레이터다.",
      `목표: 공고 제목·회사 등에 다음 키워드 중 하나 이상이 있을 때만 승인 후보로 본다: ${JOB_FIT_INTERN_ALLOWED_KEYWORDS.join(", ")}.`,
      "위 키워드가 하나도 없으면 rejected. 인턴 기자는 무조건 포함 후보.",
      "다른 채널(아나운서 큐레이터) 규칙은 적용하지 않는다.",
      "반드시 JSON으로만 응답하고, 불확실하면 보수적으로 낮은 점수를 준다.",
    ].join("\n");
  }

  return [
    "너는 방송아카데미 원장님의 채용 큐레이터다.",
    "목표: 공고가 아나운서/앵커/기상캐스터 중심인지 판단한다. company를 먼저 본다.",
    "승인 우선 대상: 지상파/종편/보도/지역/케이블 방송사 또는 동등 수준 미디어 기업의 관련 직무.",
    "제외: 인터넷/중소 신문사의 기자·취재 직무, 유튜브 전용 채널, 신뢰도 낮은 소형 에이전시.",
    ...PRIORITY_LINES,
    ...REPORTER_POLICY_LINES,
    ...FINANCIAL_POLICY_LINES,
    "반드시 JSON으로만 응답하고, 불확실하면 보수적으로 낮은 점수를 준다.",
  ].join("\n");
}

export function buildUserPrompt(job: {
  title: string;
  company: string | null;
  location: string | null;
  source: string;
  sourceUrl: string;
}): string {
  const commonHead = [
    job.source === JOB_FIT_INTERN_SOURCE
      ? "다음 공고를 인턴 채용관 기준으로 평가하라."
      : "다음 공고를 원장님 안목 기준으로 평가하라.",
    `title: ${job.title}`,
    `company: ${job.company ?? "unknown"}`,
    `location: ${job.location ?? "unknown"}`,
    `source: ${job.source}`,
    `sourceUrl: ${job.sourceUrl}`,
    "",
  ];

  if (job.source === JOB_FIT_INTERN_SOURCE) {
    return [
      ...commonHead,
      "인턴 판정 기준:",
      `allowedKeywords (title or company must contain at least one): ${JOB_FIT_INTERN_ALLOWED_KEYWORDS.join(", ")}`,
      "Note: many hard rejects may already be filtered server-side; still apply the same judgment if you see them.",
      "",
      "반드시 아래 JSON 스키마를 준수:",
      '{"label":"approved|rejected","score":0-100,"reasons":["..."],"matched_rules":["..."]}',
    ].join("\n");
  }

  return [
    ...commonHead,
    "판정 기준:",
    `targetRoles (방송사·일반 맥락; 신문사 맥락에서는 기자 미적용): ${JOB_FIT_RULES.targetRoles.join(", ")}`,
    `targetRoleKeywords (신문사 화이트리스트): ${JOB_FIT_TARGET_ROLE_KEYWORDS.join(", ")}`,
    `internetNewspaperCompanyMarkers: ${JOB_FIT_INTERNET_NEWSPAPER_COMPANY_MARKERS.join(", ")}`,
    `internetNewspaperCompanies: ${JOB_FIT_INTERNET_NEWSPAPER_EXCLUSION_COMPANIES.join(", ")}`,
    `targetBroadcasters (company substring match, case-insensitive Latin): ${JOB_FIT_RULES.targetBroadcasters.join(", ")}`,
    `positiveSignals (boost when present in title/company): ${JOB_FIT_POSITIVE_SIGNALS.join(", ")}`,
    `exclusionKeywords (soft / contextual): ${JOB_FIT_RULES.exclusionKeywords.join(", ")}`,
    "제목에 한경이 포함되면 승인 후보 신호로 보되, 위 차단·우선순위에 이미 걸리면 적용하지 않는다.",
    "",
    "참고 예시 (형식만 참고, 실제 입력은 위 블록):",
    FEW_SHOT_ANNOUNCER,
    "",
    "반드시 아래 JSON 스키마를 준수:",
    '{"label":"approved|rejected","score":0-100,"reasons":["..."],"matched_rules":["..."]}',
  ].join("\n");
}
