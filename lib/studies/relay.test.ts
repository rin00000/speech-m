import { describe, expect, it } from "vitest";
import {
  buildRelayQuestState,
  canViewStudy,
  validateStudyAudioFileMeta,
  type RelaySubmission,
  type StudyMember,
} from "./relay";

const members: StudyMember[] = [
  { userId: "user-a", email: "a@speech-m.com", displayName: "A", displayOrder: 1 },
  { userId: "user-b", email: "b@speech-m.com", displayName: "B", displayOrder: 2 },
  { userId: "user-c", email: "c@speech-m.com", displayName: "C", displayOrder: 3 },
];

function submission(
  sequenceNumber: number,
  studentUserId: string,
  feedback?: { authorUserId: string; comment: string }
): RelaySubmission {
  const id = `sub-${sequenceNumber}`;
  return {
    id,
    questId: "quest-1",
    studentUserId,
    studentEmail: `${studentUserId}@speech-m.test`,
    studentName: studentUserId,
    audioPath: `relay/quest-1/${studentUserId}/${id}.mp3`,
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
          authorUserId: feedback.authorUserId,
          authorEmail: `${feedback.authorUserId}@speech-m.test`,
          authorName: feedback.authorUserId,
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
      currentUserId: "user-a",
      questStatus: "open",
    });

    expect(state.status).toBe("not_started");
    expect(state.canStart).toBe(true);
    expect(state.unsubmittedMembers).toHaveLength(3);
  });

  it("allows an unsubmitted student to feedback and upload during the chain", () => {
    const state = buildRelayQuestState({
      members,
      submissions: [submission(1, "user-a")],
      currentUserId: "user-b",
      questStatus: "open",
    });

    expect(state.status).toBe("waiting_feedback");
    expect(state.pendingSubmission?.studentUserId).toBe("user-a");
    expect(state.canFeedbackAndUpload).toBe(true);
  });

  it("waits for the first uploader to close the circular final feedback", () => {
    const state = buildRelayQuestState({
      members,
      submissions: [
        submission(1, "user-a", { authorUserId: "user-b", comment: "좋아요" }),
        submission(2, "user-b", { authorUserId: "user-c", comment: "좋아요" }),
        submission(3, "user-c"),
      ],
      currentUserId: "user-a",
      questStatus: "open",
    });

    expect(state.status).toBe("waiting_final_feedback");
    expect(state.canFinalFeedback).toBe(true);
    expect(state.canFeedbackAndUpload).toBe(false);
  });

  it("prevents non-first uploaders from closing the circular final feedback", () => {
    const state = buildRelayQuestState({
      members,
      submissions: [
        submission(1, "user-a", { authorUserId: "user-b", comment: "좋아요" }),
        submission(2, "user-b", { authorUserId: "user-c", comment: "좋아요" }),
        submission(3, "user-c"),
      ],
      currentUserId: "user-b",
      questStatus: "open",
    });

    expect(state.status).toBe("waiting_final_feedback");
    expect(state.canFinalFeedback).toBe(false);
  });

  it("marks the relay completed after every submission has feedback", () => {
    const state = buildRelayQuestState({
      members,
      submissions: [
        submission(1, "user-a", { authorUserId: "user-b", comment: "좋아요" }),
        submission(2, "user-b", { authorUserId: "user-c", comment: "좋아요" }),
        submission(3, "user-c", { authorUserId: "user-a", comment: "좋아요" }),
      ],
      currentUserId: "user-a",
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
        viewer: { role: "admin", userId: "owner" },
        memberUserIds: [],
      })
    ).toBe(true);
    expect(
      canViewStudy({
        viewer: { role: "student", userId: "user-a" },
        memberUserIds: ["user-a"],
      })
    ).toBe(true);
    expect(
      canViewStudy({
        viewer: { role: "student", userId: "user-x" },
        memberUserIds: ["user-a"],
      })
    ).toBe(false);
  });

  it("accepts supported audio under 20MB and rejects unsupported files", () => {
    expect(
      validateStudyAudioFileMeta({
        fileName: "news.m4a",
        sizeBytes: 1024,
        contentType: "audio/x-m4a",
      }).ok
    ).toBe(true);
    expect(
      validateStudyAudioFileMeta({
        fileName: "news.mov",
        sizeBytes: 1024,
        contentType: "video/quicktime",
      }).ok
    ).toBe(false);
    expect(
      validateStudyAudioFileMeta({
        fileName: "news.mp3",
        sizeBytes: 21 * 1024 * 1024,
        contentType: "audio/mpeg",
      }).ok
    ).toBe(false);
  });
});
