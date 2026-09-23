import { ui } from "@/components/portal/ui";

/** Shown while a portal page's data loads: the layout's shape, not a spinner. */
export default function Loading() {
  return (
    <div className={ui.page} aria-busy="true" aria-label="Chargement">
      <div className={ui.skeleton} style={{ height: 36, width: "40%" }} />
      <div className={ui.grid4}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={ui.skeleton} style={{ height: 92 }} />
        ))}
      </div>
      <div className={ui.skeleton} style={{ height: 260 }} />
    </div>
  );
}
