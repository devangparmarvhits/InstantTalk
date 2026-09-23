import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { Menu, X, ArrowRight } from './Icons';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('features');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Detect active section on scroll
      const sections = ['features', 'showcase', 'calls', 'screenshare', 'security', 'how-it-works'];
      const scrollPos = window.scrollY + 120;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    closeMenu();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="landing-container navbar-inner">
        {/* Brand Logo */}
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <Logo size="sm" showText={true} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="navbar-links" aria-label="Main Navigation">
          <a
            href="#features"
            className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}
            onClick={(e) => scrollToSection(e, 'features')}
          >
            Features
          </a>
          <a
            href="#showcase"
            className={`nav-link ${activeSection === 'showcase' ? 'active' : ''}`}
            onClick={(e) => scrollToSection(e, 'showcase')}
          >
            Messaging
          </a>
          <a
            href="#calls"
            className={`nav-link ${activeSection === 'calls' ? 'active' : ''}`}
            onClick={(e) => scrollToSection(e, 'calls')}
          >
            Voice & Video
          </a>
          <a
            href="#screenshare"
            className={`nav-link ${activeSection === 'screenshare' ? 'active' : ''}`}
            onClick={(e) => scrollToSection(e, 'screenshare')}
          >
            Screen Share
          </a>
          <a
            href="#security"
            className={`nav-link ${activeSection === 'security' ? 'active' : ''}`}
            onClick={(e) => scrollToSection(e, 'security')}
          >
            Security
          </a>
          <a
            href="#how-it-works"
            className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
            onClick={(e) => scrollToSection(e, 'how-it-works')}
          >
            How It Works
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="navbar-actions">
          <Link to="/login" className="btn-ghost">
            Log In
          </Link>
          <Link to="/register" className="btn-primary btn-sm">
            <span>Get Started</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-backdrop" onClick={closeMenu} />
        <div className="mobile-nav-content">
          <div className="mobile-nav-header">
            <Logo size="sm" showText={true} />
            <button className="mobile-close-btn" onClick={closeMenu} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>

          <nav className="mobile-nav-links">
            <a href="#features" className="mobile-link" onClick={(e) => scrollToSection(e, 'features')}>
              Features
            </a>
            <a href="#showcase" className="mobile-link" onClick={(e) => scrollToSection(e, 'showcase')}>
              Messaging Showcase
            </a>
            <a href="#calls" className="mobile-link" onClick={(e) => scrollToSection(e, 'calls')}>
              Voice & Video Calls
            </a>
            <a href="#screenshare" className="mobile-link" onClick={(e) => scrollToSection(e, 'screenshare')}>
              Live Screen Sharing
            </a>
            <a href="#security" className="mobile-link" onClick={(e) => scrollToSection(e, 'security')}>
              Security & Privacy
            </a>
            <a href="#how-it-works" className="mobile-link" onClick={(e) => scrollToSection(e, 'how-it-works')}>
              How It Works
            </a>
          </nav>

          <div className="mobile-nav-footer">
            <Link to="/login" className="btn-outline w-full" onClick={closeMenu}>
              Log In
            </Link>
            <Link to="/register" className="btn-primary w-full" onClick={closeMenu}>
              <span>Get Started Free</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
