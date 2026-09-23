import { Category, Product } from "./models";

/**
 * Demonstration catalogue. Every row is flagged `demo: true`, so it can be
 * told apart from DHI's real products and removed in one step
 * (`npm run db:seed -- --remove`, or delete them in /admin).
 */

export const DEMO_CATEGORIES = [
  ["electromenager", "Appareils électroménagers"],
  ["reactifs-laboratoire", "Réactifs de laboratoire"],
  ["lits-orthopediques", "Lits orthopédiques"],
  ["consommables-biomedicaux", "Consommables biomédicaux"],
  ["informatique-electronique", "Informatique et électronique"],
  ["accessoires", "Accessoires"],
  ["vetements-de-marque", "Vêtements de marque"],
] as const;

const DELIVERY = "Livraison à Lomé sous 48 h, autres villes sous 5 jours ouvrés.";
const RETURNS = "Retour accepté sous 7 jours si le produit est intact.";

type Demo = {
  slug: string;
  name: string;
  category: (typeof DEMO_CATEGORIES)[number][0];
  summary: string;
  price: number;
  stock: number;
  pv: number;
  warranty: string;
  characteristics: string[];
};

export const DEMO_PRODUCTS: Demo[] = [
  {
    slug: "refrigerateur-samsung-no-frost-320l",
    name: "Réfrigérateur Samsung No Frost 320L",
    category: "electromenager",
    summary: "Réfrigérateur combiné No Frost, 320 litres, classe énergétique A+.",
    price: 450_000,
    stock: 8,
    pv: 90,
    warranty: "Garantie 24 mois.",
    characteristics: ["Capacité 320 L", "Technologie No Frost", "Classe énergétique A+", "Distributeur d'eau intégré"],
  },
  {
    slug: "climatiseur-split-12000-btu",
    name: "Climatiseur split 12 000 BTU Inverter",
    category: "electromenager",
    summary: "Climatiseur mural Inverter, silencieux et économe, télécommande incluse.",
    price: 385_000,
    stock: 6,
    pv: 77,
    warranty: "Garantie 24 mois.",
    characteristics: ["12 000 BTU", "Technologie Inverter", "Mode déshumidification", "Télécommande incluse"],
  },
  {
    slug: "kit-reactifs-biochimie-6-parametres",
    name: "Kit de réactifs biochimie (6 paramètres)",
    category: "reactifs-laboratoire",
    summary: "Glycémie, urée, créatinine, cholestérol, triglycérides, ALAT.",
    price: 120_000,
    stock: 25,
    pv: 24,
    warranty: "Péremption garantie supérieure à 12 mois à la livraison.",
    characteristics: ["6 paramètres", "Conservation 2–8 °C", "Compatible analyseurs semi-automatiques"],
  },
  {
    slug: "bandelettes-urinaires-10-parametres",
    name: "Bandelettes urinaires 10 paramètres (100)",
    category: "reactifs-laboratoire",
    summary: "Boîte de 100 bandelettes pour analyse d'urine rapide.",
    price: 18_500,
    stock: 80,
    pv: 4,
    warranty: "Péremption garantie supérieure à 12 mois à la livraison.",
    characteristics: ["100 bandelettes", "10 paramètres", "Lecture en 60 secondes"],
  },
  {
    slug: "lit-medicalise-electrique-3-fonctions",
    name: "Lit médicalisé électrique 3 fonctions",
    category: "lits-orthopediques",
    summary: "Lit médicalisé à commande électrique, matelas médical inclus.",
    price: 1_250_000,
    stock: 3,
    pv: 250,
    warranty: "Garantie 12 mois.",
    characteristics: [
      "3 fonctions : dossier, jambes, hauteur",
      "Commande électrique",
      "Structure en acier renforcé",
      "Matelas médical inclus",
      "Roues avec freins",
      "Charge maximale : 180 kg",
    ],
  },
  {
    slug: "matelas-anti-escarres-a-air",
    name: "Matelas anti-escarres à air avec compresseur",
    category: "lits-orthopediques",
    summary: "Matelas à cellules alternées pour la prévention des escarres.",
    price: 165_000,
    stock: 10,
    pv: 33,
    warranty: "Garantie 12 mois.",
    characteristics: ["Cellules à pression alternée", "Compresseur silencieux", "Housse imperméable lavable"],
  },
  {
    slug: "kit-consommables-100-pieces",
    name: "Kit consommables 100 pièces",
    category: "consommables-biomedicaux",
    summary: "Seringues, compresses, gants et tubes de prélèvement.",
    price: 35_000,
    stock: 60,
    pv: 7,
    warranty: "Produits stériles, usage unique.",
    characteristics: ["100 pièces", "Usage unique", "Stérile"],
  },
  {
    slug: "tensiometre-electronique-bras",
    name: "Tensiomètre électronique de bras",
    category: "consommables-biomedicaux",
    summary: "Mesure automatique de la tension et du pouls, mémoire 2 × 60.",
    price: 28_000,
    stock: 40,
    pv: 6,
    warranty: "Garantie 24 mois.",
    characteristics: ["Brassard 22–42 cm", "Détection d'arythmie", "Mémoire 2 utilisateurs"],
  },
  {
    slug: "ordinateur-portable-15-pouces",
    name: "Ordinateur portable 15,6\" Core i5, 16 Go",
    category: "informatique-electronique",
    summary: "Portable polyvalent : Core i5, 16 Go de RAM, SSD 512 Go.",
    price: 520_000,
    stock: 5,
    pv: 104,
    warranty: "Garantie 12 mois.",
    characteristics: ["Intel Core i5", "16 Go de RAM", "SSD 512 Go", "Écran 15,6\" Full HD"],
  },
  {
    slug: "smartphone-android-128go",
    name: "Smartphone Android 128 Go double SIM",
    category: "informatique-electronique",
    summary: "Écran 6,6\", 128 Go, double SIM, batterie 5 000 mAh.",
    price: 145_000,
    stock: 15,
    pv: 29,
    warranty: "Garantie 12 mois.",
    characteristics: ["128 Go de stockage", "Double SIM", "Batterie 5 000 mAh", "Appareil photo 50 MP"],
  },
  {
    slug: "sac-a-dos-ordinateur",
    name: "Sac à dos ordinateur antivol",
    category: "accessoires",
    summary: "Sac à dos déperlant avec port USB et compartiment 15,6\".",
    price: 22_000,
    stock: 30,
    pv: 4,
    warranty: "Garantie 6 mois.",
    characteristics: ["Compartiment 15,6\"", "Port de charge USB", "Tissu déperlant"],
  },
  {
    slug: "montre-connectee-sante",
    name: "Montre connectée santé",
    category: "accessoires",
    summary: "Fréquence cardiaque, oxygène sanguin, sommeil et pas.",
    price: 38_000,
    stock: 20,
    pv: 8,
    warranty: "Garantie 12 mois.",
    characteristics: ["Cardiofréquencemètre", "SpO2", "Suivi du sommeil", "Autonomie 7 jours"],
  },
  {
    slug: "polo-dhi-brode",
    name: "Polo DHI brodé",
    category: "vetements-de-marque",
    summary: "Polo en coton piqué, logo DHI brodé, tailles S à XXL.",
    price: 12_500,
    stock: 100,
    pv: 3,
    warranty: "Échange de taille sous 7 jours.",
    characteristics: ["100 % coton piqué", "Logo brodé", "Tailles S à XXL"],
  },
  {
    slug: "blouse-medicale-premium",
    name: "Blouse médicale premium",
    category: "vetements-de-marque",
    summary: "Blouse blanche coupe ajustée, tissu anti-taches.",
    price: 18_000,
    stock: 45,
    pv: 4,
    warranty: "Échange de taille sous 7 jours.",
    characteristics: ["Tissu anti-taches", "3 poches", "Tailles S à XXL"],
  },
];

