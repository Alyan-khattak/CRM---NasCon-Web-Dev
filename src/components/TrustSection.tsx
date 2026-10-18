"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import styles from "./TrustSection.module.css";
import Image from "next/image";
import SplitText from "./SplitText";

export default function TrustSection() {
  const targetRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  const card1Width = useTransform(scrollYProgress, [0, 1], ["100%", "60%"]);
  const card2Width = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  return (
    <section ref={targetRef} className={styles.scrollSection}>
      <div className={styles.stickyContainer}>
        
        {/* Card 1 */}
        <motion.div style={{ width: card1Width }} className={styles.cardContainer}>
          <div className={styles.backgroundWrapper}>
            <Image 
              src="/images/bg1.jpg"
              alt="Background 1"
              fill
              className={styles.backgroundImage}
              priority
            />
            <div className={styles.evenOverlay}></div>
          </div>
          <div className={styles.sectionContent}>
            <SplitText
              text="The full picture, finally connected."
              className={styles.title}
              delay={50}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="left"
            />
            <SplitText
              text="Leads, conversations, appointments, payments, and team activity are part of the same customer story. Financify helps your team move from scattered updates to a clearer view of what happens next."
              className={styles.description}
              delay={20}
              duration={0.4}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 20 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="left"
            />
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div style={{ width: card2Width }} className={styles.cardContainer}>
          <div className={styles.backgroundWrapper}>
            <Image 
              src="/images/bg2.jpg"
              alt="Background 2"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className={styles.backgroundImage}
              priority
            />
            <div className={styles.evenOverlay}></div>
          </div>
          <div className={styles.card2Inner}>
            <SplitText
              text="Human ownership. Every step."
              className={styles.titleSmall}
              delay={50}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="left"
            />
            <SplitText
              text="Conversational AI can support interactions and offer recommendations. A designated human remains accountable for each lead and customer relationship — with full context available at every step."
              className={styles.descriptionSmall}
              delay={20}
              duration={0.4}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 20 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="left"
            />
          </div>
        </motion.div>

      </div>
    </section>
  );
}
