"use client";

import { useState } from "react";
import { ProductImage } from "./ProductImage";
import s from "./marketplace.module.css";

export function Gallery({ images, name, category }: { images: string[]; name: string; category: string }) {
  const [i, setI] = useState(0);
  return (
    <div className={s.gallery}>
      <div className={s.mainImg}>
        <ProductImage src={images[i] ?? null} alt={name} category={category} />
      </div>
      {images.length > 1 ? (
        <div className={s.thumbs} role="tablist" aria-label="Photos du produit">
          {images.map((src, n) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Photo ${n + 1}`}
              className={s.thumb}
              data-active={n === i}
              onClick={() => setI(n)}
            >
              <ProductImage src={src} alt="" category={category} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
