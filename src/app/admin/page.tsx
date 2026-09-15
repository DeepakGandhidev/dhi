import type { Metadata } from "next";
import { AdminMembers } from "@/components/AdminMembers";

export const metadata: Metadata = {
  title: "Members",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <section className="section section--tight">
      <div className="shell">
        <h1 style={{ fontSize: "var(--t-xl)", fontStretch: "90%", marginBottom: "0.4em" }}>
          Registered members
        </h1>
        <p className="lede">
          Everyone who has filled in the registration form, newest first. Enter the admin
          password to load the list.
        </p>
        <AdminMembers />
      </div>
    </section>
  );
}
