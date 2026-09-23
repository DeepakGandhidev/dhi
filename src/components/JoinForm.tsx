"use client";

import { useEffect, useState } from "react";
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
import styles from "@/app/(site)/join/page.module.css";

type Network = { hasRoot: boolean; ready: boolean };

type Success = {
  signedIn: boolean;
  memberCode: string;
  fullName: string;
  packageName: string;
  placementParent: string | null;
  position: "left" | "right" | null;
  spilled: boolean;
};

export function JoinForm() {
  const params = useSearchParams();
  const preselected = params.get("package");
  // A referral link (/join?ref=DHI-XXXXXX) fills in the sponsor. The server
  // still checks the code against a real member before using it.
  const ref = params.get("ref")?.trim().toUpperCase() ?? "";
  const referral = /^DHI-[A-Z0-9]{4,10}$/.test(ref) ? ref : "";
  const initial: PackageId =
    preselected && preselected in PACKAGE_BY_ID ? (preselected as PackageId) : "ring";

  const [packageId, setPackageId] = useState<PackageId>(initial);
  const [leg, setLeg] = useState<"left" | "right">("left");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Success | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);

  // Is anyone registered yet? Decides whether a sponsor code is needed.
  useEffect(() => {
    let live = true;
    fetch("/api/network")
      .then((r) => r.json())
      .then((d: Network) => live && setNetwork(d))
      .catch(() => live && setNetwork({ hasRoot: true, ready: false }));
    return () => {
      live = false;
    };
  }, []);

  const isFirstMember = network?.ready === true && network.hasRoot === false;

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
      password: String(data.get("password") ?? ""),
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
          {done.packageName} package.{" "}
          {done.placementParent
            ? `You were placed on the ${done.position} side of ${done.placementParent}.`
            : "You are the first member, at the top of the tree."}{" "}
          {done.spilled
            ? "Your sponsor's chosen leg was full, so you spilled down to the next open position."
            : ""}{" "}
          Your registration is pending until payment is confirmed at the DHI office.
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
          <Link href={done.signedIn ? "/dashboard" : "/login"} className="btn btn--ink">
            {done.signedIn ? "Go to your dashboard" : "Sign in to your dashboard"}
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

        {isFirstMember ? (
          <p className={styles.firstNotice}>
            <strong>You are the first member.</strong> There is nobody to sponsor you, so leave
            the sponsor code blank — you will sit at the top of the tree and everyone else
            builds beneath you.
          </p>
        ) : null}

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

          <label className="field">
            <span>Choose a password</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(errors.password)}
            />
            <small>At least 8 characters. You will use this and your member code to sign in.</small>
            {errors.password ? <p className={styles.error}>{errors.password}</p> : null}
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

          <fieldset className={styles.fieldset} hidden={isFirstMember}>
            <legend className={styles.legendText}>Which leg did your sponsor choose for you?</legend>
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
                      ? "Start the search on their left"
                      : "Start the search on their right"}
                  </span>
                </label>
              ))}
            </div>
            {errors.leg ? <p className={styles.error}>{errors.leg}</p> : null}
          </fieldset>

          <label className="field" hidden={isFirstMember}>
            <span>Sponsor code{network?.hasRoot === false ? " (optional)" : ""}</span>
            <input
              name="sponsorCode"
              placeholder="DHI-K4M2PQ"
              defaultValue={referral}
              style={{ textTransform: "uppercase" }}
              aria-invalid={Boolean(errors.sponsorCode)}
            />
            <small>
              {referral
                ? "Filled in from the invitation link you followed."
                : "The code of the member who introduced you. Ask them for it — without it we cannot place you in their network."}
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
          <span>
            {isFirstMember
              ? "Top of the tree"
              : `${leg === "left" ? "Left leg" : "Right leg"}, first open slot`}
          </span>
        </div>

        <p className={styles.asideNote}>
          Nothing is charged here. You will be asked to pay when you collect your products,
          and your position activates then.{" "}
          {isFirstMember
            ? ""
            : `If your sponsor's ${leg} leg is already full you will be placed under someone below them — that is called spillover, and it is normal.`}
        </p>
      </aside>
    </div>
  );
}
