import { getCurrentUser } from "@/lib/auth/session";
import { Header } from "@/components/admin/layout/header";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  SparklesIcon,
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { PracticeListView } from "./practice-list-view";

// 고품질 방송 원고 더미 데이터 정의
export interface ScriptItem {
  id: string;
  title: string;
  category: "practice" | "portfolio";
  type: string; // '뉴스', '기상캐스터', '라디오', '시황' 등
  difficulty: "쉬움" | "보통" | "어려움";
  length: number; // 글자 수
  description: string;
  content: string;
}

const DUMMY_SCRIPTS: ScriptItem[] = [
  {
    id: "script-1",
    title: "KBS 정오 뉴스 - 수도권 집중호우 및 교통 상황 속보",
    category: "practice",
    type: "뉴스 대본",
    difficulty: "보통",
    length: 310,
    description: "발음이 꼬이기 쉬운 이중 모음과 숫자가 조화롭게 배치된 정통 데스크 뉴스 연습용 대본입니다.",
    content: `시청자 여러분 안녕하십니까. 정오 뉴스 속보입니다.

오늘 오전 서울을 비롯한 수도권 전역에 시간당 50mm가 넘는 집중호우가 쏟아지면서 도로 곳곳이 통제되고 지하철 운행이 지연되고 있습니다.

특히 한강 수위 상승으로 인해 올림픽대로 여의상류 나들목과 동부간선도로 전 구간이 오전 11시를 기해 양방향 전면 통제됐습니다.

기상청은 내일 새벽까지 중부 지방을 중심으로 최대 150mm의 비가 더 내릴 것으로 예보하고, 시민들께서는 대중교통을 이용하고 상습 침수 구역의 접근을 자제해 달라고 당부했습니다.

지금까지 서울 잠수교에서 Speech-M 뉴스 김민준입니다.`,
  },
  {
    id: "script-2",
    title: "MBC 기상정보 - 때 이른 초여름 더위, 자외선 주의보",
    category: "practice",
    type: "기상캐스터",
    difficulty: "쉬움",
    length: 225,
    description: "경쾌하고 맑은 톤앤매너로 계절감과 온도 변화를 전달해야 하는 표준 기상캐스터 리포팅입니다.",
    content: `기분 좋은 바람이 불어오던 봄날도 잠시, 오늘은 전국이 30도 안팎까지 오르며 한여름 못지않게 무척 덥겠습니다.

현재 서울의 기온은 28.5도, 대구는 31.2도까지 가파르게 치솟아 예년 이맘때 기온을 5도 이상 웃돌고 있는데요.

여기에 볕이 강하게 내리쬐면서 전국 대부분 지역의 자외선 지수 '매우 높음' 단계까지 오르겠습니다. 외출하실 때는 자외선 차단제를 꼼꼼히 바르시고 모자나 선글라스를 꼭 챙기시기 바랍니다.

더위는 내일 전국에 한차례 비가 내리면서 한풀 꺾일 전망입니다.

지금까지 상암 하늘공원에서 날씨 전해드렸습니다.`,
  },
  {
    id: "script-3",
    title: "SBS 모닝 라디오 오프닝 - '어떤 하루의 온기'",
    category: "practice",
    type: "라디오 DJ",
    difficulty: "보통",
    length: 280,
    description: "잔잔하고 부드러운 중저음 톤과 호흡 조절, 공감 능력을 극대화할 수 있는 라디오 감성 대본입니다.",
    content: `차가운 아침 공기 속에 문득 스쳐 가는 온기가 참 소중하게 느껴지는 계절입니다.

차가워진 손끝을 녹여주는 따뜻한 찻잔처럼, 오늘 아침 여러분의 마음에 잔잔한 여유 한 조각을 전해드리고 싶어집니다.

치열하게 흘러가는 매일의 일상 속에서 오늘 하루만큼은 나 자신에게 '오늘도 참 잘 해내고 있다'는 다정한 인사를 건네보는 건 어떨까요?

여러분의 포근한 아침을 열어주는 음악, 지금 시작합니다.

Speech-M 아침의 온도, 저는 DJ 이서현입니다.`,
  },
  {
    id: "script-4",
    title: "YTN 경제 브리핑 - 코스피, 미 금리 인하 기대감에 폭등 마감",
    category: "portfolio",
    type: "경제 시황",
    difficulty: "어려움",
    length: 345,
    description: "빠르고 정확한 정보 전달력이 필요한 금융 시황 포트폴리오용 신뢰감을 주는 명품 원고입니다.",
    content: `다음은 증시 시황입니다.

오늘 우리 주식시장은 미국 연방준비제도의 금리 인하 속도 조절 기대감과 외국인 투자자들의 대규모 매수세에 힘입어 2% 넘게 폭등하며 장을 마쳤습니다.

오늘 코스피 지수는 어제보다 58.42포인트, 2.34% 급등한 2,558.12로 종가를 기록했으며, 코스닥 지수 역시 기술주 강세 속에 18.91포인트 오른 865.20으로 장을 마감했습니다.

특히 반도체 대장주인 삼성전자와 SK하이닉스가 각각 3.5%, 5.1% 급등하며 상승세를 주도했고, 원달러 환율은 어제보다 14원 50전 급락한 1,320원 10전에 마감됐습니다.

금융 전문가들은 미국 연준의 FOMC 회의 결과를 앞두고 변동성이 일시적으로 확대될 수 있으나 IT 성장주 중심의 온기가 지속될 것으로 분석했습니다.

지금까지 한국거래소에서 Speech-M 경제 김태호입니다.`,
  },
  {
    id: "script-5",
    title: "JTBC 뉴스포커스 - AI 혁명과 인류의 미래, 심층 리포트",
    category: "portfolio",
    type: "심층 리포트",
    difficulty: "어려움",
    length: 420,
    description: "정확한 딕션과 진중한 음색으로 신뢰성을 심어주어야 하는 정통 고난도 포트폴리오 원고입니다.",
    content: `최근 인공지능 기술이 인간의 전유물로 여겨졌던 창작과 고차원적 논리 영역까지 넘나들며 우리 일상을 통째로 바꾸고 있습니다.

초거대 생성형 AI의 등장은 업무 효율을 극대화한다는 찬사 뒤편으로, 대규모 일자리 감소와 지적 재산권 침해라는 깊은 그늘을 동시에 던지고 있는데요.

전문가들은 이제 인공지능을 단순한 기술적 혁신으로만 볼 것이 아니라, 인간과의 상생을 위한 윤리적 안전핀과 제도적 기틀을 빠르게 마련해야 할 시점이라고 입을 모읍니다.

기계가 인간처럼 생각하기 시작한 오늘날, 역설적으로 '인간다운 가치'란 과연 무엇인가에 대한 본질적인 물음이 깊어지고 있습니다.

Speech-M 심층기획 최지원입니다.`,
  },
];

