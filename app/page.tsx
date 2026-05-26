import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPostLoginRedirect } from "@/lib/auth/redirects";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(getPostLoginRedirect(user));
}
