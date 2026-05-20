import { PrototypeCatalog } from "@/components/app/prototype/prototype-catalog";
import { requireUser } from "@/lib/auth/session";

export default async function PrototypePage() {
  const user = await requireUser();

  return <PrototypeCatalog userName={user.name} initialRole={user.role} />;
}
