"use client";

import React, { useEffect } from "react";
import Lenis from "lenis";
import { motion } from "motion/react";
import Nav from "@/components/Landing/Nav";
import Hero from "@/components/Landing/Hero";
import Problem from "@/components/Landing/Problem";
import Crew from "@/components/Landing/Crew";
import MissionControl from "@/components/Landing/MissionControl";
import FlightSystems from "@/components/Landing/FlightSystems";
import Themes from "@/components/Landing/Themes";
import FinalCTA from "@/components/Landing/FinalCTA";
import Footer from "@/components/Landing/Footer";

// Helper component for soft, elegant scroll fade-ins and fade-outs
function FadeInSection({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export default function NewLandingPage() {
  useEffect(() => {
    // Initialize Lenis for smooth scrolling that respects CSS sticky
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0E0D0B] font-sans selection:bg-[#FF8A3D] selection:text-[#0E0D0B]">
      <Nav />
      {/* Hero renders immediately, no scroll wrapper needed */}
      <Hero />
      <FadeInSection>
        <Problem />
      </FadeInSection>
      <Crew />
      <FadeInSection>
        <MissionControl />
      </FadeInSection>
      <FadeInSection>
        <FlightSystems />
      </FadeInSection>

      <FadeInSection>
        <FinalCTA />
      </FadeInSection>
      <Footer />
    </main>
  );
}
