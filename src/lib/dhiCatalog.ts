import { Category, Product } from "./models";

/**
 * DHI's own product range, from the official "Nos produits" price list.
 * Loaded into the database on first use (missing products only, matched by
 * slug), so a deployment brings them in without touching the database by
 * hand. Anything edited in /admin afterwards is never overwritten.
 */

export const DHI_CATEGORIES = [
  ["complements-alimentaires", "Compléments alimentaires"],
  ["thes-et-cafe", "Thés et café"],
  ["soins", "Soins et gels"],
] as const;

type CategorySlug = (typeof DHI_CATEGORIES)[number][0];
export type ImageKind = "bottle" | "box" | "pouch" | "tube";

export type DhiProduct = {
  n: number;
  slug: string;
  name: string;
  price: number; // FCFA
  pv: number; // steps of 0.5
  category: CategorySlug;
  image: ImageKind;
};

const P = (
  n: number,
  name: string,
  price: number,
  pv: number,
  category: CategorySlug = "complements-alimentaires",
  image: ImageKind = "bottle"
): DhiProduct => ({
  n,
  name,
  price,
  pv,
  category,
  image,
  slug: name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""),
});

export const DHI_PRODUCTS: DhiProduct[] = [
  P(1, "Coenzyme Q10 (CoQ10)", 25_000, 25),
  P(2, "Equitenseur", 30_000, 25),
  P(3, "Aldosterone", 30_000, 25),
  P(4, "Natural Biotic", 15_000, 10),
  P(5, "Colon Cleaner", 10_000, 5),
  P(6, "Hemo Digesti", 10_000, 5),
  P(7, "Glucosamine", 25_600, 20),
  P(8, "Man Plus Extra", 15_000, 10),
  P(9, "Men Fertility", 15_000, 10),
  P(10, "Woman Fertility", 15_000, 10),
  P(11, "Active Cellular", 35_000, 30),
  P(12, "Mind Plus", 30_000, 25),
  P(13, "Calcium Magnésium Zinc", 12_000, 7),
  P(14, "Liver Protect", 15_000, 10),
  P(15, "Kidneys Protect", 30_000, 25),
  P(16, "Pros X", 15_000, 10),
  P(17, "Sino Rhinite", 16_000, 10),
  P(18, "Nasalet", 30_000, 25),
  P(19, "Base Forte", 30_000, 25),
  P(20, "Anti Age", 25_000, 15),
  P(21, "Lutein", 25_600, 20),
  P(22, "Anti Anémie", 5_000, 3),
  P(23, "Thé cholestérol", 2_500, 2, "thes-et-cafe", "box"),
  P(24, "Thé ventre réduit", 2_500, 2, "thes-et-cafe", "box"),
  P(25, "Café", 13_000, 10, "thes-et-cafe", "pouch"),
  P(26, "Gel Celan", 1_500, 1.5, "soins", "tube"),
  P(27, "Palucure", 5_000, 3),
  P(28, "Hemato", 32_000, 25),
];

export const productImagePath = (slug: string) => `/products/${slug}.svg`;

const STOCK = 100;

/** Adds any DHI category or product that is not in the database yet. */
export async function seedDhiCatalog() {
  for (const [i, [slug, name]] of DHI_CATEGORIES.entries()) {
    await Category.updateOne({ slug }, { $setOnInsert: { slug, name, order: i - 10, demo: false } }, { upsert: true });
  }
  for (const p of DHI_PRODUCTS) {
    await Product.updateOne(
      { slug: p.slug },
      {
        $setOnInsert: {
          slug: p.slug,
          name: p.name,
          category: p.category,
          summary: "Produit Divine Health International.",
          description: "",
          images: [productImagePath(p.slug)],
          price: p.price,
          stock: STOCK,
          pv: p.pv,
          affiliateBps: null,
          characteristics: [`Référence DHI n° ${p.n}`, `${String(p.pv).replace(".", ",")} PV par unité`],
          delivery: "Livraison à Lomé sous 48 h, autres villes sous 5 jours ouvrés.",
          warranty: "",
          returns: "Retour accepté sous 7 jours si le produit n'a pas été ouvert.",
          status: "active",
          demo: false,
          // Keeps the price-list order under "Nouveautés": n° 1 first.
          createdAt: new Date(Date.UTC(2026, 0, 1) + (100 - p.n) * 1000),
          updatedAt: new Date(),
        },
      },
      { upsert: true, timestamps: false }
    );
  }
}
