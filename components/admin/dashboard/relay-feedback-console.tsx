"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FileEditIcon,
  PlayIcon,
  PauseIcon,
  CheckmarkCircle01Icon,
  VolumeHighIcon,
  UserGroupIcon
} from "@hugeicons/core-free-icons";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StudentSubmission {
  id: string;
  name: string;
  class: string;
  fileName: string;
  duration: string;
  submittedAt: string;
  defaultFeedback: string;
  status: "pending" | "completed";
}

const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    id: "stud_1",
    name: "김서현 준비생",
    class: "KBS 9시 뉴스 앵커 대비반",
    fileName: "news_practice_kbs_05.mp3",
    duration: "02:14",
    submittedAt: "2시간 전",
    defaultFeedback: "오프닝 멘트의 톤이 매우 신뢰감 있게 보강되었습니다. 다만, 3번째 줄 수치 정보(백만 원 등) 낭독 시 긴장으로 인해 끝음을 살짝 올리는 습관이 아직 남아있으니 이 부분을 플랫하게 내려주는 연습이 필요합니다.",
    status: "pending",
  },
  {
    id: "stud_2",
    name: "이지민 준비생",
    class: "MBC 기상캐스터 특별 대비반",
    fileName: "weather_practice_mbc_02.mp3",
    duration: "01:45",
    submittedAt: "5시간 전",
    defaultFeedback: "전반적인 발랄함과 청량한 음색 전달력이 훌륭합니다. 다만 고기압, 저기압 등의 정보 전달 시 제스처와 목소리 강세가 맞지 않는 부분이 있어 자연스럽게 싱크하는 연습이 핵심입니다.",
    status: "pending",
  },
  {
    id: "stud_3",
    name: "박찬우 준비생",
    class: "SBS 스포츠 캐스터 종합반",
    fileName: "sports_practice_sbs_09.mp3",
    duration: "03:02",
    submittedAt: "1일 전",
    defaultFeedback: "샤우팅 발성 단계에서의 목소리 긁힘이 저번 주보다 많이 줄어들어 목 관리가 잘 되고 있어 고무적입니다. 오프닝 콜 부분에서 0.5초만 템포를 늦춰 중계 신뢰감을 극대화해 보시길 권장합니다.",
    status: "completed",
  },
];

