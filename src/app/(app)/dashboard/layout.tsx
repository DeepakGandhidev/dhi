import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";

/** Every /dashboard page needs a signed-in member; the check is server-side. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  if (!member) redirect("/login");
  if (member.status === "suspended") redirect("/login?suspended=1");
  return children;
}
