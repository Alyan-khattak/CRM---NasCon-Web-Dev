"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""} ${isMobileMenuOpen ? styles.menuOpenNav : ""}`}>
        <div className={styles.container}>
          <div className={styles.logoContainer}>
            <Link href="/" className={styles.logoText}>
              Olema
            </Link>
          </div>
          
          <nav className={styles.navLinks}>
            <Link href="#agents">Agents</Link>
            <Link href="#how-it-works">How It Works</Link>
            <Link href="#security">Security</Link>
            <Link href="#faqs">FAQs</Link>
          </nav>
          
          <div className={styles.actions}>
            <div className={styles.desktopContact}>
              <Link href="#contact" className={styles.contactBtn}>
                Contact Us
              </Link>
            </div>
            <button 
              className={`${styles.mobileMenuBtn} ${isMobileMenuOpen ? styles.menuOpen : ""}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>
      
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ""}`}>
        <div className={styles.mobileMenuContent}>
          <nav className={styles.mobileNavLinks}>
            <Link href="/" className={styles.mobileNavLinkGray} onClick={() => setIsMobileMenuOpen(false)}>HOME</Link>
            <Link href="#agents" onClick={() => setIsMobileMenuOpen(false)}>AGENTS</Link>
            <Link href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>HOW IT WORKS</Link>
            <Link href="#security" onClick={() => setIsMobileMenuOpen(false)}>SECURITY</Link>
            <Link href="#faqs" onClick={() => setIsMobileMenuOpen(false)}>FAQS</Link>
            <Link href="#contact" onClick={() => setIsMobileMenuOpen(false)}>CONTACT</Link>
          </nav>
          
          <div className={styles.mobileSocials}>
            <div className={styles.socialsLabel}>FOLLOW US</div>
            <div className={styles.socialsList}>
              <a href="#">INSTAGRAM</a>
              <a href="#">LINKEDIN</a>
              <a href="#">TWITTER</a>
              <a href="#">YOUTUBE</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
