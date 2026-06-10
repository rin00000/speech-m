import { createAdminClient } from "@/lib/supabase/server";
import type { Database, ManagementClassStatus } from "@/types/database.types";
import {
  canStudentCancelManagementClass,
  formatCouponLabel,
  formatManagementClassDateTime,
  formatManagementClassShortDateTime,
  getManagementClassCancelClosesAt,
} from "./format";

const UNKNOWN_USER_DISPLAY_NAME = "이름 미설정";

type ManagementClassRow = Database["public"]["Tables"]["management_classes"]["Row"];
type CouponGrantRow = Database["public"]["Tables"]["management_class_coupon_grants"]["Row"];
type CouponRow = Database["public"]["Tables"]["management_class_coupons"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["management_class_applications"]["Row"];
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

type ManagementClassSummaryRow = Pick<
  ManagementClassRow,
  "id" | "starts_at" | "capacity" | "status"
>;
type CouponGrantSummaryRow = Pick<
  CouponGrantRow,
  "id" | "student_user_id" | "total_count" | "granted_by_user_id" | "note" | "created_at"
>;
type CouponSummaryRow = Pick<
  CouponRow,
  "id" | "grant_id" | "student_user_id" | "sequence_number" | "status" | "created_at"
>;
type ApplicationSummaryRow = Pick<
  ApplicationRow,
  "id" | "class_id" | "student_user_id" | "coupon_id" | "status" | "applied_at"
>;
type StudentProfileRow = Pick<UserProfileRow, "user_id" | "email" | "display_name" | "real_name">;

export type StudentManagementClassApplication = {
  id: string;
  couponLabel: string;
  appliedAt: string;
  canCancel: boolean;
  cancelClosesAt: string | null;
};

export type StudentManagementClassNotice = {
  id: string;
  startsAt: string;
  startsAtLabel: string;
  capacity: number;
  activeApplicationCount: number;
  remainingSeats: number;
  isFull: boolean;
  availableCouponCount: number;
  nextCouponLabel: string | null;
  application: StudentManagementClassApplication | null;
};

export type AdminManagementClassApplication = {
  id: string;
  studentUserId: string;
  studentEmail: string | null;
  studentName: string;
  couponLabel: string;
  appliedAt: string;
  appliedAtLabel: string;
};

export type AdminManagementClassItem = {
  id: string;
  startsAt: string;
  startsAtLabel: string;
  capacity: number;
  status: ManagementClassStatus;
  activeApplicationCount: number;
  remainingSeats: number;
  applications: AdminManagementClassApplication[];
};

export type AdminManagementClassCouponGrant = {
  id: string;
  studentUserId: string;
  studentEmail: string | null;
  studentName: string;
  totalCount: number;
  availableCount: number;
  usedCount: number;
  note: string;
  createdAt: string;
  createdAtLabel: string;
};

export type AdminManagementClassStudent = {
  userId: string;
  email: string | null;
  displayName: string;
};

export type AdminManagementClassOpsData = {
  classes: AdminManagementClassItem[];
  students: AdminManagementClassStudent[];
  couponGrants: AdminManagementClassCouponGrant[];
};

export async function getStudentManagementClassDashboard(
  userId: string | null
): Promise<StudentManagementClassNotice[]> {
  if (!userId) return [];

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const [classesResult, grantsResult, couponsResult] = await Promise.all([
    supabase
      .from("management_classes")
      .select("id,starts_at,capacity,status")
      .eq("status", "open")
      .gt("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(8)
      .returns<ManagementClassSummaryRow[]>(),
    supabase
      .from("management_class_coupon_grants")
      .select("id,student_user_id,total_count,granted_by_user_id,note,created_at")
      .eq("student_user_id", userId)
      .order("created_at", { ascending: true })
      .returns<CouponGrantSummaryRow[]>(),
    supabase
      .from("management_class_coupons")
      .select("id,grant_id,student_user_id,sequence_number,status,created_at")
      .eq("student_user_id", userId)
      .order("created_at", { ascending: true })
      .returns<CouponSummaryRow[]>(),
  ]);

  const classes = classesResult.data ?? [];
  if (classes.length === 0) return [];

  const grants = grantsResult.data ?? [];
  const coupons = couponsResult.data ?? [];
  const classIds = classes.map((item) => item.id);
  const { data: applicationRows } = await supabase
    .from("management_class_applications")
    .select("id,class_id,student_user_id,coupon_id,status,applied_at")
    .in("class_id", classIds)
    .eq("status", "active")
    .returns<ApplicationSummaryRow[]>();

  const applications = applicationRows ?? [];
  const activeApplicationsByClassId = groupBy(applications, (application) => application.class_id);
  const ownApplicationByClassId = new Map(
    applications
      .filter((application) => application.student_user_id === userId)
      .map((application) => [application.class_id, application])
  );
  const grantsById = new Map(grants.map((grant) => [grant.id, grant]));
  const couponsById = new Map(coupons.map((coupon) => [coupon.id, coupon]));
  const availableCoupons = sortCouponsByGrant(coupons, grantsById).filter(
    (coupon) => coupon.status === "available"
  );
  const nextCoupon = availableCoupons[0] ?? null;

  return classes
    .map((item) => {
      const activeApplicationCount = activeApplicationsByClassId.get(item.id)?.length ?? 0;
      const ownApplication = ownApplicationByClassId.get(item.id) ?? null;
      const isFull = activeApplicationCount >= item.capacity;
      if (isFull && !ownApplication) return null;

      return {
        id: item.id,
        startsAt: item.starts_at,
        startsAtLabel: formatManagementClassDateTime(item.starts_at),
        capacity: item.capacity,
        activeApplicationCount,
        remainingSeats: Math.max(item.capacity - activeApplicationCount, 0),
        isFull,
        availableCouponCount: availableCoupons.length,
        nextCouponLabel: nextCoupon ? getCouponLabel(nextCoupon, grantsById) : null,
        application: ownApplication
          ? {
              id: ownApplication.id,
              couponLabel: getCouponLabel(couponsById.get(ownApplication.coupon_id), grantsById),
              appliedAt: ownApplication.applied_at,
              canCancel: canStudentCancelManagementClass(item.starts_at),
              cancelClosesAt: getManagementClassCancelClosesAt(item.starts_at),
            }
          : null,
      } satisfies StudentManagementClassNotice;
    })
    .filter((item): item is StudentManagementClassNotice => item !== null);
}

export async function getAdminManagementClassOpsData(): Promise<AdminManagementClassOpsData> {
  const supabase = createAdminClient();

  const [classesResult, studentsResult, studentProfilesResult, grantsResult] = await Promise.all([
    supabase
      .from("management_classes")
      .select("id,starts_at,capacity,status")
      .order("starts_at", { ascending: false })
      .limit(30)
      .returns<ManagementClassSummaryRow[]>(),
    supabase.from("users").select("id").eq("role", "student").eq("status", "active"),
    supabase.from("user_profiles").select("user_id,email,display_name,real_name"),
    supabase
      .from("management_class_coupon_grants")
      .select("id,student_user_id,total_count,granted_by_user_id,note,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<CouponGrantSummaryRow[]>(),
  ]);

  const classes = classesResult.data ?? [];
  if (studentsResult.error || studentProfilesResult.error) {
    throw new Error(
      studentsResult.error?.message ??
        studentProfilesResult.error?.message ??
        "수강생 정보를 불러오지 못했습니다."
    );
  }
  const profilesByUserId = new Map(
    ((studentProfilesResult.data ?? []) as StudentProfileRow[]).map((profile) => [
      profile.user_id,
      profile,
    ])
  );
  const students = (studentsResult.data ?? [])
    .map((student) => {
      const profile = profilesByUserId.get(student.id);
      return {
        userId: student.id,
        email: profile?.email ?? null,
        displayName: displayName(student.id, profilesByUserId),
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
  const grants = grantsResult.data ?? [];
  const classIds = classes.map((item) => item.id);
  const grantIds = grants.map((grant) => grant.id);

  const [applicationsResult, grantCouponsResult] = await Promise.all([
    classIds.length > 0
      ? supabase
          .from("management_class_applications")
          .select("id,class_id,student_user_id,coupon_id,status,applied_at")
          .in("class_id", classIds)
          .eq("status", "active")
          .order("applied_at", { ascending: true })
          .returns<ApplicationSummaryRow[]>()
      : Promise.resolve({ data: [] as ApplicationSummaryRow[] }),
    grantIds.length > 0
      ? supabase
          .from("management_class_coupons")
          .select("id,grant_id,student_user_id,sequence_number,status,created_at")
          .in("grant_id", grantIds)
          .returns<CouponSummaryRow[]>()
      : Promise.resolve({ data: [] as CouponSummaryRow[] }),
  ]);

  const applications = applicationsResult.data ?? [];
  const grantCoupons = grantCouponsResult.data ?? [];
  const applicationCouponIds = [...new Set(applications.map((application) => application.coupon_id))];
  const { data: applicationCoupons } =
    applicationCouponIds.length > 0
      ? await supabase
          .from("management_class_coupons")
          .select("id,grant_id,student_user_id,sequence_number,status,created_at")
          .in("id", applicationCouponIds)
          .returns<CouponSummaryRow[]>()
      : { data: [] as CouponSummaryRow[] };

  const applicationCouponRows = applicationCoupons ?? [];
  const missingApplicationGrantIds = [
    ...new Set(
      applicationCouponRows
        .map((coupon) => coupon.grant_id)
        .filter((grantId) => !grants.some((grant) => grant.id === grantId))
    ),
  ];
  const { data: applicationCouponGrants } =
    missingApplicationGrantIds.length > 0
      ? await supabase
          .from("management_class_coupon_grants")
          .select("id,student_user_id,total_count,granted_by_user_id,note,created_at")
          .in("id", missingApplicationGrantIds)
          .returns<CouponGrantSummaryRow[]>()
      : { data: [] as CouponGrantSummaryRow[] };

  const allCoupons = mergeById([...grantCoupons, ...applicationCouponRows]);
  const allGrants = mergeById([...grants, ...(applicationCouponGrants ?? [])]);
  const couponsById = new Map(allCoupons.map((coupon) => [coupon.id, coupon]));
  const grantsById = new Map(allGrants.map((grant) => [grant.id, grant]));
  const applicationsByClassId = groupBy(applications, (application) => application.class_id);
  const couponsByGrantId = groupBy(grantCoupons, (coupon) => coupon.grant_id);

  return {
    classes: classes.map((item) => {
      const classApplications = applicationsByClassId.get(item.id) ?? [];

      return {
        id: item.id,
        startsAt: item.starts_at,
        startsAtLabel: formatManagementClassDateTime(item.starts_at),
        capacity: item.capacity,
        status: item.status,
        activeApplicationCount: classApplications.length,
        remainingSeats: Math.max(item.capacity - classApplications.length, 0),
        applications: classApplications.map((application) => ({
          id: application.id,
          studentUserId: application.student_user_id,
          studentEmail: profilesByUserId.get(application.student_user_id)?.email ?? null,
          studentName: displayName(application.student_user_id, profilesByUserId),
          couponLabel: getCouponLabel(couponsById.get(application.coupon_id), grantsById),
          appliedAt: application.applied_at,
          appliedAtLabel: formatManagementClassShortDateTime(application.applied_at),
        })),
      };
    }),
    students,
    couponGrants: grants.map((grant) => {
      const grantCouponsForGrant = couponsByGrantId.get(grant.id) ?? [];
      const usedCount = grantCouponsForGrant.filter((coupon) => coupon.status === "used").length;

      return {
        id: grant.id,
        studentUserId: grant.student_user_id,
        studentEmail: profilesByUserId.get(grant.student_user_id)?.email ?? null,
        studentName: displayName(grant.student_user_id, profilesByUserId),
        totalCount: grant.total_count,
        availableCount: Math.max(grant.total_count - usedCount, 0),
        usedCount,
        note: grant.note,
        createdAt: grant.created_at,
        createdAtLabel: formatManagementClassShortDateTime(grant.created_at),
      };
    }),
  };
}

function sortCouponsByGrant(
  coupons: CouponSummaryRow[],
  grantsById: Map<string, CouponGrantSummaryRow>
) {
  return [...coupons].sort((a, b) => {
    const grantA = grantsById.get(a.grant_id);
    const grantB = grantsById.get(b.grant_id);
    const grantTimeA = grantA ? new Date(grantA.created_at).getTime() : 0;
    const grantTimeB = grantB ? new Date(grantB.created_at).getTime() : 0;
    if (grantTimeA !== grantTimeB) return grantTimeA - grantTimeB;
    if (a.sequence_number !== b.sequence_number) return a.sequence_number - b.sequence_number;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function getCouponLabel(
  coupon: CouponSummaryRow | undefined,
  grantsById: Map<string, CouponGrantSummaryRow>
) {
  if (!coupon) return "-";
  const grant = grantsById.get(coupon.grant_id);
  return formatCouponLabel(coupon.sequence_number, grant?.total_count ?? coupon.sequence_number);
}

function displayName(userId: string, profilesByUserId: Map<string, StudentProfileRow>) {
  const profile = profilesByUserId.get(userId);
  return profile?.real_name?.trim() || profile?.display_name?.trim() || profile?.email || UNKNOWN_USER_DISPLAY_NAME;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });
  return grouped;
}

function mergeById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
