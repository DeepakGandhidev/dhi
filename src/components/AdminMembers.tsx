"use client";

import { useState } from "react";
import { PACKAGE_BY_ID, formatFcfa, type PackageId } from "@/lib/plan";
import styles from "./AdminMembers.module.css";

type Row = {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  packageId: PackageId;
  leg: "left" | "right";
  sponsorCode?: string;
  memberCode: string;
  status: string;
  createdAt: string;
};

export function AdminMembers() {
  const [key, setKey] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/members?key=${encodeURIComponent(key)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not load the list.");
        setRows(null);
      } else {
        setRows(json.members);
      }
    } catch {
      setError("We could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  const total = rows?.reduce((sum, r) => sum + (PACKAGE_BY_ID[r.packageId]?.amount ?? 0), 0) ?? 0;

  return (
    <div className={styles.wrap}>
      <form className={styles.gate} onSubmit={load}>
        <label className="field" style={{ flex: "1 1 240px" }}>
          <span>Admin password</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="btn btn--ink" disabled={loading}>
          {loading ? "Loading…" : "Load members"}
        </button>
      </form>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {rows && rows.length === 0 ? (
        <p className={styles.empty}>
          Nobody has registered yet. The first registration will appear here.
        </p>
      ) : null}

      {rows && rows.length > 0 ? (
        <>
          <div className={styles.summary}>
            <span>
              <strong className="num">{rows.length}</strong> members
            </span>
            <span>
              <strong className="num">{formatFcfa(total)}</strong> in packages
            </span>
          </div>
          <div className={styles.scroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Code</th>
                  <th>Package</th>
                  <th>Leg</th>
                  <th>Sponsor</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <span className={styles.name}>{r.fullName}</span>
                      <span className={styles.sub}>
                        {r.phone}
                        {r.city ? ` · ${r.city}` : ""}
                      </span>
                    </td>
                    <td className="num">{r.memberCode}</td>
                    <td>{PACKAGE_BY_ID[r.packageId]?.name ?? r.packageId}</td>
                    <td>{r.leg}</td>
                    <td className="num">{r.sponsorCode ?? "—"}</td>
                    <td>
                      <span className={styles.status} data-status={r.status}>
                        {r.status}
                      </span>
                    </td>
                    <td className="num">
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
