"use client";

import Link from "next/link";
import { motion } from "motion/react";
import styles from "./Footer.module.css";

const words = ["SHOW", "ME", "WHAT'S", "POSSIBLE →"];

const bottomLinks = [
  { label: "AGENTS", href: "#agents", isExternal: false },
  { label: "ENTERPRISE", href: "#enterprise", isExternal: false },
  { label: "SECURITY & PRIVACY", href: "#security", isExternal: false },
  { label: "FAQS", href: "#faqs", isExternal: false },
  { label: "TWITTER", href: "https://twitter.com", isExternal: true },
  { label: "LINKEDIN", href: "https://linkedin.com", isExternal: true },
];

export default function Footer() {
  const handleBookCall = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open("https://cal.com/jatin-yadav05/15min", "_blank");
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        
        {/* Main 2-Column Section */}
        <div className={styles.mainGrid}>
          
          {/* Left Column: Big CTA */}
          <div className={styles.leftCol}>
            <nav className={styles.primaryNav}>
              <motion.a
                href="https://cal.com/jatin-yadav05/15min"
                onClick={handleBookCall}
                className={styles.bigCtaLink}
                initial="initial"
                whileInView="animate"
                whileHover="hover"
                viewport={{ once: true, amount: 0.3 }}
              >
                {words.map((word, index) => (
                  <span key={word} className={styles.wordWrapper}>
                    <motion.span
                      className={styles.animatedWord}
                      variants={{
                        initial: { y: "110%", opacity: 0 },
                        animate: {
                          y: 0,
                          opacity: 1,
                          transition: {
                            duration: 0.7,
                            ease: [0.16, 1, 0.3, 1],
                            delay: index * 0.1,
                          },
                        },
                        hover: {
                          x: 10,
                          opacity: 1,
                          transition: {
                            duration: 0.3,
                            ease: "easeOut",
                            delay: index * 0.04,
                          },
                        },
                      }}
                    >
                      {word}
                    </motion.span>
                  </span>
                ))}
              </motion.a>
            </nav>
          </div>

          {/* Right Column: Olema Title aligned right of CTA */}
          <div className={styles.rightCol}>
            <div className={styles.brandBanner}>
              <motion.h2
                className={styles.brandTitle}
                initial={{ opacity: 0, y: 35, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              >
                Olema
              </motion.h2>
            </div>
          </div>

        </div>

        {/* Bottom Navigation Row */}
        <motion.div
          className={styles.bottomRow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08,
                delayChildren: 0.3,
              },
            },
          }}
        >
          {bottomLinks.map((link) => (
            <motion.div
              key={link.label}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                },
              }}
            >
              {link.isExternal ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ) : (
                <Link href={link.href}>{link.label}</Link>
              )}
            </motion.div>
          ))}
        </motion.div>

      </div>
    </footer>
  );
}
