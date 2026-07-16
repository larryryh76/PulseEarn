import React from 'react';
import Hero from '../components/sections/Hero';
import HowItWorks from '../components/sections/HowItWorks';
import Marketplace from '../components/sections/Marketplace';
import WalletRewards from '../components/sections/WalletRewards';
import Achievements from '../components/sections/Achievements';
import Community from '../components/sections/Community';
import TrustSecurity from '../components/sections/TrustSecurity';
import FAQ from '../components/sections/FAQ';
import FinalCTA from '../components/sections/FinalCTA';
import SignupCTA from '../components/sections/SignupCTA';
import MainLayout from '../components/layout/MainLayout';
import { useCryptoData } from '../hooks/useCryptoData';

const Home: React.FC = () => {
  // Pre-fetch crypto data for the whole landing page
  useCryptoData();

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

export default Home;
