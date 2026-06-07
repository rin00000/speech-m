import { createAdminClient } from "@/lib/supabase/server";
import type { Database, ManagementClassStatus } from "@/types/database.types";
import {
  canStudentCancelManagementClass,
  formatCouponLabel,
  formatManagementClassDateTime,
  formatManagementClassShortDateTime,
  getManagementClassCancelClosesAt,
} from "./format";

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
  "id" | "student_email" | "total_count" | "granted_by" | "note" | "created_at"
>;
type CouponSummaryRow = Pick<
  CouponRow,
  "id" | "grant_id" | "student_email" | "sequence_number" | "status" | "created_at"
>;
type ApplicationSummaryRow = Pick<
  ApplicationRow,
  "id" | "class_id" | "student_email" | "coupon_id" | "status" | "applied_at"
>;
type StudentProfileRow = Pick<UserProfileRow, "email" | "display_name" | "real_name" | "role">;

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
  studentEmail: string;
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
  studentEmail: string;
  studentName: string;
  totalCount: number;
  availableCount: number;
  usedCount: number;
  note: string;
  createdAt: string;
  createdAtLabel: string;
};

export type AdminManagementClassStudent = {
  email: string;
  displayName: string;
};

export type AdminManagementClassOpsData = {
  classes: AdminManagementClassItem[];
  students: AdminManagementClassStudent[];
  couponGrants: AdminManagementClassCouponGrant[];
};

export async function getStudentManagementClassDashboard(
  email: string | null,
): Promise<StudentManagementClassNotice[]> {
  if (!email) return [];

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
      .select("id,student_email,total_count,granted_by,note,created_at")
      .eq("student_email", email)
      .order("created_at", { ascending: true })
      .returns<CouponGrantSummaryRow[]>(),
    supabase
      .from("management_class_coupons")
      .select("id,grant_id,student_email,sequence_number,status,created_at")
      .eq("student_email", email)
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
    .select("id,class_id,student_email,coupon_id,status,applied_at")
    .in("class_id", classIds)
    .eq("status", "active")
    .returns<ApplicationSummaryRow[]>();

  const applications = applicationRows ?? [];
  const activeApplicationsByClassId = groupBy(applications, (application) => application.class_id);
  const ownApplicationByClassId = new Map(
    applications
      .filter((application) => application.student_email === email)
      .map((application) => [application.class_id, application]),
  );
  const grantsById = new Map(grants.map((grant) => [grant.id, grant]));
  const couponsById = new Map(coupons.map((coupon) => [coupon.id, coupon]));
  const availableCoupons = sortCouponsByGrant(coupons, grantsById).filter(
    (coupon) => coupon.status === "available",
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

  const [classesResult, studentsResult, grantsResult] = await Promise.all([
    supabase
      .from("management_classes")
      .select("id,starts_at,capacity,status")
      .order("starts_at", { ascending: false })
      .limit(30)
      .returns<ManagementClassSummaryRow[]>(),
    supabase
      .from("user_profiles")
      .select("email,display_name,real_name,role")
      .eq("role", "student")
      .order("display_name", { ascending: true })
      .returns<StudentProfileRow[]>(),
    supabase
      .from("management_class_coupon_grants")
      .select("id,student_email,total_count,granted_by,note,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<CouponGrantSummaryRow[]>(),
  ]);

  const classes = classesResult.data ?? [];
  const students = studentsResult.data ?? [];
  const grants = grantsResult.data ?? [];
  const classIds = classes.map((item) => item.id);
  const grantIds = grants.map((grant) => grant.id);

  const [applicationsResult, grantCouponsResult] = await Promise.all([
    classIds.length > 0
      ? supabase
          .from("management_class_applications")
          .select("id,class_id,student_email,coupon_id,status,applied_at")
          .in("class_id", classIds)
          .eq("status", "active")
          .order("applied_at", { ascending: true })
          .returns<ApplicationSummaryRow[]>()
      : Promise.resolve({ data: [] as ApplicationSummaryRow[] }),
    grantIds.length > 0
      ? supabase
          .from("management_class_coupons")
          .select("id,grant_id,student_email,sequence_number,status,created_at")
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
          .select("id,grant_id,student_email,sequence_number,status,created_at")
          .in("id", applicationCouponIds)
          .returns<CouponSummaryRow[]>()
      : { data: [] as CouponSummaryRow[] };

  const applicationCouponRows = applicationCoupons ?? [];
  const missingApplicationGrantIds = [
    ...new Set(
      applicationCouponRows
        .map((coupon) => coupon.grant_id)
        .filter((grantId) => !grants.some((grant) => grant.id === grantId)),
    ),
  ];
  const { data: applicationCouponGrants } =
    missingApplicationGrantIds.length > 0
      ? await supabase
          .from("management_class_coupon_grants")
          .select("id,student_email,total_count,granted_by,note,created_at")
          .in("id", missingApplicationGrantIds)
          .returns<CouponGrantSummaryRow[]>()
      : { data: [] as CouponGrantSummaryRow[] };

  const allCoupons = mergeById([...grantCoupons, ...applicationCouponRows]);
  const allGrants = mergeById([...grants, ...(applicationCouponGrants ?? [])]);
  const couponsById = new Map(allCoupons.map((coupon) => [coupon.id, coupon]));
  const grantsById = new Map(allGrants.map((grant) => [grant.id, grant]));
  const applicationsByClassId = groupBy(applications, (application) => application.class_id);
  const profilesByEmail = new Map(students.map((student) => [student.email, student]));
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
          studentEmail: application.student_email,
          studentName: displayName(application.student_email, profilesByEmail),
          couponLabel: getCouponLabel(couponsById.get(application.coupon_id), grantsById),
          appliedAt: application.applied_at,
          appliedAtLabel: formatManagementClassShortDateTime(application.applied_at),
        })),
      };
    }),
    students: students.map((student) => ({
      email: student.email,
      displayName: displayName(student.email, profilesByEmail),
    })),
    couponGrants: grants.map((grant) => {
      const grantCouponsForGrant = couponsByGrantId.get(grant.id) ?? [];
      const usedCount = grantCouponsForGrant.filter((coupon) => coupon.status === "used").length;

      return {
        id: grant.id,
        studentEmail: grant.student_email,
        studentName: displayName(grant.student_email, profilesByEmail),
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
  grantsById: Map<string, CouponGrantSummaryRow>,
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
  grantsById: Map<string, CouponGrantSummaryRow>,
) {
  if (!coupon) return "-";
  const grant = grantsById.get(coupon.grant_id);
  return formatCouponLabel(coupon.sequence_number, grant?.total_count ?? coupon.sequence_number);
}

function displayName(
  email: string,
  profilesByEmail: Map<string, Pick<UserProfileRow, "email" | "display_name" | "real_name">>,
) {
  const profile = profilesByEmail.get(email);
  return profile?.real_name?.trim() || profile?.display_name?.trim() || email;
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
