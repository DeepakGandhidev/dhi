import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

/** The public site: marketing pages, registration and sign-in. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
