"use client";

import styles from "./ProofSection.module.css";
import { motion } from "motion/react";

export default function ProofSection() {
  return (
    <section className={styles.section} id="proof">
      <div className={styles.container}>
        <div className={styles.leftCol}>
          <motion.h2 
            className={styles.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            Don&apos;t take our word for it. <em>Run it.</em>
          </motion.h2>
        </div>

        <motion.div 
          className={styles.rightCol}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          <p className={styles.subheading}>
            We&apos;re not going to point you to a wall of logos and ask you to trust us. Instead, we&apos;ll put your agent to work in your business, <span className={styles.highlight}>for free, for 7 full days</span> — and let the results speak. You&apos;ll see exactly how many leads it caught, how fast it responded, and how much time it gave back, before you spend a single rupee.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
