import styles from './ComparisonSection.module.css';

export default function ComparisonSection() {
  const rightNowItems = [
    "Lead ownership is difficult to track.",
    "Customer context is spread across tools.",
    "Follow-ups depend on manual reminders.",
    "Pipeline visibility takes extra effort.",
  ];

  const withFinancifyItems = [
    "Each lead has an accountable human owner.",
    "Conversations and customer records stay connected.",
    "Overdue leads can enter configured escalation workflows.",
    "Teams can see activity and performance in context.",
  ];

  return (
    <section className={styles.comparisonSection} id="comparison">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>â€¢ THE DIFFERENCE</span>
          <h2 className={styles.title}>
            Scattered work. <em>VS. Connected operations.</em>
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
                WITHOUT A CONNECTED WORKSPACE
              </div>
            </div>
            
            <div className={styles.cardHeaderArea}>
              <h3 className={styles.cardTitleLight}>Work spread across disconnected tools</h3>
              <p className={styles.cardSubtitleLight}>
                Important details depend on messages, separate records, and someone remembering what to do next.
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
                WITH FINANCIFY
              </div>
            </div>
            
            <div className={styles.cardHeaderArea}>
              <h3 className={styles.cardTitleDark}>One clearer view of customer work</h3>
              <p className={styles.cardSubtitleDark}>
                Connect lead ownership, customer context, and operational activity in one workspace.
              </p>
              <hr className={styles.dividerDark} />
            </div>

            <div className={styles.innerBox}>
              <ul className={styles.list}>
                {withFinancifyItems.map((item, i) => (
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
