import styles from "./Hero.module.css";
import Link from "next/link";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.backgroundEffects} />
      
      <div className={styles.container}>
        <div className={styles.eyebrow}>ONE WORKSPACE. EVERY CUSTOMER.</div>
        
        <h1 className={styles.title}>
          Every lead has an owner.<br />
          Every detail has a place.
        </h1>
        
        <div className={styles.subtitleWrapper}>
          <p className={styles.subtitle}>
            Manage leads, customer conversations, sales pipelines, payments, and appointments in one connected workspace — with clear ownership and fewer things slipping through the cracks.
          </p>
        </div>
        
        <div className={styles.actions}>
          <Link href="#cta" className={styles.primaryBtn}>
            See Financify in Action
          </Link>
          <Link href="#agents" className={styles.secondaryBtn}>
            Explore the Platform <span className={styles.arrow}>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
