"use client";

import styles from "./ArsenalSection.module.css";
import { useState } from "react";

const showcases = [
  {
    id: "support",
    tabTitle: "AI Customer Support",
    tag: "Omnichannel • Bilingual",
    title: "Your Customers Get Answers. You Get Your Time Back.",
    description: "No more customers stuck waiting in a queue. Your customers get instant, fluent help — in Urdu or English, on WhatsApp, your website, or by voice. The easy stuff gets handled without you lifting a finger. The tricky stuff still reaches your team.",
    youGet: "Support that grows with you, without you ever having to hire for it."
  },
  {
    id: "leads",
    tabTitle: "Inbound Lead Qualification",
    tag: "CRM-Native • Zero Drop",
    title: "Wake Up To A Pipeline, Not A Mess.",
    description: "The second someone shows interest, your agent scores them, tags them, and sends them straight to the right person on your team — while the lead is still hot.",
    youGet: "Your sales team stops wasting time on tire-kickers and spends it closing people who are actually ready to buy."
  },
  {
    id: "appointment",
    tabTitle: "Appointment & Booking",
    tag: "Calendar-Synced • Auto-Remind",
    title: "Meetings Book Themselves. You Just Show Up.",
    description: "No more \"does Tuesday work for you?\" email chains. Your calendar fills itself, sends the reminders, and handles reschedules — all on its own.",
    youGet: "A booked meeting in under 90 seconds, and way fewer no-shows eating into your week."
  },
  {
    id: "alerts",
    tabTitle: "Operational Alerts & Notifications",
    tag: "Real-Time • Supply Chain Ready",
    title: "Know About the Problem Before Your Customer Does.",
    description: "Built for anyone running logistics, FMCG, or a supply chain that can't afford surprises. You get flagged the moment something's off — before it turns into a client losing trust in you.",
    youGet: "Fewer fires to put out, and the ones that do start, you catch early."
  },
  {
    id: "order",
    tabTitle: "Order Intake & Confirmation",
    tag: "ERP-Connected • Voice & Text",
    title: "Every Order, Logged Perfectly. Every Time.",
    description: "Your customers place orders by voice or WhatsApp, and it lands in your system — checked, confirmed, and error-free. No one on your team has to touch it.",
    youGet: "Faster fulfillment and data you can actually trust."
  },
  {
    id: "healthcare",
    tabTitle: "Healthcare AI Suite",
    tag: "Day-1 Deployment • No EMR Overhaul Required",
    title: "Fewer No-Shows. Less Paperwork. Faster.",
    description: "You don't need to rip out your current system. Scheduling, intake, and reminders start working for you almost immediately.",
    youGet: "A lighter admin load in your very first week, and a staff that gets to focus on patients again."
  },
  {
    id: "custom",
    tabTitle: "Custom AI Solutions",
    tag: "Bespoke • High Impact",
    title: "The One Thing Only Your Business Deals With? We'll Fix That Too.",
    description: "Every business has that one weird, expensive workaround nobody's fixed yet. We'll find it, and build something that makes it disappear for good.",
    youGet: "A solution built around exactly how you work — not a generic tool you have to bend around."
  },
  {
    id: "ticket",
    tabTitle: "Support Ticket Management",
    tag: "Auto-Triage • Context-Aware",
    title: "No Ticket Slips Through. Ever.",
    description: "Every ticket that comes in gets sorted, prioritized, and sent to the right person automatically — the second it lands. Urgent issues jump the queue on their own. Nothing sits untouched, nothing misses your SLA, and nothing gets buried under a pile of \"I'll get to it later.\"",
    youGet: "A support queue that manages itself, and a promise to your customers you never have to worry about breaking."
  }
];

