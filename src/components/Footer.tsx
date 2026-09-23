import Link from "next/link";
import { Logo } from "./Logo";
import { PV_VALUE, NETWORK_TOTAL } from "@/lib/plan";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`shell ${styles.inner}`}>
        <div className={styles.brandCol}>
          <Logo size={64} />
          <p className={styles.tagline}>
            DHI International. Products you can sell, a plan you can count on a hand.
          </p>
          <p className={styles.meta}>
            <span className="num">1 PV = {PV_VALUE} FCFA</span> ·{" "}
            <span className="num">{NETWORK_TOTAL} positions across eight generations</span>
          </p>
        </div>

        <div className={styles.cols}>
          <div className={styles.col}>
            <h3 className={styles.colHead}>The plan</h3>
            <Link href="/packages">Packages</Link>
            <Link href="/plan">Bonuses</Link>
            <Link href="/calculator">Calculator</Link>
            <Link href="/awards">Awards</Link>
            <Link href="/about">About us</Link>
            <Link href="/marketplace">Marketplace</Link>
          </div>
          <div className={styles.col}>
            <h3 className={styles.colHead}>Get started</h3>
            <Link href="/join">Join DHI</Link>
            <Link href="/login">Member sign in</Link>
            <Link href="/plan#binary">How the binary works</Link>
            <Link href="/plan#generations">Generations</Link>
          </div>
        </div>
      </div>

      <div className={`shell ${styles.base}`}>
        <span>© {new Date().getFullYear()} DHI International</span>
        <span className={styles.disclaimer}>
          Earnings depend on product sales and the network you build. No income is guaranteed.
        </span>
      </div>
    </footer>
  );
}
