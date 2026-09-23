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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/dhi-logo.jpg"
          alt="Divine Health International"
          width={180}
          height={180}
          style={{ display: "block", width: 180, height: "auto", margin: "0 0 20px", borderRadius: 24 }}
        />
        <LoginForm />
      </div>
    </section>
  );
}
