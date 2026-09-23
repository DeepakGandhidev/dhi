import { Suspense } from "react";
import { isAdmin } from "@/lib/api";
import { AdminConsole, AdminLogin } from "@/components/admin/AdminConsole";

export const dynamic = "force-dynamic";

/** The DHI office console. Access is a signed, HttpOnly admin session cookie. */
export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  return (
    <Suspense fallback={null}>
      <AdminConsole />
    </Suspense>
  );
}
