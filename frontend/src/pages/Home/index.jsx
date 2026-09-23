import React, { useEffect } from 'react';
import Navbar from '../../components/landing/Navbar';
import Hero from '../../components/landing/Hero';
import TrustStrip from '../../components/landing/TrustStrip';
import Features from '../../components/landing/Features';
import ChatShowcase from '../../components/landing/ChatShowcase';
import CallShowcase from '../../components/landing/CallShowcase';
import LiveMonitoringShowcase from '../../components/landing/LiveMonitoringShowcase';
import SecuritySection from '../../components/landing/SecuritySection';
import HowItWorks from '../../components/landing/HowItWorks';
import ProductBenefits from '../../components/landing/ProductBenefits';
import CTASection from '../../components/landing/CTASection';
import Footer from '../../components/landing/Footer';
import BackgroundGlows from '../../components/landing/BackgroundGlows';
import './Landing.css';

const Home = () => {
  useEffect(() => {
    // Update document title for landing page
    document.title = 'InstantTalk — Modern Real-Time Communication Platform';
  }, []);

  return (
    <div className="landing-page-wrapper">
      {/* Animated Glowing Aurora Background */}
      <BackgroundGlows />

      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <Features />
        <ChatShowcase />
        <CallShowcase />
        <LiveMonitoringShowcase />
        <SecuritySection />
        <HowItWorks />
        <ProductBenefits />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
