import React from 'react';
import Home from './pages/Home';
import Hero from './components/sections/Hero';
import HowItWorks from './components/sections/HowItWorks';
import Marketplace from './components/sections/Marketplace';
import WalletRewards from './components/sections/WalletRewards';
import Achievements from './components/sections/Achievements';
import Community from './components/sections/Community';
import TrustSecurity from './components/sections/TrustSecurity';
import FAQ from './components/sections/FAQ';
import FinalCTA from './components/sections/FinalCTA';
import SignupCTA from './components/sections/SignupCTA';
import MainLayout from './components/layout/MainLayout';

// This is the NEW HOME.TSX that integrates all redesigned sections
// The actual Home.tsx page file will import and render these sections

/**
 * PULSEEARN LANDING PAGE REDESIGN
 * 
 * This shows the intended layout and flow of sections for the new premium landing page.
 * Each section has been completely rebuilt to communicate:
 * - Trust and professionalism
 * - Product clarity and real features
 * - Transparent reward economy
 * - Community validation
 * 
 * SECTION ORDER:
 * 1. Hero - Product showcase (replace generic crypto template)
 * 2. HowItWorks - Five-step economy flow
 * 3. Marketplace - Real earning opportunities
 * 4. WalletRewards - Conversion and withdrawal system
 * 5. Achievements - Progression, levels, streaks
 * 6. Community - Social proof and referrals
 * 7. TrustSecurity - Fraud prevention and transparency
 * 8. FAQ - Common questions
 * 9. FinalCTA - Big conversion moment
 * 10. SignupCTA - Secondary CTA (existing)
 */

const HomePageLayout = () => {
  return (
    <MainLayout>
      <Hero />
      <HowItWorks />
      <Marketplace />
      <WalletRewards />
      <Achievements />
      <Community />
      <TrustSecurity />
      <FAQ />
      <FinalCTA />
      <SignupCTA />
    </MainLayout>
  );
};

export default HomePageLayout;
