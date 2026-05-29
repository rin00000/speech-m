/**
 * AI job-fit 정책 프롬프트 생성기.
 * 규칙 상수 파일과 프롬프트 문장 조립을 분리해 정책 데이터 변경 범위를 줄인다.
 */

import {
  JOB_FIT_ALWAYS_REJECT_TITLE_KEYWORDS,
  JOB_FIT_BROADCASTER_NON_TARGET_ROLE_KEYWORDS,
  JOB_FIT_BROADCASTER_PENDING_ROLE_KEYWORDS,
  JOB_FIT_HOMESHOPPING_DETECT_MARKERS,
  JOB_FIT_INTERN_ALLOWED_KEYWORDS,
  JOB_FIT_INTERN_SOURCE,
  JOB_FIT_INTERNET_NEWSPAPER_COMPANY_MARKERS,
  JOB_FIT_INTERNET_NEWSPAPER_EXCLUSION_COMPANIES,
  JOB_FIT_MAJOR_HOMESHOPPING_COMPANIES,
  JOB_FIT_MOTOR_STUDIO_COMPANY_MARKERS,
  JOB_FIT_POSITIVE_SIGNALS,
  JOB_FIT_RULES,
  JOB_FIT_TARGET_BROADCASTER_TITLE_MARKERS,
  JOB_FIT_TARGET_ROLE_KEYWORDS,
} from "./rules";

const FINANCIAL_POLICY_LINES = [
  "금융기관 관련: 시중은행·증권사가 공고에 구체적으로 드러나면 포함 후보. 금융기관만 광의로 쓰이고 은행·증권사가 특정되지 않으면 제외 쪽.",
  "금융기관 라이브 등 title에 alwaysRejectTitleKeywords가 있으면 애매함 없이 rejected.",
];

const PRIORITY_LINES = [
  "### [규칙 우선순위 (매우 중요)]",
  "1. [블랙리스트 최우선]: blocklist·유튜버/강사·엔터테인먼트·alwaysRejectTitleKeywords → 직무/회사 불문 rejected.",
  "2. [제목 방송사명]: company 또는 title에 targetBroadcasters 명칭이 있거나 title에 해양예보방송 등 targetBroadcasterTitleMarkers가 있으면 방송사 맥락으로 본다.",
  "3. [홈쇼핑 특례]: 홈쇼핑 마커인데 제목에 쇼호스트 없음 → rejected.",
  "3b. [쇼호스트 한정]: 제목에 쇼호스트 → company가 majorHomeshoppingCompanies에만 approved; 지역·케이블 방송사 등 그 외 rejected.",
  "3c. [인턴기자 한정]: 제목에 인턴기자(인턴+기자) → company ∈ targetBroadcasters에만 approved; 비방송사 rejected.",
  "4. [모터스튜디오 도슨트 보류]: company/title에 모터스튜디오·motor studio 등 자동차 전시관 → approved/rejected 즉시 확정 금지, score 45~59(rejected 라벨 가능) → pending, 원장님 HITL.",
  "5. [방송사 비대상 직무 제외]: 방송사 맥락 AND 제목에 행정·제작·AD·운전·차량·촬영·카메라·영상취재·ENG·취재보조 등 nonTargetRoleKeywords → rejected (HITL 없음).",
  "6. [방송사 승인]: 방송사 맥락 AND 제목에 targetRoles(쇼호스트 제외) → approved. 취재기자는 방송사 맥락이면 승인. 직무 없으면 자동 승인하지 않음.",
  "7. [비방송사]: exclusionKeywords → rejected. 신문사·인턴기자·금융 등 하위 규칙 적용.",
];

const REPORTER_POLICY_LINES = [
  "- [기자·취재 직무 분기]:",
  "  * title에 인턴+기자(인턴 기자·인턴기자) AND company ∈ targetBroadcasters → 승인.",
  "  * source가 mediajob_intern → company ∈ targetBroadcasters 필수; 비방송사 rejected.",
  "  * mediajob_intern AND title/company에 기자·아나운서·리포터 AND targetBroadcasters → 승인 후보.",
  "  * 인터넷/중소 신문사 AND title에 취재/기자 중심 직무 → rejected.",
  "  * 인터넷/중소 신문사 AND title에 targetRoleKeywords → 평가(approved/pending 가능).",
  "인터넷/중소 신문사 맥락에서는 targetRoles의 기자 항목을 적용하지 않는다.",
];

