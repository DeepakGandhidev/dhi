import { Icon, type IconName } from "@/components/portal/Icon";
import s from "./marketplace.module.css";

const CATEGORY_ICON: Record<string, IconName> = {
  electromenager: "box",
  "reactifs-laboratoire": "layers",
  "lits-orthopediques": "shield",
  "consommables-biomedicaux": "plus",
  "informatique-electronique": "chart",
  accessoires: "star",
  "vetements-de-marque": "user",
};

/** The product photo, or a designed panel when the product has none yet. */
export function ProductImage({ src, alt, category, className }: { src: string | null; alt: string; category: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`${s.img} ${className ?? ""}`} loading="lazy" decoding="async" />;
  }
  return (
    <div className={`${s.img} ${s.imgFallback} ${className ?? ""}`} role="img" aria-label={alt} data-cat={category}>
      <Icon name={CATEGORY_ICON[category] ?? "box"} size={40} strokeWidth={1.4} />
    </div>
  );
}
