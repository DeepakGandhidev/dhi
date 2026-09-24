/**
 * Draws a packshot-style image for every DHI product into public/products/.
 * They stand in until DHI's real product photos are available: replace a
 * file (same name) or set a photo URL on the product in /admin.
 *
 *   npx tsx scripts/product-images.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DHI_PRODUCTS, type DhiProduct } from "../src/lib/dhiCatalog";

// Label colours, cycled through the range so neighbouring cards differ.
const PALETTE = [
  ["#0f6b4f", "#1fa77a"],
  ["#1b2a6b", "#3c55b8"],
  ["#7a1f3d", "#c0456b"],
  ["#5b3aa8", "#8f6be0"],
  ["#8a5a00", "#e0a100"],
  ["#0d5e73", "#1f9bb8"],
  ["#6b3b12", "#b86a2a"],
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Splits a name into at most three lines of about `max` characters. */
function lines(name: string, max: number) {
  const out: string[] = [];
  for (const word of name.split(" ")) {
    const last = out.at(-1);
    if (last && (last + " " + word).length <= max) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out.slice(0, 3);
}

function label(p: DhiProduct, x: number, y: number, w: number, dark: string, max: number, size: number) {
  const ls = lines(p.name, max);
  const start = y - ((ls.length - 1) * size * 1.15) / 2;
  return ls
    .map(
      (l, i) =>
        `<text x="${x + w / 2}" y="${start + i * size * 1.15}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${size}" fill="${dark}">${esc(l)}</text>`
    )
    .join("");
}

const brand = (x: number, y: number, fill: string, size = 11) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${size}" letter-spacing="${size / 5.5}" fill="${fill}">DIVINE HEALTH</text>`;

function draw(p: DhiProduct, i: number) {
  const [dark, light] = PALETTE[i % PALETTE.length];
  const bg = `<defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef2ee"/></radialGradient>
<linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs>
<rect width="400" height="400" fill="url(#g)"/><ellipse cx="200" cy="352" rx="120" ry="14" fill="#000" opacity=".08"/>`;

  let body = "";
  if (p.image === "bottle") {
    body = `<rect x="150" y="62" width="100" height="40" rx="8" fill="url(#c)"/>
<rect x="138" y="96" width="124" height="14" rx="4" fill="${dark}" opacity=".85"/>
<rect x="118" y="108" width="164" height="240" rx="30" fill="#fbfbf8" stroke="#d9ddd6" stroke-width="2"/>
<rect x="118" y="150" width="164" height="150" fill="url(#c)"/>
<rect x="124" y="116" width="8" height="220" rx="4" fill="#fff" opacity=".45"/>
<rect x="138" y="166" width="134" height="100" rx="10" fill="#fff"/>
${label(p, 138, 216, 134, dark, 12, 16)}
${brand(205, 288, "#ffffff")}`;
  } else if (p.image === "box") {
    body = `<polygon points="110,120 250,120 290,95 150,95" fill="${light}"/>
<polygon points="250,120 290,95 290,320 250,345" fill="${dark}"/>
<rect x="110" y="120" width="140" height="225" fill="url(#c)"/>
<rect x="120" y="170" width="120" height="110" rx="8" fill="#fff"/>
${label(p, 120, 222, 120, dark, 10, 16)}
${brand(180, 150, "#ffffff")}
<path d="M150 300 q30 24 60 0" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
  } else if (p.image === "pouch") {
    body = `<path d="M125 90 h150 l14 250 q0 10 -10 10 h-158 q-10 0 -10 -10 z" fill="url(#c)"/>
<rect x="125" y="90" width="150" height="22" fill="${dark}"/>
<rect x="138" y="170" width="124" height="110" rx="10" fill="#fff"/>
${label(p, 138, 226, 124, dark, 11, 22)}
${brand(200, 145, "#ffffff")}`;
  } else {
    body = `<rect x="180" y="62" width="40" height="36" rx="6" fill="${dark}"/>
<path d="M150 98 h100 l22 250 h-144 z" fill="#fbfbf8" stroke="#d9ddd6" stroke-width="2"/>
<path d="M146 332 h108 l4 22 h-116 z" fill="${dark}"/>
<path d="M155 150 h90 l12 140 h-114 z" fill="url(#c)"/>
<rect x="160" y="182" width="80" height="70" rx="8" fill="#fff"/>
${label(p, 160, 218, 80, dark, 8, 15)}
${brand(206, 276, "#ffffff", 8)}`;
  }

  const pvBadge = `<g transform="translate(322 118)"><circle r="34" fill="#ffb627"/><text y="-2" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="18" fill="#171a3a">${esc(String(p.pv).replace(".", ","))}</text><text y="16" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="12" fill="#171a3a">PV</text></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${esc(p.name)}">${bg}${body}${pvBadge}</svg>\n`;
}

const dir = join(process.cwd(), "public", "products");
mkdirSync(dir, { recursive: true });
DHI_PRODUCTS.forEach((p, i) => writeFileSync(join(dir, `${p.slug}.svg`), draw(p, i)));
console.log(`${DHI_PRODUCTS.length} images written to public/products/`);
