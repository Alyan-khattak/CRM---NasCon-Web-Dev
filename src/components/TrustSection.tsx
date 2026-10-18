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
              text="It Actually Understands What You Need."
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
              text="You've probably dealt with clunky chatbots that break the second someone asks something unexpected. This isn't that. Your Olema agent understands what's actually being asked, checks your own data, and makes the right call — just like your best employee would."
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
              className={styles.backgroundImage}
              priority
            />
            <div className={styles.evenOverlay}></div>
          </div>
          <div className={styles.card2Inner}>
            <SplitText
              text="You're Always In Control."
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
              text="Your agent knows exactly where its job ends. The moment something needs a human touch, it hands the conversation straight to your team — with full context, so nobody has to repeat themselves."
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
