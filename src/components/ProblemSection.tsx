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
          <span className={styles.eyebrow}>â€¢ THE PROBLEM</span>
          <h2 className={styles.title}>
            Your team isn&apos;t the problem. <em>Disconnected work is.</em>
          </h2>
          <p className={styles.description}>
            A lead arrives. Someone needs to respond. But the right person is busy, a message lives in another app, or nobody knows who owns the next step.
            <br /><br />
            Meanwhile, customer details, conversations, appointments, and payment updates sit in different places. Your team spends time chasing context instead of moving work forward.
            <br /><br />
            Financify brings the work together â€” and makes responsibility visible.
          </p>
        </div>

        <div className={styles.cardsGrid}>
          {/* Card 1 */}
          <div className={styles.card}>
            <InboxCard fakeChats={fakeChats} />
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Every lead needs a clear owner.</h3>
              <p className={styles.cardText}>
                When assignments and follow-ups are informal, a promising enquiry can wait unnoticed. Give each lead an accountable human owner, with acknowledgement windows and escalation when action is overdue.
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

              {/* Window A - Conversations */}
              <div className={`${styles.windowApp} ${styles.windowLeft}`}>
                <div className={styles.winHeader}>
                  <div className={styles.winDots}>
                    <div className={styles.dotRed}></div>
                    <div className={styles.dotYellow}></div>
                    <div className={styles.dotGreen}></div>
                  </div>
                  <div className={styles.winTitle}>Conversations</div>
                </div>
                <div className={styles.winBody}>
                  <div className={`${styles.winSkeleton} ${styles.winSkeletonHighlight}`}></div>
                  <div className={styles.winSkeleton}></div>
                  <div className={styles.winSkeleton}></div>
                </div>
              </div>

              {/* Window B - Calendar */}
              <div className={`${styles.windowApp} ${styles.windowRight}`}>
                <div className={styles.winHeader}>
                  <div className={styles.winDots}>
                    <div className={styles.dotRed}></div>
                    <div className={styles.dotYellow}></div>
                    <div className={styles.dotGreen}></div>
                  </div>
                  <div className={styles.winTitle}>Calendar</div>
                </div>
                <div className={styles.winBody}>
                  <div className={styles.winSkeleton}></div>
                  <div className={`${styles.winSkeleton} ${styles.winSkeletonPaste}`}></div>
                  <div className={styles.winSkeleton}></div>
                </div>
              </div>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Stop piecing together the story.</h3>
              <p className={styles.cardText}>
                Customer conversations, opportunities, appointments, and payment updates belong in the same context. Give your team a clearer view of the relationship without relying on scattered records.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className={styles.card}>
            <div className={`${styles.cardVisual} ${styles.cardVisualSync}`}>
              
              {/* Pipeline Box */}
              <div className={styles.syncBoxLeft}>
                <div className={styles.syncBoxHeader}>Dashboard</div>
                <div className={styles.syncBoxStatus}>Live</div>
              </div>

              {/* Activity Box */}
              <div className={styles.syncBoxRight}>
                <div className={styles.syncBoxHeader}>Activity</div>
                <div className={styles.syncBoxStatusContainer}>
                  <span className={styles.statusSyncing}>On Track</span>
                  <span className={styles.statusFailed}>Overdue</span>
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
              <h3 className={styles.cardTitle}>Know what needs attention.</h3>
              <p className={styles.cardText}>
                See overdue leads, escalations, employee availability, and pipeline activity in one operational view. Make the next action easier to identify.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
