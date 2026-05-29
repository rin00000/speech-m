import { describe, expect, it } from "vitest";
import {
  buildRelayQuestState,
  canViewStudy,
  validateStudyAudioFileMeta,
  type RelaySubmission,
  type StudyMember,
} from "./relay";

const members: StudyMember[] = [
  { email: "a@speech-m.com", displayName: "A", displayOrder: 1 },
  { email: "b@speech-m.com", displayName: "B", displayOrder: 2 },
  { email: "c@speech-m.com", displayName: "C", displayOrder: 3 },
];

function submission(
  sequenceNumber: number,
  studentEmail: string,
  feedback?: { authorEmail: string; comment: string },
): RelaySubmission {
  const id = `sub-${sequenceNumber}`;
  return {
    id,
    questId: "quest-1",
    studentEmail,
    studentName: studentEmail,
    audioPath: `relay/quest-1/${studentEmail}/${id}.mp3`,
    audioUrl: null,
    audioFileName: `${id}.mp3`,
    audioContentType: "audio/mpeg",
    audioSizeBytes: 1024,
    sequenceNumber,
    submittedAt: "2026-05-28T00:00:00.000Z",
    audioDeletedAt: null,
    feedback: feedback
      ? {
          id: `fb-${sequenceNumber}`,
          submissionId: id,
          authorEmail: feedback.authorEmail,
          authorName: feedback.authorEmail,
          comment: feedback.comment,
          createdAt: "2026-05-28T00:00:00.000Z",
        }
      : null,
  };
}

describe("buildRelayQuestState", () => {
  it("allows a member to start before the first upload", () => {
    const state = buildRelayQuestState({
      members,
      submissions: [],
      currentUserEmail: "a@speech-m.com",
      questStatus: "open",
    });

    expect(state.status).toBe("not_started");
    expect(state.canStart).toBe(true);
    expect(state.unsubmittedMembers).toHaveLength(3);
  });

  it("allows an unsubmitted student to feedback and upload during the chain", () => {
    const state = buildRelayQuestState({
      members,
      submissions: [submission(1, "a@speech-m.com")],
      currentUserEmail: "b@speech-m.com",
      questStatus: "open",
    });

    expect(state.status).toBe("waiting_feedback");
    expect(state.pendingSubmission?.studentEmail).toBe("a@speech-m.com");
    expect(state.canFeedbackAndUpload).toBe(true);
  });

  it("waits for the first uploader to close the circular final feedback", () => {
    const state = buildRelayQuestState({
      members,
      submissions: [
        submission(1, "a@speech-m.com", { authorEmail: "b@speech-m.com", comment: "좋아요" }),
        submission(2, "b@speech-m.com", { authorEmail: "c@speech-m.com", comment: "좋아요" }),
        submission(3, "c@speech-m.com"),
      ],
      currentUserEmail: "a@speech-m.com",
      questStatus: "open",
    });

    expect(state.status).toBe("waiting_final_feedback");
    expect(state.canFinalFeedback).toBe(true);
    expect(state.canFeedbackAndUpload).toBe(false);
  });

  it("marks the relay completed after every submission has feedback", () => {
    const state = buildRelayQuestState({
      members,
      submissions: [
        submission(1, "a@speech-m.com", { authorEmail: "b@speech-m.com", comment: "좋아요" }),
        submission(2, "b@speech-m.com", { authorEmail: "c@speech-m.com", comment: "좋아요" }),
        submission(3, "c@speech-m.com", { authorEmail: "a@speech-m.com", comment: "좋아요" }),
      ],
      currentUserEmail: "a@speech-m.com",
      questStatus: "closed",
    });

    expect(state.status).toBe("completed");
    expect(state.isComplete).toBe(true);
    expect(state.unsubmittedMembers).toHaveLength(0);
  });
});

describe("study permissions and audio policy", () => {
  it("allows only admins or group members to view a study", () => {
    expect(
      canViewStudy({
        viewer: { role: "admin", email: "owner@speech-m.com" },
        memberEmails: [],
      }),
    ).toBe(true);
    expect(
      canViewStudy({
        viewer: { role: "student", email: "a@speech-m.com" },
        memberEmails: ["a@speech-m.com"],
      }),
    ).toBe(true);
    expect(
      canViewStudy({
        viewer: { role: "student", email: "x@speech-m.com" },
        memberEmails: ["a@speech-m.com"],
      }),
    ).toBe(false);
  });

  it("accepts supported audio under 20MB and rejects unsupported files", () => {
    expect(
      validateStudyAudioFileMeta({
        fileName: "news.m4a",
        sizeBytes: 1024,
        contentType: "audio/x-m4a",
      }).ok,
    ).toBe(true);
    expect(
      validateStudyAudioFileMeta({
        fileName: "news.mov",
        sizeBytes: 1024,
        contentType: "video/quicktime",
      }).ok,
    ).toBe(false);
    expect(
      validateStudyAudioFileMeta({
        fileName: "news.mp3",
        sizeBytes: 21 * 1024 * 1024,
        contentType: "audio/mpeg",
      }).ok,
    ).toBe(false);
  });
});
