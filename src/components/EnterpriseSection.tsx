"use client";

import { useRef } from 'react';
import styles from './EnterpriseSection.module.css';
import { motion, useScroll, useTransform } from 'motion/react';

interface FeatureItem {
  badge: string;
  title: string;
  description: string;
  youGet: string;
}

function StackedCardItem({ feature, index, total }: { feature: FeatureItem; index: number; total: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "start 12vh"]
  });

  // Smooth scale entrance as card reaches its sticky position
  const cardScale = useTransform(scrollYProgress, [0, 1], [0.94 + index * 0.02, 1]);

  return (
    <motion.div 
      ref={cardRef}
      key={index} 
      className={styles.stackedCard} 
      style={{ 
        top: `calc(12vh + ${index * 28}px)`,
        scale: cardScale,
      }}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.cardInner}>
        <div className={styles.cardLeft}>
          <h3 className={styles.title}>{feature.title}</h3>
          <p className={styles.description}>{feature.description}</p>
        </div>
        
        <div className={styles.cardRight}>
          <div className={styles.illustrationWrapper}>
            {index === 0 && (
              <div className={styles.integrationVisual}>
                <div className={styles.centralHub}>
                  <div className={styles.hubCore}>Olema AI</div>
                  <div className={styles.pulseRing}></div>
                  <div className={styles.pulseRing2}></div>
                </div>

                <div className={`${styles.nodeItem} ${styles.nodeCrm}`}>
                  <div className={styles.nodeIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <span>CRM System</span>
                </div>

                <div className={`${styles.nodeItem} ${styles.nodeErp}`}>
                  <div className={styles.nodeIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                  </div>
                  <span>ERP / Ops</span>
                </div>

                <div className={`${styles.nodeItem} ${styles.nodeComms}`}>
                  <div className={styles.nodeIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  </div>
                  <span>WhatsApp & Comms</span>
                </div>

                <div className={`${styles.nodeItem} ${styles.nodeDb}`}>
                  <div className={styles.nodeIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                      <path d="M21 19c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                      <path d="M3 5v14"></path>
                      <path d="M21 5v14"></path>
                    </svg>
                  </div>
                  <span>Database</span>
                </div>
              </div>
            )}

            {index === 1 && (
              <div className={styles.analyticsVisual}>
                <div className={styles.metricsGrid}>
                  <div className={styles.metricCard}>
                    <span className={styles.metricValue}>1,420+</span>
                    <span className={styles.metricLabel}>Leads Qualified</span>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricValue}>99.4%</span>
                    <span className={styles.metricLabel}>Tickets Closed</span>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricValue}>3,850</span>
                    <span className={styles.metricLabel}>Tasks Done</span>
                  </div>
                  <div className={`${styles.metricCard} ${styles.highlightMetric}`}>
                    <span className={styles.metricValue}>+340%</span>
                    <span className={styles.metricLabel}>Verified ROI</span>
                  </div>
                </div>

                <div className={styles.chartContainer}>
                  <div className={styles.chartBarWrapper}>
                    <div className={styles.chartBar} style={{ height: '40%' }}></div>
                    <div className={styles.chartBar} style={{ height: '60%' }}></div>
                    <div className={styles.chartBar} style={{ height: '50%' }}></div>
                    <div className={styles.chartBar} style={{ height: '80%' }}></div>
                    <div className={`${styles.chartBar} ${styles.chartBarActive}`} style={{ height: '96%' }}></div>
                  </div>
                  <div className={styles.liveIndicator}>
                    <span className={styles.liveDot}></span>
                    <span>Live ROI Dashboard</span>
                  </div>
                </div>
              </div>
            )}

            {index === 2 && (
              <div className={styles.protectionVisual}>
                <div className={styles.shieldContainer}>
                  <div className={styles.shieldIconWrapper}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M12 8v4"/>
                      <path d="M12 16h.01"/>
                    </svg>
                  </div>
                  <div className={styles.shieldGlow}></div>
                </div>

                <div className={styles.securityBadges}>
                  <div className={styles.securityBadge}>
                    <span className={styles.secDot}></span>
                    <span>256-Bit End-to-End Encryption</span>
                  </div>
                  <div className={styles.securityBadge}>
                    <span className={styles.secDot}></span>
                    <span>Zero External Model Training</span>
                  </div>
                  <div className={styles.securityBadge}>
                    <span className={styles.secDot}></span>
                    <span>Role-Based Access Control</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function EnterpriseSection() {
  const features: FeatureItem[] = [
    {
      badge: "SEAMLESS INTEGRATION",
      title: "Keep Everything You Already Use.",
      description: "You don't have to rip out your CRM, your ERP, or any tool your team already knows. Your agent simply plugs in and starts working alongside what you've already got.",
      youGet: "All the upside, none of the painful switch."
    },
    {
      badge: "REAL-TIME ANALYTICS",
      title: "See Exactly What You're Getting.",
      description: "You'll never wonder if this is working. Your own dashboard shows you, in real time, every lead qualified, every ticket closed, every task done.",
      youGet: "Full visibility into your ROI, without doing any of the manual tracking yourself."
    },
    {
      badge: "IRONCLAD PROTECTION",
      title: "Your Data Stays Yours. Full Stop.",
      description: "Everything is encrypted, access-controlled, and built to meet enterprise standards. Your data is never used to train anything outside your business. Ever.",
      youGet: "The freedom to scale fast without ever worrying about your reputation."
    }
  ];

  return (
    <section className={styles.section} id="enterprise">
      <div className={styles.container}>
        <motion.div 
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className={styles.eyebrow}>• ENTERPRISE GRADE</span>
          <h2 className={styles.mainTitle}>
            Enterprise grade. <em>Zero friction.</em>
          </h2>
        </motion.div>
        
        <div className={styles.stackContainer}>
          {features.map((feature, index) => (
            <StackedCardItem key={index} feature={feature} index={index} total={features.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
