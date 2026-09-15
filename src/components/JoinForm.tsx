"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PACKAGES,
  PACKAGE_BY_ID,
  formatFcfa,
  formatPct,
  pvToFcfa,
  type PackageId,
} from "@/lib/plan";
import styles from "@/app/join/page.module.css";

type Success = {
  memberCode: string;
  fullName: string;
  packageName: string;
  leg: "left" | "right";
};

export function JoinForm() {
  const params = useSearchParams();
  const preselected = params.get("package");
  const initial: PackageId =
    preselected && preselected in PACKAGE_BY_ID ? (preselected as PackageId) : "ring";

  const [packageId, setPackageId] = useState<PackageId>(initial);
  const [leg, setLeg] = useState<"left" | "right">("left");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Success | null>(null);

  const pkg = PACKAGE_BY_ID[packageId];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      fullName: String(data.get("fullName") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      city: String(data.get("city") ?? ""),
      sponsorCode: String(data.get("sponsorCode") ?? ""),
      packageId,
      leg,
    };

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok) {
        setDone(json as Success);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (json.errors) {
        setErrors(json.errors);
      } else {
        setFormError(json.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={styles.done}>
        <h1 className={styles.title}>You are registered, {done.fullName.split(" ")[0]}.</h1>
        <p className="lede">Your member code — give this to everyone you sponsor.</p>
        <div className={`${styles.doneCode} num`}>{done.memberCode}</div>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--t-s)" }}>
          {done.packageName} package, placed on the {done.leg} leg. Your registration is
          pending until payment is confirmed at the DHI office.
        </p>

        <ol className={styles.doneNext}>
          {[
            "Pay for your package and collect your products",
            "Sponsor your first person and place them on your left",
            "Sponsor your second person and place them on your right",
            "Watch the first pair match at 25 PV each side",
          ].map((step, i) => (
            <li key={step}>
              <span className={`${styles.doneNum} num`}>{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div style={{ marginTop: 30, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/calculator" className="btn btn--ink">
            Work out your first bonus
          </Link>
          <Link href="/plan" className="btn btn--ghost">
            Read the plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.title}>Join DHI</h1>
        <p className="lede" style={{ marginBottom: "clamp(22px, 3vw, 34px)" }}>
          Registration reserves your position and your member code. You pay for the package
          and collect your products at the DHI office.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}

          <label className="field">
            <span>Full name</span>
            <input
              name="fullName"
              autoComplete="name"
              required
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName ? <p className={styles.error}>{errors.fullName}</p> : null}
          </label>

          <div className={styles.pair}>
            <label className="field">
              <span>Phone</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+237 6 00 00 00 00"
                required
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone ? <p className={styles.error}>{errors.phone}</p> : null}
            </label>

            <label className="field">
              <span>City</span>
              <input name="city" autoComplete="address-level2" placeholder="Douala" />
            </label>
          </div>

          <label className="field">
            <span>Email (optional)</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <p className={styles.error}>{errors.email}</p> : null}
          </label>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legendText}>Your package</legend>
            <div className={styles.pkgOptions}>
              {PACKAGES.map((p) => (
                <label className={styles.pkgOption} key={p.id}>
                  <input
                    type="radio"
                    name="packageId"
                    value={p.id}
                    checked={p.id === packageId}
                    onChange={() => setPackageId(p.id)}
                  />
                  <span>
                    <span className={styles.pkgName}>{p.name}</span>
                    <span className={styles.pkgMeta} style={{ display: "block" }}>
                      {p.products} {p.products === 1 ? "product" : "products"} · {p.pv} PV ·{" "}
                      {formatPct(p.direct)} direct
                    </span>
                  </span>
                  <span className={`${styles.pkgPrice} num`}>{formatFcfa(p.amount)}</span>
                </label>
              ))}
            </div>
            {errors.packageId ? <p className={styles.error}>{errors.packageId}</p> : null}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legendText}>Which leg do you want to be placed on?</legend>
            <div className={styles.legOptions}>
              {(["left", "right"] as const).map((side) => (
                <label className={styles.legOption} key={side}>
                  <input
                    type="radio"
                    name="leg"
                    value={side}
                    checked={leg === side}
                    onChange={() => setLeg(side)}
                  />
                  <span className={styles.legName}>
                    {side === "left" ? "Left leg" : "Right leg"}
                  </span>
                  <span className={styles.legNote}>
                    {side === "left"
                      ? "Your volume builds the left side"
                      : "Your volume builds the right side"}
                  </span>
                </label>
              ))}
            </div>
            {errors.leg ? <p className={styles.error}>{errors.leg}</p> : null}
          </fieldset>

          <label className="field">
            <span>Sponsor code (optional)</span>
            <input
              name="sponsorCode"
              placeholder="DHI-K4M2PQ"
              style={{ textTransform: "uppercase" }}
              aria-invalid={Boolean(errors.sponsorCode)}
            />
            <small>
              The code of the member who introduced you. Leave it blank if you are joining
              directly.
            </small>
            {errors.sponsorCode ? <p className={styles.error}>{errors.sponsorCode}</p> : null}
          </label>

          <div>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Registering…" : `Register on ${pkg.name}`}
            </button>
          </div>
        </form>
      </div>

      {/* Live summary of what they have chosen */}
      <aside className={styles.aside} aria-live="polite">
        <h2 className={styles.asideHead}>{pkg.name}</h2>
        <p className={styles.asideSub}>{pkg.finger}</p>

        <div className={styles.asideRow}>
          <span>To pay</span>
          <span className="num">{formatFcfa(pkg.amount)}</span>
        </div>
        <div className={styles.asideRow}>
          <span>Products</span>
          <span className="num">{pkg.products}</span>
        </div>
        <div className={styles.asideRow}>
          <span>Volume credited</span>
          <span className="num">
            {pkg.pv} PV ({formatFcfa(pvToFcfa(pkg.pv))})
          </span>
        </div>
        <div className={styles.asideRow}>
          <span>Direct sponsorship</span>
          <span className="num">{formatPct(pkg.direct)}</span>
        </div>
        <div className={styles.asideRow}>
          <span>Per 25 PV pair</span>
          <span className="num">
            {formatPct(pkg.binary)} ({formatFcfa(pvToFcfa(25) * pkg.binary)})
          </span>
        </div>
        <div className={styles.asideRow}>
          <span>Your discount</span>
          <span className="num">{formatPct(pkg.discount)}</span>
        </div>
        <div className={styles.asideRow}>
          <span>Placement</span>
          <span>{leg === "left" ? "Left leg" : "Right leg"}</span>
        </div>

        <p className={styles.asideNote}>
          Nothing is charged here. You will be asked to pay when you collect your products,
          and your position activates then.
        </p>
      </aside>
    </div>
  );
}
