"use client";

import type React from "react";
import { useState } from "react";
import { ArrowUpRight, Calendar } from "lucide-react";
import { motion } from "motion/react";
import styles from "./CTASection.module.css";

export default function CTASection() {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement | HTMLSpanElement>) => {
    e.preventDefault();
    setIsClicked(true);

    setTimeout(() => {
      setShowSuccess(true);
    }, 500);
  };

  const handleBookCall = () => {
    window.open("https://cal.com/jatin-yadav05/15min", "_blank");
  };

  return (
    <section className={styles.section} id="cta">
      <div className={styles.container}>
        
        {/* Success View (after clicking circle button) */}
        <div
          className={styles.successView}
          style={{
            opacity: showSuccess ? 1 : 0,
            transform: showSuccess ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
            pointerEvents: showSuccess ? "auto" : "none",
          }}
        >
          <div className={styles.successHeadingGroup}>
            <span
              className={styles.successBadge}
              style={{
                transform: showSuccess ? "translateY(0)" : "translateY(10px)",
                opacity: showSuccess ? 1 : 0,
                transitionDelay: "100ms",
              }}
            >
              PERFECT
            </span>
            <h3
              className={styles.successTitle}
              style={{
                transform: showSuccess ? "translateY(0)" : "translateY(10px)",
                opacity: showSuccess ? 1 : 0,
                transitionDelay: "200ms",
              }}
            >
              Let&apos;s talk
            </h3>
          </div>

          <button
            onClick={handleBookCall}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
            className={styles.bookCallButton}
            style={{
              transform: showSuccess
                ? isButtonHovered
                  ? "translateY(0) scale(1.02)"
                  : "translateY(0) scale(1)"
                : "translateY(15px) scale(1)",
              opacity: showSuccess ? 1 : 0,
              transitionDelay: "150ms",
            }}
          >
            <div
              className={styles.lineLeft}
              style={{
                transform: isButtonHovered ? "scaleX(0)" : "scaleX(1)",
                opacity: isButtonHovered ? 0 : 0.5,
              }}
            />

            <div
              className={styles.bookCallInner}
              style={{
                borderColor: isButtonHovered ? "var(--primary, #1077d7)" : "rgba(255, 255, 255, 0.2)",
                backgroundColor: isButtonHovered ? "var(--primary, #1077d7)" : "transparent",
                boxShadow: isButtonHovered ? "0 0 30px rgba(16, 119, 215, 0.35)" : "none",
              }}
            >
              <Calendar
                className={styles.bookCallIcon}
                strokeWidth={1.5}
                style={{
                  color: "#ffffff",
                }}
              />
              <span
                className={styles.bookCallText}
                style={{
                  color: "#ffffff",
                }}
              >
                Book a call
              </span>
              <ArrowUpRight
                className={styles.bookCallIcon}
                strokeWidth={1.5}
                style={{
                  color: "#ffffff",
                  transform: isButtonHovered ? "translate(3px, -3px) scale(1.1)" : "translate(0, 0) scale(1)",
                }}
              />
            </div>

            <div
              className={styles.lineRight}
              style={{
                transform: isButtonHovered ? "scaleX(0)" : "scaleX(1)",
                opacity: isButtonHovered ? 0 : 0.5,
              }}
            />
          </button>

          <span
            className={styles.subtextCall}
            style={{
              transform: showSuccess ? "translateY(0)" : "translateY(10px)",
              opacity: showSuccess ? 1 : 0,
              transitionDelay: "450ms",
            }}
          >
            15 MIN INTRO CALL
          </span>
        </div>

        {/* Interactive Main Heading & Circle Button with Motion Entrance */}
        <motion.div
          className={styles.interactiveGroup}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            pointerEvents: isClicked ? "none" : "auto",
          }}
        >
          <div className={styles.headingFlex}>
            <h2
              className={styles.mainHeading}
              style={{
                opacity: isClicked ? 0 : 1,
                transform: isClicked ? "translateY(-40px) scale(0.95)" : "translateY(0) scale(1)",
              }}
            >
              <span className={styles.overflowHide}>
                <span
                  className={styles.translateSpan}
                  style={{
                    transform: isHovered && !isClicked ? "translateY(-8%)" : "translateY(0)",
                  }}
                >
                  Let&apos;s Find Out
                </span>
              </span>
              <span className={styles.overflowHide}>
                <span
                  className={styles.translateSpan}
                  style={{
                    transitionDelay: "75ms",
                    transform: isHovered && !isClicked ? "translateY(-8%)" : "translateY(0)",
                  }}
                >
                  <span className={styles.mutedWord}>What&apos;s Costing You</span>
                </span>
              </span>
            </h2>

            {/* Circle Button */}
            <div className={styles.circleBtnContainer}>
              <div
                className={styles.circleBg}
                style={{
                  borderColor: isClicked ? "#ffffff" : isHovered ? "var(--primary, #1077d7)" : "rgba(255, 255, 255, 0.25)",
                  backgroundColor: isClicked ? "transparent" : isHovered ? "var(--primary, #1077d7)" : "transparent",
                  transform: isClicked ? "scale(3)" : isHovered ? "scale(1.1)" : "scale(1)",
                  opacity: isClicked ? 0 : 1,
                  transitionDuration: isClicked ? "700ms" : "500ms",
                }}
              />
              <ArrowUpRight
                className={styles.circleArrowIcon}
                style={{
                  transform: isClicked
                    ? "translate(100px, -100px) scale(0.5)"
                    : isHovered
                      ? "translate(2px, -2px)"
                      : "translate(0, 0)",
                  opacity: isClicked ? 0 : 1,
                  color: "#ffffff",
                  transitionDuration: isClicked ? "600ms" : "500ms",
                }}
              />
            </div>
          </div>

          {/* Left & Right Lines */}
          <div className={styles.leftDashWrapper}>
            <div
              className={styles.dashLine}
              style={{
                transform: isClicked ? "scaleX(0) translateX(-20px)" : isHovered ? "scaleX(1.5)" : "scaleX(1)",
                opacity: isClicked ? 0 : isHovered ? 1 : 0.5,
              }}
            />
          </div>
          <div className={styles.rightDashWrapper}>
            <div
              className={styles.dashLine}
              style={{
                transform: isClicked ? "scaleX(0) translateX(20px)" : isHovered ? "scaleX(1.5)" : "scaleX(1)",
                opacity: isClicked ? 0 : isHovered ? 1 : 0.5,
              }}
            />
          </div>
        </motion.div>

        {/* Subtitle Description with Motion Entrance */}
        <motion.div
          className={styles.footerGroup}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          style={{
            opacity: isClicked ? 0 : 1,
            transform: isClicked ? "translateY(20px)" : "translateY(0)",
            pointerEvents: isClicked ? "none" : "auto",
          }}
        >
          <p className={styles.description}>
            No pitch deck. No pressure. Just a free 30-minute conversation where we show you, specifically, what&apos;s slowing your business down — and what it would look like fixed.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