const FEW_SHOT_ANNOUNCER = [
  'Example (approved): title=KBS 아나운서 공채, company=KBS → {"label":"approved","score":92,"reasons":["지상파 아나운서 공채","회사가 target_broadcasters"],"matched_rules":["target_broadcasters","target_roles"]}',
  'Example (approved): title=2026년 전주MBC 방송기술, 취재기자 공개채용, company=전주문화방송 → {"label":"approved","score":85,"reasons":["타이틀 또는 회사가 target_broadcasters","취재기자 직무"],"matched_rules":["target_broadcasters","target_roles"]}',
  'Example (approved): title=헬스조선 취재팀 인턴 기자 채용, company=㈜헬스조선 → {"label":"approved","score":72,"reasons":["타겟 방송사 인턴기자"],"matched_rules":["intern_reporter_title","target_broadcasters"]}',
  'Example (rejected): title=뉴스트리 채용연계형 인턴기자 모집, company=(주)뉴스트리 → {"label":"rejected","score":8,"reasons":["blocklist company"],"matched_rules":["blocklist_company"]}',
  'Example (rejected): title=2026년 공영홈쇼핑 NCS 블라인드 채용, company=공영홈쇼핑 → {"label":"rejected","score":15,"reasons":["홈쇼핑은 쇼호스트만"],"matched_rules":["homeshopping_non_showhost"]}',
  'Example (rejected): title=행정직 채용, company=KBS → {"label":"rejected","score":12,"reasons":["방송사이나 비대상 직무"],"matched_rules":["broadcaster_non_target_role"]}',
  'Example (rejected): title=[VJ/취재기자] 영상취재부/VJ/카메라, company=연합뉴스TV → {"label":"rejected","score":12,"reasons":["방송사이나 VJ·영상취재 직무"],"matched_rules":["broadcaster_non_target_role"]}',
  'Example (rejected): title=영상 편집 PD 채용, company=연합뉴스TV → {"label":"rejected","score":12,"reasons":["방송사이나 영상·편집 직무"],"matched_rules":["broadcaster_non_target_role"]}',
  'Example (approved): title=해양예보방송 해양캐스터 모집, company=㈜올포랜드 → {"label":"approved","score":85,"reasons":["해양예보방송 제목 마커","캐스터 직무"],"matched_rules":["target_broadcaster_title_marker","target_roles"]}',
  'Example (rejected): title=6/13) 창원, 시험방송, company=꿈을Dream → {"label":"rejected","score":10,"reasons":["Title hard reject keyword matched: 시험방송"],"matched_rules":["always_reject_title_keyword"]}',
  'Example (pending-ish): title=도슨트(진행자) 채용, company=현대 모터스튜디오 → {"label":"rejected","score":52,"reasons":["자동차 전시관 도슨트 가능성","HITL"],"matched_rules":["motor_studio_docent_pending"]}',
  'Example (rejected): title=쇼호스트 신입, company=KNN → {"label":"rejected","score":15,"reasons":["쇼호스트는 대형 홈쇼핑만"],"matched_rules":["showhost_not_major_homeshopping"]}',
  'Example (approved): title=쇼호스트 신입, company=㈜공영홈쇼핑 → {"label":"approved","score":88,"reasons":["대형 홈쇼핑 쇼호스트"],"matched_rules":["major_homeshopping_showhost"]}',
  'Example (approved): title=취재기자 모집, company=JTV → {"label":"approved","score":85,"reasons":["target broadcasters and role"],"matched_rules":["target_broadcasters","target_roles"]}',
  'Example (rejected): title=경제·금융 경력 기자, company=(주)뉴스포스트신문사 → {"label":"rejected","score":15,"reasons":["인터넷 신문사 기자직"],"matched_rules":["internet_newspaper_non_target_role"]}',
  'Example (rejected): title=채용 담당, company=○○일보 → {"label":"rejected","score":12,"reasons":["신문사 비대상 직무"],"matched_rules":["internet_newspaper_non_target_role"]}',
  'Example (pending-ish): title=아나운서 모집, company=○○신문사 → {"label":"approved","score":58,"reasons":["신문사이나 아나운서 직무"],"matched_rules":["target_role_keywords"]}',
  'Example (rejected): title=유튜브 전속 크리에이터, company=스타트업 → {"label":"rejected","score":18,"reasons":["Exclusion keyword matched: 유튜브 전용"],"matched_rules":["exclusion_keywords"]}',
  'Example (pending-ish): title=금융기관 라이브 진행, company=핀테크X → {"label":"rejected","score":52,"reasons":["은행·증권사 미특정"],"matched_rules":["financial_ambiguous"]}',
].join("\n");

