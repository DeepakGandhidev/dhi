import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
  variable: "--font-display",
  display: "swap",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DHI International — five packages, two legs, one plan",
    template: "%s · DHI International",
  },
  description:
    "The DHI compensation plan: five membership packages, direct sponsorship up to 50%, a 25 PV binary that pays to the eighth generation, and awards from Star to Sapphire. 1 PV = 500 FCFA.",
  openGraph: {
    title: "DHI International",
    description:
      "Five packages, two legs, one plan. Direct bonuses up to 50%, binary pairs at 25 PV, eight generations.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