export default async function PracticePage() {
  const user = await getCurrentUser();
  const isAuthorized = user && (user.role === "admin" || user.role === "student");

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="수강생 명품 원고 연습실"
        description="최정상 아나운서 및 미디어 선배들의 안목으로 정제된 핵심 훈련 및 포트폴리오용 대본입니다."
      />

      {isAuthorized ? (
        <div className="flex-1 p-6">
          <PracticeListView scripts={DUMMY_SCRIPTS} />
        </div>
      ) : (
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-periwinkle-50/20">
          <div className="max-w-md w-full rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-periwinkle-100/50 blur-2xl" />
            
            <span className="relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-full bg-periwinkle-50 text-periwinkle-600 mb-6 shadow-sm">
              <HugeiconsIcon icon={LockIcon} size={28} color="currentColor" strokeWidth={1.8} />
            </span>

            <h2 className="relative z-10 text-xl font-extrabold text-gray-900 tracking-tight">
              정회원 수강생 전용 공간입니다
            </h2>
            <p className="mt-3 text-sm font-medium text-gray-500 leading-relaxed">
              본 화면은 Speech-M 아카데미에 등록하고 원장님께 **'수강생(student)'** 권한을 부여받은 정회원분들만 접근할 수 있는 프리미엄 공간입니다.
            </p>

            <div className="mt-8 space-y-3.5 text-left border-t border-gray-100 pt-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">정회원 수강생 혜택</h4>
              <div className="flex items-start gap-2.5 text-xs text-gray-700">
                <span className="text-emerald-500 shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" />
                </span>
                <span className="font-semibold">엄선된 고품질 방송 연습 원고 무제한 이용</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-gray-700">
                <span className="text-emerald-500 shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" />
                </span>
                <span className="font-semibold">실제 방송 시험 대비 최고급 포트폴리오 대본 제공</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-gray-700">
                <span className="text-emerald-500 shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" />
                </span>
                <span className="font-semibold">현직 강사진의 1:1 디테일 릴레이 피드백 수령</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-all active:scale-[0.98] hover:bg-periwinkle-700 hover:shadow-lg"
                >
                  <span>수강생 등업 신청 대기실로 이동</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-all active:scale-[0.98] hover:bg-periwinkle-700 hover:shadow-lg"
                >
                  <span>1초 로그인 후 수강생 권한 문의</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" />
                </Link>
              )}
              <Link
                href="/jobs"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200"
              >
                공개 채용 공고 열람실로 가기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
