import styles from "./Hero.module.css";
import Link from "next/link";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.backgroundEffects} />
      
      <div className={styles.container}>
        <div className={styles.eyebrow}>AGENTIC AI • DONE FOR YOU</div>
        
        <h1 className={styles.title}>
          Stop Firefighting.<br />
          Start Scaling.
        </h1>
        
        <div className={styles.subtitleWrapper}>
          <p className={styles.subtitle}>
            Built for growing teams where leads, tickets, or orders are moving faster than your systems can keep up.
          </p>
        </div>
        
        <div className={styles.actions}>
          <Link href="#audit" className={styles.primaryBtn}>
            Show Me Where I&apos;m Losing Money — Free
          </Link>
          <Link href="#demo" className={styles.secondaryBtn}>
            See What This Looks Like For You <span className={styles.arrow}>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
