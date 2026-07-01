import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteStudyGroup } from "./study-group-actions";

const {
  mockCreateAdminClient,
  mockGetCurrentUser,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const GROUP_ID = "33333333-3333-4333-8333-333333333333";
const QUEST_ID_A = "44444444-4444-4444-8444-444444444444";
const QUEST_ID_B = "55555555-5555-4555-8555-555555555555";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

type QueryMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
};

type SupabaseMockOptions = {
  groupStatus?: "active" | "archived";
  storageError?: { message: string } | null;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("deleteStudyGroup", () => {
  it("rejects non-admin actors before Supabase side effects", async () => {
    mockGetCurrentUser.mockResolvedValue({
      role: "student",
      userId: STUDENT_ID,
    });

    await expect(deleteStudyGroup(GROUP_ID)).resolves.toEqual({
      success: false,
      error: "관리자 권한이 필요합니다.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("rejects active study groups", async () => {
    mockGetCurrentUser.mockResolvedValue({
      role: "admin",
      userId: ADMIN_ID,
    });
    const { client, remove, deleteGroupQuery } = createSupabaseMock({ groupStatus: "active" });
    mockCreateAdminClient.mockReturnValue(client);

    await expect(deleteStudyGroup(GROUP_ID)).resolves.toEqual({
      success: false,
      error: "보관 상태인 스터디만 영구 삭제할 수 있습니다.",
    });
    expect(remove).not.toHaveBeenCalled();
    expect(deleteGroupQuery.delete).not.toHaveBeenCalled();
  });

  it("removes study audio, deletes archived study groups, and revalidates related views", async () => {
    mockGetCurrentUser.mockResolvedValue({
      role: "admin",
      userId: ADMIN_ID,
    });
    const { client, remove, deleteGroupQuery } = createSupabaseMock({ groupStatus: "archived" });
    mockCreateAdminClient.mockReturnValue(client);

    await expect(deleteStudyGroup(GROUP_ID)).resolves.toEqual({
      success: true,
      data: undefined,
    });
    expect(remove).toHaveBeenCalledWith(["relay/a.mp3", "relay/b.wav"]);
    expect(deleteGroupQuery.delete).toHaveBeenCalled();
    expect(deleteGroupQuery.eq).toHaveBeenCalledWith("id", GROUP_ID);
    expect(deleteGroupQuery.eq).toHaveBeenCalledWith("status", "archived");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/studies");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/studies/${GROUP_ID}`);
  });

  it("does not delete the DB row when Storage deletion fails", async () => {
    mockGetCurrentUser.mockResolvedValue({
      role: "admin",
      userId: ADMIN_ID,
    });
    const { client, deleteGroupQuery } = createSupabaseMock({
      groupStatus: "archived",
      storageError: { message: "storage unavailable" },
    });
    mockCreateAdminClient.mockReturnValue(client);

    await expect(deleteStudyGroup(GROUP_ID)).resolves.toEqual({
      success: false,
      error: "스터디 음성 파일을 삭제하지 못했습니다.",
    });
    expect(deleteGroupQuery.delete).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

function createSupabaseMock({
  groupStatus = "archived",
  storageError = null,
}: SupabaseMockOptions = {}) {
  const groupLookupQuery = createQueryMock({
    singleData: { id: GROUP_ID, status: groupStatus },
  });
  const questsQuery = createQueryMock({
    listData: [{ id: QUEST_ID_A }, { id: QUEST_ID_B }],
  });
  const submissionsQuery = createQueryMock({
    listData: [
      { audio_path: "relay/a.mp3" },
      { audio_path: "relay/a.mp3" },
      { audio_path: "relay/b.wav" },
    ],
  });
  const deleteGroupQuery = createQueryMock({
    singleData: { id: GROUP_ID },
  });
  const queriesByTable = new Map<string, QueryMock[]>([
    ["study_groups", [groupLookupQuery, deleteGroupQuery]],
    ["study_quests", [questsQuery]],
    ["study_relay_submissions", [submissionsQuery]],
  ]);
  const remove = vi.fn().mockResolvedValue({ data: null, error: storageError });
  const client = {
    from: vi.fn((table: string) => {
      const query = queriesByTable.get(table)?.shift();
      if (!query) throw new Error(`Unexpected table query: ${table}`);
      return query;
    }),
    storage: {
      from: vi.fn(() => ({ remove })),
    },
  };

  return { client, remove, deleteGroupQuery };
}

function createQueryMock({
  listData = [],
  singleData = null,
  error = null,
}: {
  listData?: unknown[];
  singleData?: unknown;
  error?: { message: string } | null;
}) {
  const listResult: QueryResult = { data: listData, error };
  const singleResult: QueryResult = { data: singleData, error };
  const query = {} as QueryMock;

  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.delete = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue(singleResult);
  query.then = vi.fn(
    (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(listResult).then(resolve, reject),
  );

  return query;
}
