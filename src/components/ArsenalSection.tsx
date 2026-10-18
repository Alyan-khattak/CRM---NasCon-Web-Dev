"use client";

import styles from "./ArsenalSection.module.css";
import { useState } from "react";

const showcases = [
  {
    id: "crm",
    tabTitle: "CRM & Customer Context",
    tag: "Contacts â€¢ Opportunities â€¢ History",
    title: "A complete picture of every customer.",
    description: "Keep contact details, opportunities, conversations, appointments, payments, and activity history connected to the customer record.",
    youGet: "Your team gets the context it needs before taking the next step."
  },
  {
    id: "leads",
    tabTitle: "Lead Ownership",
    tag: "Assignment â€¢ Escalation â€¢ Recovery",
    title: "A lead never has to be a guessing game.",
    description: "Route leads using configured assignment rules, account for employee availability, and escalate when an acknowledgement window expires.",
    youGet: "Everyone can see who is responsible and what needs attention."
  },
  {
    id: "appointment",
    tabTitle: "Appointments",
    tag: "Calendar-Connected â€¢ Google OAuth",
    title: "Appointments with the right context.",
    description: "Connect employee calendars and manage appointments linked to the relevant contact or opportunity.",
    youGet: "Keep scheduling and customer records connected."
  },
  {
    id: "payments",
    tabTitle: "Payments",
    tag: "Payment Requests â€¢ Status Tracking",
    title: "Know what is requested. Know what is paid.",
    description: "Create payment requests from opportunities and keep payment outcomes visible alongside the customer relationship.",
    youGet: "Separate expected revenue from payments confirmed by the provider."
  },
];

const tabGroups = [
  {
    id: "group-1",
    tabTitle: "CORE WORKFLOWS",
    showcases: [
      showcases[0], // CRM
      showcases[1], // Leads
      showcases[2], // Appointments
      showcases[3], // Payments
    ]
  },
  {
    id: "group-2",
    tabTitle: "CONFIGURED FOR YOUR TEAM",
    showcases: [
      showcases[0], // CRM
      showcases[1], // Leads
      showcases[2], // Appointments
      showcases[3], // Payments
    ]
  }
];

