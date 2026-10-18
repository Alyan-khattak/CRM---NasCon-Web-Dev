"use client";

import { useState } from 'react';
import AnimatedList from './AnimatedList';
import styles from './ProblemSection.module.css';

export default function InboxCard({ fakeChats }: { fakeChats: { title: string; message: string; time: string; avatar: string }[] }) {
  const [unread, setUnread] = useState<number | string>(0);

  return (
    <div className={`${styles.cardVisual} ${styles.cardVisualInbox}`}>
      <div className={styles.inboxHeader}>
        <div className={styles.inboxHeaderLeft}>
          <span>Inbox</span>
          <div className={styles.clockIcon}>
            <div className={styles.clockHand}></div>
          </div>
        </div>
        <span className={styles.unreadBadgeFixed}>{unread}</span>
      </div>
      <AnimatedList 
        items={fakeChats}
        autoScroll={true}
        displayScrollbar={false}
        onScrolledCountChange={setUnread}
      />
    </div>
  );
}
