import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinForm } from "@/components/JoinForm";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Register with DHI International: choose one of the five packages, pick your leg, and get your member code.",
};

export default function JoinPage() {
  return (
    <section className="section section--tight">
      <div className="shell">
        <Suspense fallback={<p className="lede">Loading the registration form…</p>}>
          <JoinForm />
        </Suspense>
      </div>
    </section>
  );
}
