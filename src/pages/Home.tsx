import React from 'react';
import Hero from '../components/sections/Hero';
import Features from '../components/sections/Features';
import SignupCTA from '../components/sections/SignupCTA';
import FAQ from '../components/sections/FAQ';
import MainLayout from '../layouts/MainLayout';
import { useCryptoData } from '../hooks/useCryptoData';

const Home: React.FC = () => {
  // Pre-fetch crypto data for the whole landing page
  useCryptoData();

  return (
    <MainLayout>
      <Hero />
      <Features />
      <FAQ />
      <SignupCTA />
    </MainLayout>
  );
};

export default Home;
