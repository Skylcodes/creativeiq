import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Agents } from "@/components/landing/agents";
import { Features } from "@/components/landing/features";
import { Comparison } from "@/components/landing/comparison";
import { Testimonials } from "@/components/landing/testimonials";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Agents />
        <Features />
        <Comparison />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
