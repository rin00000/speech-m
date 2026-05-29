export const JOB_FIT_PROMPT_VERSION = "v2.9.1";

/** Major home-shopping companies: show-host roles may be approved only here. */
export const JOB_FIT_MAJOR_HOMESHOPPING_COMPANIES = [
  "CJ온스타일",
  "GS홈쇼핑",
  "GS shop",
  "gs홈쇼핑",
  "현대홈쇼핑",
  "롯데홈쇼핑",
  "NS홈쇼핑",
  "ns홈쇼핑",
  "홈앤쇼핑",
  "공영홈쇼핑",
  "공영쇼핑",
] as const;

/** Home-shopping context detection (reject non–show-host postings). */
export const JOB_FIT_HOMESHOPPING_DETECT_MARKERS = [
  "홈쇼핑",
  ...JOB_FIT_MAJOR_HOMESHOPPING_COMPANIES,
] as const;

/** @deprecated Use {@link JOB_FIT_HOMESHOPPING_DETECT_MARKERS}. */
export const JOB_FIT_HOMESHOPPING_MARKERS = JOB_FIT_HOMESHOPPING_DETECT_MARKERS;

export const JOB_FIT_HOMESHOPPING_APPROVE_ROLES = ["쇼호스트"] as const;

/** Title-only hard rejects before company/role approval gates. */
export const JOB_FIT_ALWAYS_REJECT_TITLE_KEYWORDS = [
  "시험방송",
  "라이브",
  "쇼핑몰",
  "셀러",
  "AD",
] as const;

/** Title markers that make the posting equivalent to a target broadcaster context. */
export const JOB_FIT_TARGET_BROADCASTER_TITLE_MARKERS = ["해양예보방송"] as const;

/** Video/production-field roles at broadcasters are out of scope and rejected. */
export const JOB_FIT_BROADCASTER_VIDEO_ROLE_KEYWORDS = [
  "VJ",
  "vj",
  "영상취재",
  "영상취재부",
  "ENG",
  "6mm",
  "카메라",
  "비디오",
  "video",
  "영상 편집",
  "영상편집",
] as const;

/** Canonical non-target roles at broadcasters: reject before broadcaster approval. */
export const JOB_FIT_BROADCASTER_NON_TARGET_ROLE_KEYWORDS = [
  "행정",
  "제작",
  "AD",
  "운전",
  "운전직",
  "차량",
  "촬영",
  "촬영보조",
  "카메라보조",
  "오디오맨",
  "장비관리",
  "취재보조",
  ...JOB_FIT_BROADCASTER_VIDEO_ROLE_KEYWORDS,
] as const;

/** At target broadcasters: non-target roles are always rejected (no HITL). */
export const JOB_FIT_BROADCASTER_REJECT_ROLE_KEYWORDS =
  JOB_FIT_BROADCASTER_NON_TARGET_ROLE_KEYWORDS;

/** @deprecated Video roles are now rejected, not held as pending. */
export const JOB_FIT_BROADCASTER_PENDING_ROLE_KEYWORDS =
  JOB_FIT_BROADCASTER_VIDEO_ROLE_KEYWORDS;

/** Auto exhibition / motor studio — docent roles may be in scope; defer to admin (pending). */
export const JOB_FIT_MOTOR_STUDIO_COMPANY_MARKERS = [
  "모터스튜디오",
  "현대 모터스튜디오",
  "motor studio",
] as const;

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
  "당진신문",
  "뉴스트리",
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
  "라이브커머스",
  "판매",
  "VJ",
  "영상취재",
] as const;

export const JOB_FIT_KEYWORD_HARD_EXCLUDE = ["유튜버", "강사"] as const;

export const JOB_FIT_TITLE_ENTERTAINMENT = "엔터테인먼트";

export const JOB_FIT_POSITIVE_SIGNALS = ["보도국", "진행", "생방송", "진행자", "mc"] as const;

/**
 * targetBroadcasters — company substring match (case-insensitive Latin).
 * Categories: terrestrial (KBS/MBC/SBS/EBS), regional commercial (KNN/TBC/…),
 * comprehensive (JTBC/연합뉴스TV/…), economy channels, cable SO/MSO, sports/religious.
 */
export const JOB_FIT_TARGET_BROADCASTERS = [
  // Terrestrial
  "KBS",
  "MBC",
  "SBS",
  "EBS",
  // Regional KBS/MBC (distinct names to limit false positives)
  "춘천MBC",
  "원주MBC",
  "MBC강원",
  "포항MBC",
  "안동MBC",
  "울산MBC",
  "MBC경남",
  "광주MBC",
  "제주MBC",
  "대구MBC",
  "MBC충북",
  "전주MBC",
  "전주문화방송",
  "여수MBC",
  "목포MBC",
  // Regional commercial
  "KNN",
  "KBC",
  "JTV",
  "G1",
  "JIBS",
  "TBC",
  "TJB",
  "CJB",
  "UBC",
  "ubc",
  "OBS",
  "경인방송",
  // Comprehensive / news
  "JTBC",
  "TV조선",
  "채널A",
  "MBN",
  "YTN",
  "연합뉴스TV",
  "연합뉴스",
  "뉴시스",
  "아리랑",
  "법률방송",
  // Economy channels
  "이데일리TV",
  "매일경제TV",
  "한국경제TV",
  "아시아경제방송",
  "내외경제TV",
  "서울경제TV",
  "팍스경제TV",
  "토마토TV",
  "MTN",
  "SBS biz",
  "머니투데이방송",
  // Cable SO / MSO
  "티브로드",
  "현대HCN",
  "LG헬로비전",
  "헬로비전",
  "CMB",
  "딜라이브",
  "에스케이브로드밴드",
  "마포케이블",
  "마포케이블TV",
  "제주KCTV",
  "KCN금강",
  "KCN금강방송",
  "서경방송",
  "SCS서경방송",
  "충북방송",
  "CCS충북방송",
  // Sports / other
  "KBSN",
  "SPOTV",
  "MBC sports",
  "SBS sports",
  "sbs 골프",
  "SBS골프",
  "TBN",
  "KTV",
  "GOOD TV",
  "CBS",
  "CTS",
  "BTN",
  "BBS",
  "CPBC",
  "cpbc",
  "극동방송",
  "불교방송",
  "불교TV",
  "기독교TV",
  "원음방송",
  "평화방송",
  "헬스조선"
] as const;

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
  targetBroadcasters: JOB_FIT_TARGET_BROADCASTERS,
  exclusionKeywords: [
    "유튜브 전용",
    "1인 미디어",
    "인플루언서",
    "소형 에이전시",
    "바이럴",
  ],
} as const;

export { buildSystemPrompt, buildUserPrompt } from "./prompts";
