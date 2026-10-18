import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import ComparisonSection from "@/components/ComparisonSection";
import ArsenalSection from "@/components/ArsenalSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TrustSection from "@/components/TrustSection";
import EnterpriseSection from "@/components/EnterpriseSection";
import ProofSection from "@/components/ProofSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <ProblemSection />
      <ArsenalSection />
      <TrustSection />
      <EnterpriseSection />
      <ComparisonSection />
      <ProofSection />
      <HowItWorksSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
