import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { currentMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your DHI member account to see your network.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentMember()) redirect("/dashboard");

  return (
    <section className="section section--tight">
      <div className="shell">
        <LoginForm />
      </div>
    </section>
  );
}