export function buildSystemPrompt(source: string): string {
  if (source === JOB_FIT_INTERN_SOURCE) {
    return [
      "너는 방송아카데미 인턴 채용관의 1차 서류 큐레이터다.",
      `목표: 공고 제목·회사 등에 다음 키워드 중 하나 이상이 있을 때만 승인 후보로 본다: ${JOB_FIT_INTERN_ALLOWED_KEYWORDS.join(", ")}.`,
      "위 키워드가 하나도 없으면 rejected. company가 targetBroadcasters(지상파·지역·케이블 방송사 등)에 해당할 때만 승인 후보.",
      "다른 채널(아나운서 큐레이터) 규칙은 적용하지 않는다.",
      "반드시 JSON으로만 응답하고, 불확실하면 보수적으로 score 45~59를 준다.",
    ].join("\n");
  }

  return [
    "너는 방송아카데미 원장님의 채용 큐레이터다.",
    "목표: 공고가 아나운서/앵커/기상캐스터/방송사 취재기자 중심인지 판단한다. company와 title의 방송사명을 함께 본다.",
    "승인 우선 대상: 지상파/종편/보도/지역/케이블 방송사 또는 동등 수준 미디어 기업의 관련 직무.",
    "제외: 인터넷/중소 신문사의 기자·취재 직무, 유튜브 전용 채널, 신뢰도 낮은 소형 에이전시.",
    ...PRIORITY_LINES,
    ...REPORTER_POLICY_LINES,
    ...FINANCIAL_POLICY_LINES,
    "반드시 JSON으로만 응답하고, 불확실하면 보수적으로 score 45~59를 주어 pending으로 유도하라.",
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
    `homeshoppingDetectMarkers (비쇼호스트 거절): ${JOB_FIT_HOMESHOPPING_DETECT_MARKERS.join(", ")}`,
    `majorHomeshoppingCompanies (쇼호스트 승인 화이트리스트): ${JOB_FIT_MAJOR_HOMESHOPPING_COMPANIES.join(", ")}`,
    `alwaysRejectTitleKeywords (제목에 있으면 무조건 rejected): ${JOB_FIT_ALWAYS_REJECT_TITLE_KEYWORDS.join(", ")}`,
    `targetBroadcasterTitleMarkers (제목에 있으면 targetBroadcasters 맥락): ${JOB_FIT_TARGET_BROADCASTER_TITLE_MARKERS.join(", ")}`,
    `broadcasterNonTargetRoles (방송사인데 무조건 rejected): ${JOB_FIT_BROADCASTER_NON_TARGET_ROLE_KEYWORDS.join(", ")}`,
    `broadcasterPendingRolesDeprecated (이제 HITL 아님, rejected): ${JOB_FIT_BROADCASTER_PENDING_ROLE_KEYWORDS.join(", ")}`,
    `motorStudioMarkers (전시관·도슨트 HITL, score 45~59): ${JOB_FIT_MOTOR_STUDIO_COMPANY_MARKERS.join(", ")}`,
    `targetBroadcasters (company/title substring match, case-insensitive Latin): ${JOB_FIT_RULES.targetBroadcasters.join(", ")}`,
    `positiveSignals (boost when present in title/company): ${JOB_FIT_POSITIVE_SIGNALS.join(", ")}`,
    `exclusionKeywords (hard / deterministic when company not in targetBroadcasters): ${JOB_FIT_RULES.exclusionKeywords.join(", ")}`,
    "제목에 한경이 포함되면 승인 후보 신호로 보되, 위 차단·우선순위에 이미 걸리면 적용하지 않는다.",
    "",
    "참고 예시 (형식만 참고, 실제 입력은 위 블록):",
    FEW_SHOT_ANNOUNCER,
    "",
    "반드시 아래 JSON 스키마를 준수:",
    '{"label":"approved|rejected","score":0-100,"reasons":["..."],"matched_rules":["..."]}',
  ].join("\n");
}
