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
            Don&apos;t just imagine the workflow. <em>See it in action.</em>
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
            Walk through the way Financify connects leads, customer conversations, follow-ups, and operational visibility. <span className={styles.highlight}>See how the workflow fits your team&apos;s day-to-day work</span> before making assumptions about what you need.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