const tabGroups = [
  {
    id: "group-1",
    tabTitle: "PRE-BUILT APPLICATIONS",
    showcases: [
      showcases[0], // Support
      showcases[1], // Leads
      showcases[2], // Appointment
      showcases[7], // Ticket
    ]
  },
  {
    id: "group-2",
    tabTitle: "TAILORED APPLICATIONS",
    showcases: [
      showcases[3], // Alerts
      showcases[4], // Order
      showcases[5], // Healthcare
      showcases[6], // Custom
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
          <span className={styles.eyebrow}>• THE ARSENAL</span>
          <h2 className={styles.title}>
            Pick your biggest headache.<br /><em>We&apos;ll solve it first.</em>
          </h2>
        </div>

        <div className={styles.contentLayout}>
          {/* Tabs - Left side */}
          <div className={styles.tabsCol}>
            <div className={styles.tabsHeader}>
              Use tabs to explore more <span className={styles.arrowDown}>↓</span>
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
              Eight agents, each built to fix one specific thing that&apos;s costing you time, money, or sleep. Start with the one that hurts most — or hand us the whole mess.
            </p>
            {activeGroup?.showcases.map((content) => (
              <div className={styles.showcaseCard} key={content.id}>
                <h3 className={styles.cardTitle}>{content.title}</h3>
                
                <div className={styles.cardIllustration} data-type={content.id}>
                  {content.id === "support" ? (
                    <div className={styles.chatAnimationContainer}>
                      <div className={`${styles.chatBubble} ${styles.chatCustomer}`}>
                        <div className={styles.chatText}>Can I update my shipping address?</div>
                      </div>
                      <div className={`${styles.chatBubble} ${styles.chatAi}`}>
                        <div className={styles.chatText}>Of course! I&apos;ve sent a secure link to your phone to update it instantly.</div>
                      </div>
                      <div className={`${styles.chatBubble} ${styles.chatCustomer} ${styles.chatDelay}`}>
                        <div className={styles.chatText}>Done, thanks for the quick help!</div>
                      </div>
                    </div>
                  ) : content.id === "leads" ? (
                    <div className={styles.leadsTableContainer}>
                      <div className={styles.leadsGridOverlay}></div>
                      <div className={styles.leadsTableHeader}>
                        <div className={styles.leadsCol}>Company</div>
                        <div className={styles.leadsCol}>Buying Intent</div>
                        <div className={styles.leadsCol}>Outcome</div>
                      </div>
                      <div className={styles.leadsTableBody}>
                        <div className={`${styles.leadsRow} ${styles.leadsRow1}`}>
                          <div className={styles.leadsCol}>Acme Corp</div>
                          <div className={styles.leadsCol}><span className={styles.scoreHigh}>High</span></div>
                          <div className={styles.leadsCol}><span className={styles.actionRoute}>Routed to AE</span></div>
                        </div>
                        <div className={`${styles.leadsRow} ${styles.leadsRow2}`}>
                          <div className={styles.leadsCol}>TechFlow</div>
                          <div className={styles.leadsCol}><span className={styles.scoreMed}>Low</span></div>
                          <div className={styles.leadsCol}><span className={styles.actionNurture}>Nurture Flow</span></div>
                        </div>
                        <div className={`${styles.leadsRow} ${styles.leadsRow3}`}>
                          <div className={styles.leadsCol}>Globex</div>
                          <div className={styles.leadsCol}><span className={styles.scoreHigh}>High</span></div>
                          <div className={styles.leadsCol}><span className={styles.actionRoute}>Routed to AE</span></div>
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
                            <div className={styles.apptBlockTitle}>Team Standup</div>
                          </div>
                          
                          <div className={styles.apptNewBlock}>
                            <div className={styles.apptBlockInner}>
                              <span className={styles.apptBlockTitle}>Discovery Call</span>
                              <span className={styles.apptBlockBadge}>Auto-booked</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : content.id === "alerts" ? (
                    <div className={styles.alertsAnimContainer}>
                      <div className={styles.alertsRadar}>
                        <div className={styles.alertsRadarCircle} style={{animationDelay: '0s'}}></div>
                        <div className={styles.alertsRadarCircle} style={{animationDelay: '1s'}}></div>
                        <div className={styles.alertsRadarCircle} style={{animationDelay: '2s'}}></div>
                      </div>
                      <div className={styles.alertToast}>
                        <div className={styles.alertToastHeader}>
                          <div className={styles.alertToastDot}></div>
                          <span>Early Warning</span>
                        </div>
                        <div className={styles.alertToastText}>Supply Route A showing 15m delay. Resolving before impact.</div>
                      </div>
                    </div>
                  ) : content.id === "ticket" ? (
                    <div className={styles.premiumTriageContainer}>
                      <div className={styles.triageQueue}>
                        <div className={styles.triageScanner}></div>
                        
                        <div className={styles.triageItemWrapNormal1}>
                          <div className={styles.triageItem}>
                            <div className={styles.triageItemTitle}>Billing update</div>
                            <div className={styles.triageItemBadge}>Low</div>
                          </div>
                        </div>
                        
                        <div className={styles.triageItemWrapNormal2}>
                          <div className={styles.triageItem}>
                            <div className={styles.triageItemTitle}>Login issue</div>
                            <div className={styles.triageItemBadge}>Low</div>
                          </div>
                        </div>
                        
                        <div className={styles.triageItemWrapEscalating}>
                          <div className={`${styles.triageItem} ${styles.triageItemEscalating}`}>
                            <div className={styles.triageItemTitle}>Gateway Down</div>
                            <div className={styles.triageItemBadgeAnim}>
                              <span className={styles.badgeTextPending}>Review</span>
                              <span className={styles.badgeTextUrgent}>Urgent</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : content.id === "order" ? (
                    <div className={styles.orderAnimContainer}>
                      <div className={styles.orderChat}>
                        <div className={styles.orderBubble}>Need 50 boxes of XYZ</div>
                      </div>
                      
                      <div className={styles.orderSteps}>
                        <div className={`${styles.orderStep} ${styles.orderStep1}`}>
                          <div className={styles.orderStepIcon}>✓</div>
                          <div className={styles.orderStepText}>Stock Verified</div>
                        </div>
                        <div className={`${styles.orderStep} ${styles.orderStep2}`}>
                          <div className={styles.orderStepIcon}>✓</div>
                          <div className={styles.orderStepText}>ERP Updated</div>
                        </div>
                        <div className={`${styles.orderStep} ${styles.orderStep3}`}>
                          <div className={styles.orderStepIcon}>✓</div>
                          <div className={styles.orderStepText}>Invoice Sent</div>
                        </div>
                      </div>
                    </div>
                  ) : content.id === "healthcare" ? (
                    <div className={styles.healthAnimContainer}>
                      <div className={styles.healthCard}>
                        <div className={styles.healthScanner}></div>
                        <div className={styles.healthHeader}>
                          <div className={styles.healthAvatar}></div>
                          <div className={styles.healthLines}>
                            <div className={styles.healthLine}></div>
                            <div className={styles.healthLineShort}></div>
                          </div>
                        </div>
                        <div className={styles.healthForms}>
                           <div className={styles.healthFormLine}></div>
                           <div className={styles.healthFormLine}></div>
                           <div className={styles.healthFormLine}></div>
                        </div>
                        <div className={styles.healthStatusWrapper}>
                          <div className={styles.healthStatusPending}>
                            <div className={styles.healthStatusDotGray}></div>
                            <span>Pending</span>
                          </div>
                          <div className={styles.healthStatusSynced}>
                            <div className={styles.healthStatusDotGreen}></div>
                            <span>Synced & Booked</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : content.id === "custom" ? (
                    <div className={styles.customAnimContainer}>
                      <div className={styles.customPipeline}>
                        <div className={styles.customBox}>Legacy</div>
                        <div className={styles.customLine}></div>
                        <div className={styles.customOrbMini}>
                          <div className={styles.customOrbCoreMini}></div>
                          <div className={styles.customOrbRing1Mini}></div>
                        </div>
                        <div className={styles.customLineAnim}>
                          <div className={styles.customLineGlow}></div>
                        </div>
                        <div className={styles.customBoxGreen}>Automated</div>
                      </div>
                    </div>
                  ) : null}
                </div>
                
                <div className={styles.cardFooter}>
                  <strong>You get:</strong> {content.youGet}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