export default function ArsenalSection() {
  const [activeTab, setActiveTab] = useState(tabGroups[0].id);
  const activeGroup = tabGroups.find(g => g.id === activeTab);

  return (
    <section className={styles.arsenalSection} id="agents">
      <div className={styles.backgroundEffects}></div>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>â€¢ THE PLATFORM</span>
          <h2 className={styles.title}>
            One workspace.<br /><em>A clearer way to work.</em>
          </h2>
        </div>

        <div className={styles.contentLayout}>
          {/* Tabs - Left side */}
          <div className={styles.tabsCol}>
            <div className={styles.tabsHeader}>
              Explore the workflows your team manages every day <span className={styles.arrowDown}>â†“</span>
            </div>
            <div className={styles.tabsList}>
              {tabGroups.map((group) => (
                <button 
                  key={group.id}
                  className={`${styles.tabBtn} ${activeTab === group.id ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab(group.id)}
                >
                  {group.tabTitle}
                </button>
              ))}
            </div>
          </div>

          {/* Cards/Content - Right side */}
          <div className={styles.contentCol}>
            <p className={styles.cardsDescription}>
              From the first enquiry to the next appointment, Financify connects the records, people, and actions that keep customer work moving.
            </p>
            {activeGroup?.showcases.map((content) => (
              <div className={styles.showcaseCard} key={content.id}>
                <h3 className={styles.cardTitle}>{content.title}</h3>
                
                <div className={styles.cardIllustration} data-type={content.id}>
                  {content.id === "crm" ? (
                    <div className={styles.chatAnimationContainer}>
                      <div className={`${styles.chatBubble} ${styles.chatCustomer}`}>
                        <div className={styles.chatText}>Contact</div>
                      </div>
                      <div className={`${styles.chatBubble} ${styles.chatAi}`}>
                        <div className={styles.chatText}>Open Opportunities Â· Conversation History</div>
                      </div>
                      <div className={`${styles.chatBubble} ${styles.chatCustomer} ${styles.chatDelay}`}>
                        <div className={styles.chatText}>Next Appointment</div>
                      </div>
                    </div>
                  ) : content.id === "leads" ? (
                    <div className={styles.leadsTableContainer}>
                      <div className={styles.leadsGridOverlay}></div>
                      <div className={styles.leadsTableHeader}>
                        <div className={styles.leadsCol}>Lead</div>
                        <div className={styles.leadsCol}>Assigned To</div>
                        <div className={styles.leadsCol}>Status</div>
                      </div>
                      <div className={styles.leadsTableBody}>
                        <div className={`${styles.leadsRow} ${styles.leadsRow1}`}>
                          <div className={styles.leadsCol}>New Lead</div>
                          <div className={styles.leadsCol}><span className={styles.scoreHigh}>Assigned</span></div>
                          <div className={styles.leadsCol}><span className={styles.actionRoute}>Acknowledged</span></div>
                        </div>
                        <div className={`${styles.leadsRow} ${styles.leadsRow2}`}>
                          <div className={styles.leadsCol}>New Lead</div>
                          <div className={styles.leadsCol}><span className={styles.scoreMed}>Pending</span></div>
                          <div className={styles.leadsCol}><span className={styles.actionNurture}>Awaiting Acknowledgement</span></div>
                        </div>
                        <div className={`${styles.leadsRow} ${styles.leadsRow3}`}>
                          <div className={styles.leadsCol}>New Lead</div>
                          <div className={styles.leadsCol}><span className={styles.scoreHigh}>Reassigned</span></div>
                          <div className={styles.leadsCol}><span className={styles.actionRoute}>Escalation</span></div>
                        </div>
                      </div>
                    </div>
                  ) : content.id === "appointment" ? (
                    <div className={styles.apptTimelineContainer}>
                      <div className={styles.apptTimeline}>
                        <div className={styles.apptTimeCol}>
                          <span>9 AM</span>
                          <span>10 AM</span>
                          <span>11 AM</span>
                        </div>
                        <div className={styles.apptScheduleCol}>
                          <div className={styles.apptLine} style={{ top: '10px' }}></div>
                          <div className={styles.apptLine} style={{ top: '60px' }}></div>
                          <div className={styles.apptLine} style={{ top: '110px' }}></div>
                          
                          <div className={styles.apptExistingBlock}>
                            <div className={styles.apptBlockTitle}>Calendar Connected</div>
                          </div>
                          
                          <div className={styles.apptNewBlock}>
                            <div className={styles.apptBlockInner}>
                              <span className={styles.apptBlockTitle}>Appointment</span>
                              <span className={styles.apptBlockBadge}>Availability</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : content.id === "payments" ? (
                    <div className={styles.premiumTriageContainer}>
                      <div className={styles.triageQueue}>
                        <div className={styles.triageScanner}></div>
                        
                        <div className={styles.triageItemWrapNormal1}>
                          <div className={styles.triageItem}>
                            <div className={styles.triageItemTitle}>Payment Request</div>
                            <div className={styles.triageItemBadge}>Pending</div>
                          </div>
                        </div>
                        
                        <div className={styles.triageItemWrapNormal2}>
                          <div className={styles.triageItem}>
                            <div className={styles.triageItemTitle}>Payment Request</div>
                            <div className={styles.triageItemBadge}>Confirmed</div>
                          </div>
                        </div>
                        
                        <div className={styles.triageItemWrapEscalating}>
                          <div className={`${styles.triageItem} ${styles.triageItemEscalating}`}>
                            <div className={styles.triageItemTitle}>Payment Request</div>
                            <div className={styles.triageItemBadgeAnim}>
                              <span className={styles.badgeTextPending}>Pending</span>
                              <span className={styles.badgeTextUrgent}>Refunded</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                
                <div className={styles.cardFooter}>
                  <strong>Outcome:</strong> {content.youGet}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
