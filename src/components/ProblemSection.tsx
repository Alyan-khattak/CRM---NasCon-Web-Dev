import styles from "./ProblemSection.module.css";
import InboxCard from "./InboxCard";

const fakeChats = Array.from({ length: 30 }).map((_, i) => {
  const hours = Math.floor(i / 2) + 1;
  return { 
    title: i % 3 === 0 ? "John Doe" : i % 3 === 1 ? "Acme Corp" : "Sarah Smith",
    message: i % 3 === 0 ? "I'd like to book a demo..." : i % 3 === 1 ? "What are your pricing plans?" : "Can you help me set up?",
    time: i === 0 ? "just now" : i === 1 ? "2m ago" : i === 2 ? "5m ago" : `${hours}h ago`,
    avatar: `https://i.pravatar.cc/150?u=${i + 100}`,
  };
});

export default function ProblemSection() {
  return (
    <section className={styles.problemSection} id="problem">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>• THE PROBLEM</span>
          <h2 className={styles.title}>
            You&apos;re not failing. <em>Your systems are.</em>
          </h2>
          <p className={styles.description}>
            You didn&apos;t build this business to spend your nights untangling WhatsApp threads. 
            Or watching your best salesperson do data entry an intern could do. 
            That 2 AM lead who never got a reply? That&apos;s not bad luck — it&apos;s a broken system quietly costing you money every single day you don&apos;t fix it.
            <br /><br />
            Here&apos;s what that&apos;s really costing you right now:
          </p>
        </div>

        <div className={styles.cardsGrid}>
          {/* Card 1 */}
          <div className={styles.card}>
            <InboxCard fakeChats={fakeChats} />
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>You&apos;re losing 73% of your leads</h3>
              <p className={styles.cardText}>
                ...in the first hour alone — because nobody replied fast enough. Olema replies in milliseconds, every time, so every dollar you spend on ads actually pays off.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className={styles.card}>
            <div className={`${styles.cardVisual} ${styles.cardVisualAdmin}`}>
              {/* Flying Data Block */}
              <div className={styles.flyingData}></div>
              
              {/* Cursor */}
              <div className={styles.cursorArrowSVG}>
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.158 5.617C9.569 5.093 8.5 5.512 8.5 6.301V25.326C8.5 26.069 9.387 26.438 9.9 25.9L16.273 19.33H24.32C25.04 19.33 25.438 18.455 24.937 17.95L10.158 5.617Z" fill="var(--foreground)" stroke="var(--background)" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Window A - Salesforce */}
              <div className={`${styles.windowApp} ${styles.windowLeft}`}>
                <div className={styles.winHeader}>
                  <div className={styles.winDots}>
                    <div className={styles.dotRed}></div>
                    <div className={styles.dotYellow}></div>
                    <div className={styles.dotGreen}></div>
                  </div>
                  <div className={styles.winTitle}>Salesforce</div>
                </div>
                <div className={styles.winBody}>
                  <div className={`${styles.winSkeleton} ${styles.winSkeletonHighlight}`}></div>
                  <div className={styles.winSkeleton}></div>
                  <div className={styles.winSkeleton}></div>
                </div>
              </div>

              {/* Window B - Zendesk */}
              <div className={`${styles.windowApp} ${styles.windowRight}`}>
                <div className={styles.winHeader}>
                  <div className={styles.winDots}>
                    <div className={styles.dotRed}></div>
                    <div className={styles.dotYellow}></div>
                    <div className={styles.dotGreen}></div>
                  </div>
                  <div className={styles.winTitle}>Zendesk</div>
                </div>
                <div className={styles.winBody}>
                  <div className={styles.winSkeleton}></div>
                  <div className={`${styles.winSkeleton} ${styles.winSkeletonPaste}`}></div>
                  <div className={styles.winSkeleton}></div>
                </div>
              </div>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>You could get back 2,400+ hours a year</h3>
              <p className={styles.cardText}>
                That&apos;s what mid-market teams reclaim once Olema takes the busywork off their plate.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className={styles.card}>
            <div className={`${styles.cardVisual} ${styles.cardVisualSync}`}>
              
              {/* Stripe Box */}
              <div className={styles.syncBoxLeft}>
                <div className={styles.syncBoxHeader}>Stripe</div>
                <div className={styles.syncBoxStatus}>Live</div>
              </div>

              {/* Quickbooks Box */}
              <div className={styles.syncBoxRight}>
                <div className={styles.syncBoxHeader}>Quickbooks</div>
                <div className={styles.syncBoxStatusContainer}>
                  <span className={styles.statusSyncing}>Syncing</span>
                  <span className={styles.statusFailed}>Failed</span>
                </div>
              </div>

              {/* Sync Pipeline connecting them */}
              <div className={styles.syncPipeline}>
                <div className={styles.syncWire}></div>
                <div className={styles.syncWireLeft}></div>
                <div className={styles.syncWireRight}></div>
                <div className={styles.syncSpark}></div>
              </div>

            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>You could cut data errors by 99.2%</h3>
              <p className={styles.cardText}>
                No more chasing down a wrong order because someone mistyped a number at 6 PM on a Friday.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
