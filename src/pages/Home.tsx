import React from 'react';
import Hero from '../components/sections/Hero';
import Features from '../components/sections/Features';
import DailyRewardsPreview from '../components/sections/DailyRewardsPreview';
import PredictionPreview from '../components/sections/PredictionPreview';
import LeaderboardPreview from '../components/sections/LeaderboardPreview';
import SignupCTA from '../components/sections/SignupCTA';
import FAQ from '../components/sections/FAQ';
import MainLayout from '../layouts/MainLayout';

const Home: React.FC = () => {
  return (
    <MainLayout>
      <Hero />
      <Features />
      <DailyRewardsPreview />
      <PredictionPreview />
      <LeaderboardPreview />
      <FAQ />
      <SignupCTA />
    </MainLayout>
  );
};

export default Home;