/** Inserts any missing demo category or product; never touches existing rows. */
export async function seedDemoCatalog() {
  for (const [i, [slug, name]] of DEMO_CATEGORIES.entries()) {
    await Category.updateOne({ slug }, { $setOnInsert: { slug, name, order: i, demo: true } }, { upsert: true });
  }
  for (const p of DEMO_PRODUCTS) {
    await Product.updateOne(
      { slug: p.slug },
      {
        $setOnInsert: {
          ...p,
          description: p.summary,
          images: [],
          affiliateBps: null,
          delivery: DELIVERY,
          returns: RETURNS,
          status: "active",
          demo: true,
        },
      },
      { upsert: true }
    );
  }
}

let pending: Promise<void> | null = null;

/**
 * A store with no real products shows the demo catalogue so the marketplace
 * can be tried straight away. As soon as DHI adds one real product nothing
 * is inserted again. Set DEMO_CATALOG=off to
 * disable it. One check per server instance, shared by parallel callers.
 */
export function ensureCatalog(): Promise<void> {
  if (process.env.DEMO_CATALOG === "off") return Promise.resolve();
  pending ??= (async () => {
    // Only while the store has no real products; tops up a partial demo set.
    if (await Product.exists({ demo: { $ne: true } })) return;
    try {
      await seedDemoCatalog();
    } catch (err) {
      // Another instance seeding at the same moment hits the unique slug; fine.
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  })().catch((err) => {
    pending = null; // retry on the next request
    console.error("[catalog] could not load the demo catalogue", err);
  });
  return pending;
}
