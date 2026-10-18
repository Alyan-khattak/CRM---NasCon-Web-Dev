"use client";

import styles from "./HowItWorksSection.module.css";
import { motion } from "motion/react";

const steps = [
  {
    id: "step-1",
    tab: "STEP 1",
    num: "1",
    title: "Capture",
    description: "Bring leads in through the supported intake channels and keep the source attached to the record.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    ),
    rowClass: styles.zrow1,
    isAccent: false,
  },
  {
    id: "step-2",
    tab: "STEP 2",
    num: "2",
    title: "Assign",
    description: "Use configured assignment rules and employee availability to establish a clear human owner, with acknowledgement windows and escalation when needed.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    rowClass: styles.zrow2,
    isAccent: false,
  },
  {
    id: "step-3",
    tab: "STEP 3",
    num: "3",
    title: "Follow Through",
    description: "Keep conversations, customer activity, appointments, and payment status connected so the next action is easier to understand.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
    rowClass: styles.zrow3,
    isAccent: true,
  },
];

export default function HowItWorksSection() {
  return (
    <section className={styles.section} id="how-it-works">
      <div className={styles.xwrap}>
        <motion.div 
          className={styles.xeyebrow}
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          â€¢ HOW FINANCIFY WORKS
        </motion.div>
        
        <motion.h2 
          className={styles.xh2}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          From first enquiry <em>to clear next step.</em>
        </motion.h2>

        <div className={styles.zig}>
          {steps.map((step, idx) => (
            <motion.div 
              key={step.id} 
              className={`${styles.zrow} ${step.rowClass}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.12 }}
            >
              {idx > 0 && (
                <>
                  <i className={`${styles.zseg} ${styles.v1}`} />
                  <i className={`${styles.zseg} ${styles.h}`} />
                  <i className={`${styles.zseg} ${styles.v2}`} />
                </>
              )}
              
              <div className={`${styles.zcard} ${step.isAccent ? styles.acc : ""}`}>
                <div className={styles.ztabVertical}>
                  <span>{step.tab}</span>
                </div>
                <div className={styles.zbody}>
                  <div className={styles.zhd}>
                    <span className={styles.zico}>{step.icon}</span>
                    <b>{step.num} Â· {step.title}</b>
                  </div>
                  <p>{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

