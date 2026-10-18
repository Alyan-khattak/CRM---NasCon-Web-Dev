"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import styles from "./FAQSection.module.css";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: "faq-1",
    question: "Will Financify replace my team?",
    answer:
      "No. Financify is designed to support the people handling your customers, not replace their responsibility. It helps organize lead ownership, customer context, and follow-up workflows. Conversational AI can support conversations and offer recommendations, while human accountability remains in place.",
  },
  {
    id: "faq-2",
    question: "What happens to our company data?",
    answer:
      "Each company operates in its own workspace, with access controlled by permissions. Data access is intended to remain separated between workspaces. Ask us about the current implementation, data handling, and any applicable retention or deletion policies before onboarding.",
  },
  {
    id: "faq-3",
    question: "What if the AI gets something wrong?",
    answer:
      "Conversational AI is limited to conversation and recommendations. It does not independently take ownership of a lead or perform lead-management actions. A designated human remains accountable, and the team continues to manage the underlying workflow.",
  },
  {
    id: "faq-4",
    question: "Can Financify connect to our existing tools?",
    answer:
      "Financify is designed around connected customer workflows, including messaging, payments, and calendar activity. Available connections depend on the supported provider, account setup, and current integration status. We can clarify which connections are available for your intended workflow.",
  },
  {
    id: "faq-5",
    question: "Is Financify suitable for a small team?",
    answer:
      "Yes. The platform is intended for small and growing service businesses that need clearer lead ownership, connected customer records, and better visibility into day-to-day operations. The right configuration depends on how your team handles leads and customers.",
  },
];

export default function FAQSection() {
  const [openId, setOpenId] = useState<string | null>(faqs[0].id);

  const toggleFaq = (id: string) => {
    setOpenId((prevId) => (prevId === id ? null : id));
  };

  return (
    <section className={styles.section} id="faq">
      <div className={styles.container}>
        {/* Header */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className={styles.eyebrow}>• FREQUENTLY ASKED QUESTIONS</span>
          <h2 className={styles.title}>
            Real questions. <em>Clear answers.</em>
          </h2>
          <p className={styles.subtitle}>
            Understand how Financify brings customer work together, supports your team, and keeps responsibility visible.
          </p>
        </motion.div>

        {/* Accordion List */}
        <div className={styles.faqList}>
          {faqs.map((faq, index) => {
            const isOpen = openId === faq.id;
            return (
              <motion.div
                key={faq.id}
                className={`${styles.faqItem} ${isOpen ? styles.open : ""}`}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <button
                  type="button"
                  className={styles.questionButton}
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                >
                  <span className={styles.questionText}>{faq.question}</span>
                  <div className={`${styles.iconWrapper} ${isOpen ? styles.iconOpen : ""}`}>
                    <ChevronDown className={styles.chevronIcon} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${faq.id}`}
                      className={styles.answerWrapper}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className={styles.answerContent}>
                        <p className={styles.answerText}>{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
