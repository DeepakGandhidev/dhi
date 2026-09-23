"use client";

import { useEffect } from "react";
import { EmptyState, ui } from "@/components/portal/ui";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className={ui.card}>
      <EmptyState
        icon="info"
        action={
          <button type="button" className={ui.btn} onClick={reset}>
            Réessayer
          </button>
        }
      >
        Cette page n&apos;a pas pu être chargée. Vérifiez votre connexion puis réessayez.
      </EmptyState>
    </div>
  );
}