export function RelayFeedbackConsole() {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(INITIAL_SUBMISSIONS);
  const [selectedId, setSelectedId] = useState<string>("stud_1");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const currentStudent = submissions.find((s) => s.id === selectedId) || submissions[0];

  const selectStudent = (id: string) => {
    const student = submissions.find((s) => s.id === id) ?? submissions[0];
    setSelectedId(id);
    setFeedbackText(student.defaultFeedback);
    setIsPlaying(false);
    setCurrentTime(0);
    setSubmitSuccess(false);
  };

  // Audio timer simulator
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const [min, sec] = currentStudent.duration.split(":").map(Number);
          const maxSec = min * 60 + sec;
          if (prev >= maxSec) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStudent]);

  const formatTime = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleSendFeedback = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Update submission status in list
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selectedId ? { ...s, status: "completed", defaultFeedback: feedbackText } : s))
      );

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 4000);
    }, 1200);
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-periwinkle-100 text-periwinkle-700">
            <HugeiconsIcon icon={UserGroupIcon} size={15} color="currentColor" strokeWidth={2} />
          </span>
          <div>
            <CardTitle className="text-sm font-extrabold text-gray-800">1:1 릴레이 피드백 콘솔</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              수강생들의 실기 음성 과제를 듣고 맞춤 원장 멘토링 코멘트를 발송합니다
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardBody className="pt-4 grid gap-6 md:grid-cols-[1fr_1.4fr]">
        
        {/* Left column: Student queue list */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">제출 대기 대열</h4>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
            {submissions.map((stud) => {
              const isSelected = stud.id === selectedId;
              return (
                <button
                  key={stud.id}
                  onClick={() => selectStudent(stud.id)}
                  className={`w-full text-left p-2.5 rounded-2xl border transition-all duration-200 flex items-center gap-3 ${
                    isSelected
                      ? "border-periwinkle-300 bg-periwinkle-50/60 ring-2 ring-periwinkle-100/50"
                      : "border-gray-150 bg-white hover:bg-gray-50/60"
                  }`}
                >
                  <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-extrabold border ${
                    isSelected
                      ? "bg-periwinkle-600 text-white border-periwinkle-700 shadow-sm"
                      : "bg-periwinkle-50 text-periwinkle-700 border-periwinkle-100"
                  }`}>
                    {getInitials(stud.name)}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-gray-800 truncate">{stud.name}</span>
                      {stud.status === "completed" ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
                          완료
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 border border-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700 animate-pulse">
                          대기
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 block truncate mt-0.5">{stud.class}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Audio player & comment area */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Active Student Title */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-gray-800">{currentStudent.name}</span>
                <span className="text-[10px] text-gray-400">· {currentStudent.submittedAt} 제출</span>
              </div>
              <p className="text-[10px] font-semibold text-periwinkle-600 mt-0.5">{currentStudent.class}</p>
            </div>

            {/* Audio Wave Player Box */}
            <div className="p-3.5 rounded-2xl border border-gray-150 bg-gray-50/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400 shrink-0">
                    <HugeiconsIcon icon={VolumeHighIcon} size={14} color="currentColor" />
                  </span>
                  <p className="text-xs font-extrabold text-gray-700 truncate" title={currentStudent.fileName}>
                    {currentStudent.fileName}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-gray-500">
                  {formatTime(currentTime)} / {currentStudent.duration}
                </span>
              </div>

              {/* Wave equalizer animation / mock timeline */}
              <div className="flex items-center justify-between gap-1 h-7 pt-1 px-1">
                {Array.from({ length: 28 }).map((_, idx) => {
                  // Simulate wave heights based on playing status
                  const randomHeight = isPlaying 
                    ? Math.max(10, Math.floor(Math.sin((idx + currentTime) * 0.8) * 12 + 16))
                    : 8;
                  
                  return (
                    <div
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isPlaying ? "bg-periwinkle-600" : "bg-gray-300"
                      }`}
                      style={{ height: `${randomHeight}px` }}
                    />
                  );
                })}
              </div>

              {/* Audio Controls */}
              <div className="flex items-center justify-center pt-1.5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-8 w-8 rounded-full bg-periwinkle-600 text-white flex items-center justify-center hover:bg-periwinkle-700 shadow-sm transition-all duration-300 hover:scale-105"
                >
                  <HugeiconsIcon
                    icon={isPlaying ? PauseIcon : PlayIcon}
                    size={13}
                    color="white"
                    strokeWidth={3}
                  />
                </button>
              </div>
            </div>

            {/* Textarea comment */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-extrabold text-gray-400 flex items-center gap-1">
                  <HugeiconsIcon icon={FileEditIcon} size={11} color="currentColor" />
                  원장 1:1 멘토링 코멘트
                </label>
                <span className="text-[9px] text-gray-400">{feedbackText.length}자</span>
              </div>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-periwinkle-500/30 font-medium text-gray-700 leading-normal"
                rows={3.5}
                placeholder="과제 낭독에 대한 구체적인 피드백을 남겨주세요..."
              />
            </div>
          </div>

          {/* Action button */}
          <div className="space-y-2 pt-2">
            {submitSuccess ? (
              <div className="p-2.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} color="currentColor" strokeWidth={2.5} />
                피드백이 전송되었습니다! 실시간 카카오톡 알림이 완료되었습니다.
              </div>
            ) : (
              <Button
                onClick={handleSendFeedback}
                disabled={isSubmitting || !feedbackText.trim()}
                className="w-full text-xs font-bold py-2.5 rounded-full bg-periwinkle-600 hover:bg-periwinkle-700 text-white shadow-sm flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? "피드백 발송 중..." : "1:1 피드백 코멘트 전송 완료"}
              </Button>
            )}
          </div>
        </div>

      </CardBody>
    </Card>
  );
}
