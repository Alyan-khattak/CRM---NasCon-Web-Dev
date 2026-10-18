import styles from './ComparisonSection.module.css';

export default function ComparisonSection() {
  const rightNowItems = [
    "You spend minutes — sometimes hours — qualifying one lead",
    "Your team's typos are stalling out orders",
    "Your customers wait all weekend for a reply",
    "Your payroll grows just to keep up with growth"
  ];

  const withOlemaItems = [
    "It happens in milliseconds, automatically",
    "99.2% accuracy, every order, every time",
    "They get answered instantly, in English or Urdu",
    "One flat rate. Scale as much as you want"
  ];

  return (
    <section className={styles.comparisonSection} id="comparison">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>• COMPARISON</span>
          <h2 className={styles.title}>
            What you&apos;re doing now. <em>VS what you could have.</em>
          </h2>
        </div>
        
        <div className={styles.cardsContainer}>
          {/* Left Card */}
          <div className={styles.cardLight}>
            <div className={styles.tagContainer}>
              <div className={styles.tag}>
                <span className={styles.tagIconLight}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 14V2"/>
                    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
                  </svg>
                </span>
                Right now
              </div>
            </div>
            
            <div className={styles.cardHeaderArea}>
              <h3 className={styles.cardTitleLight}>Common Coaching Approaches</h3>
              <p className={styles.cardSubtitleLight}>
                Many programs rely on broad guidance that may not address the root cause of challenges.
              </p>
              <hr className={styles.dividerLight} />
            </div>

            <div className={styles.innerBox}>
              <ul className={styles.list}>
                {rightNowItems.map((item, i) => (
                  <li key={i} className={styles.listItem}>
                    <svg className={styles.listIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <span className={styles.itemText}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Card */}
          <div className={styles.cardDark}>
            <div className={styles.tagContainer}>
              <div className={styles.tag}>
                <span className={styles.tagIconDark}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/>
                    <path d="M9 18h6"/>
                    <path d="M10 22h4"/>
                  </svg>
                </span>
                With Olema
              </div>
            </div>
            
            <div className={styles.cardHeaderArea}>
              <h3 className={styles.cardTitleDark}>Olema Approach</h3>
              <p className={styles.cardSubtitleDark}>
                Every session is designed to create meaningful progress through focused guidance and support.
              </p>
              <hr className={styles.dividerDark} />
            </div>

            <div className={styles.innerBox}>
              <ul className={styles.list}>
                {withOlemaItems.map((item, i) => (
                  <li key={i} className={styles.listItem}>
                    <svg className={styles.listIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <span className={styles.itemText}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
