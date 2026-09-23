/**
 * Demonstration data. Everything written here is flagged `demo: true` (or,
 * for members, uses the +000 demo phone range) so it can be told apart from
 * real data and removed in one command.
 *
 *   npm run db:seed                    categories + example products
 *   npm run db:seed -- --network       …plus a demo network with activity (dev only)
 *   npm run db:seed -- --remove        delete demo products and categories
 */
import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongodb";
import { Category, Member, Product } from "../src/lib/models";
import { hashPassword } from "../src/lib/auth";
import { activateMember, registerMember } from "../src/lib/services/members";
import type { PackageId } from "../src/lib/plan";

const CATEGORIES = [
  ["electromenager", "Appareils électroménagers"],
  ["reactifs-laboratoire", "Réactifs de laboratoire"],
  ["lits-orthopediques", "Lits orthopédiques"],
  ["consommables-biomedicaux", "Consommables biomédicaux"],
  ["informatique-electronique", "Informatique et électronique"],
  ["accessoires", "Accessoires"],
  ["vetements-de-marque", "Vêtements de marque"],
] as const;

const PRODUCTS = [
  {
    slug: "refrigerateur-samsung-no-frost-320l",
    name: "Réfrigérateur Samsung No Frost 320L",
    category: "electromenager",
    summary: "Réfrigérateur combiné No Frost, 320 litres, classe énergétique A+.",
    price: 450_000,
    stock: 8,
    pv: 90,
    characteristics: ["Capacité 320 L", "Technologie No Frost", "Classe énergétique A+", "Distributeur d'eau intégré"],
  },
  {
    slug: "kit-reactifs-biochimie-6-parametres",
    name: "Kit de réactifs biochimie (6 paramètres)",
    category: "reactifs-laboratoire",
    summary: "Glycémie, urée, créatinine, cholestérol, triglycérides, ALAT.",
    price: 120_000,
    stock: 25,
    pv: 24,
    characteristics: ["6 paramètres", "Conservation 2–8 °C", "Compatible analyseurs semi-automatiques"],
  },
  {
    slug: "lit-medicalise-electrique-3-fonctions",
    name: "Lit médicalisé électrique 3 fonctions",
    category: "lits-orthopediques",
    summary: "Lit médicalisé à commande électrique, matelas médical inclus.",
    price: 1_250_000,
    stock: 3,
    pv: 250,
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
    slug: "kit-consommables-100-pieces",
    name: "Kit consommables 100 pièces",
    category: "consommables-biomedicaux",
    summary: "Seringues, compresses, gants et tubes de prélèvement.",
    price: 35_000,
    stock: 60,
    pv: 7,
    characteristics: ["100 pièces", "Usage unique", "Stérile"],
  },
];

async function seedCatalogue() {
  for (const [i, [slug, name]] of CATEGORIES.entries()) {
    await Category.updateOne({ slug }, { $setOnInsert: { slug, name, order: i, demo: true } }, { upsert: true });
  }
  for (const p of PRODUCTS) {
    await Product.updateOne(
      { slug: p.slug },
      {
        $setOnInsert: {
          ...p,
          description: p.summary,
          images: [],
          affiliateBps: null,
          delivery: "Livraison à Lomé sous 48 h, autres villes sous 5 jours ouvrés.",
          warranty: "Garantie 12 mois.",
          returns: "Retour accepté sous 7 jours si le produit est intact.",
          status: "active",
          demo: true,
        },
      },
      { upsert: true }
    );
  }
  console.log(`catalogue: ${CATEGORIES.length} categories, ${PRODUCTS.length} demo products`);
}

async function seedNetwork() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed a demo network in production.");
  if (await Member.exists({})) {
    console.log("network: members already exist, skipping demo network");
    return;
  }
  const passwordHash = await hashPassword("demo-password");
  let n = 0;
  const add = async (sponsor: string | undefined, leg: "left" | "right", pkg: PackageId, activate = true) => {
    n++;
    const m = await registerMember({
      fullName: `Démo Membre ${n}`,
      phone: `+000 ${String(n).padStart(6, "0")}`,
      passwordHash,
      packageId: pkg,
      sponsorLeg: leg,
      sponsorCode: sponsor,
    });
    if (activate) await activateMember(m.memberCode, "seed");
    return m.memberCode;
  };

  const root = await add(undefined, "left", "thumb");
  const pkgs: PackageId[] = ["little", "index", "ring", "middle", "thumb"];
  let frontier = [root];
  for (let level = 0; level < 4; level++) {
    const next: string[] = [];
    for (const [i, code] of frontier.entries()) {
      next.push(await add(code, "left", pkgs[(i + level) % 5]));
      next.push(await add(code, "right", pkgs[(i + level + 2) % 5], i % 3 !== 2));
    }
    frontier = next;
  }
  console.log(`network: ${n} demo members, root ${root} (password: demo-password)`);
}

async function main() {
  await connectToDatabase();
  if (process.argv.includes("--remove")) {
    const p = await Product.deleteMany({ demo: true });
    const c = await Category.deleteMany({ demo: true });
    console.log(`removed ${p.deletedCount} demo products, ${c.deletedCount} demo categories`);
  } else {
    await seedCatalogue();
    if (process.argv.includes("--network")) await seedNetwork();
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
