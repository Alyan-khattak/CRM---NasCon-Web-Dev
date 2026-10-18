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
    question: "Will this replace my staff?",
    answer:
      "No. Your agent takes the repetitive, mind-numbing work off their plate — the data entry, the follow-ups, the copy-pasting — so your team can spend their time on the work that actually needs a human. It's built to make your people faster, not to make them unnecessary.",
  },
  {
    id: "faq-2",
    question: "What happens to my data if I cancel?",
    answer:
      "It's handed back to you, and then deleted from our systems. Nothing lingers, nothing gets reused. Your data was never ours to keep.",
  },
  {
    id: "faq-3",
    question: "What if the agent gets something wrong?",
    answer:
      "If it hits a situation it's not confident about, it hands the conversation straight to a human on your team — instantly, with full context. Our team also reviews what happened and retrains the agent within 24 hours, so the same mistake doesn't happen twice.",
  },
  {
    id: "faq-4",
    question: "Is support really available 24/7?",
    answer:
      "Yes. Whenever you need us, someone's there — not just during business hours.",
  },
  {
    id: "faq-5",
    question: "Do I have to sign a contract?",
    answer:
      "After your free 7-day trial, yes — but you'll have already seen exactly what the agent does for your business before you commit to anything.",
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
            Real questions. <em>Straight answers.</em>
          </h2>
          <p className={styles.subtitle}>
            Everything you need to know about how Olema agents work, security, and onboarding.
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

