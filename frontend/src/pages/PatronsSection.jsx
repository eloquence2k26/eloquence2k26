import { useEffect, useRef, useState } from 'react';
import patrons from '../data/patrons.js';
import ShaderCard from '../components/ShaderCard.jsx';
import ScrollableMarquee from '../components/ScrollableMarquee.jsx';

function renderPatronIcon(iconName, isGold) {
  const strokeColor = isGold ? '#f5e4b8' : '#39ff88';

  switch (iconName) {
    case 'Crown':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="patron-icon-svg">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
        </svg>
      );
    case 'Landmark':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="patron-icon-svg">
          <line x1="3" x2="21" y1="22" y2="22" />
          <line x1="6" x2="6" y1="18" y2="11" />
          <line x1="10" x2="10" y1="18" y2="11" />
          <line x1="14" x2="14" y1="18" y2="11" />
          <line x1="18" x2="18" y1="18" y2="11" />
          <polygon points="12 2 20 7 4 7 12 2" />
        </svg>
      );
    case 'GraduationCap':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="patron-icon-svg">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case 'Award':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="patron-icon-svg">
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    case 'Cpu':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="patron-icon-svg">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
        </svg>
      );
    case 'ShieldCheck':
    default:
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="patron-icon-svg">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
  }
}

function PatronSlideCard({ patron, index }) {
  const isGold = patron.tier === 'gold';
  const color1 = isGold ? '#b99358' : '#00a83b';
  const color2 = isGold ? '#f5e4b8' : '#39ff88';
  const color3 = isGold ? '#0a0804' : '#040a06';

  return (
    <div
      className={`patron-slide-item ${isGold ? 'patron-gold-tier' : 'patron-emerald-tier'}`}
    >
      <ShaderCard
        color1={color1}
        color2={color2}
        color3={color3}
        className="patron-shader-card"
      >
        <div className="patron-card-inner">
          <div className="patron-card-header">
            <div className="patron-icon-badge">
              {renderPatronIcon(patron.iconName, isGold)}
            </div>
            <div className="patron-tag-badge">{patron.tag}</div>
          </div>

          <h3 className="patron-role-title">{patron.role}</h3>

          <div className="patron-card-flourish">
            <span className="patron-flourish-line" />
            <span className="patron-star-symbol">◆</span>
            <span className="patron-flourish-line" />
          </div>

          <div className="patron-names-list">
            {patron.names.map((name) => (
              <div className="patron-name-item" key={name}>
                <span className="patron-name-bullet">❖</span>
                <span className="patron-name-text">{name}</span>
              </div>
            ))}
          </div>

          {patron.desc && <p className="patron-desc">{patron.desc}</p>}

          <div className="patron-tech-corner corner-top-left" />
          <div className="patron-tech-corner corner-bottom-right" />
        </div>
      </ShaderCard>
    </div>
  );
}

export default function PatronsSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Triple the items for smooth infinite loop in single line
  const loopPatrons = [...patrons, ...patrons, ...patrons];

  return (
    <section
      id="patrons"
      ref={sectionRef}
      className={`patrons-section ${visible ? 'patrons-visible' : ''}`}
    >
      <div className="patrons-ambient-light" />
      <div className="patrons-container">
        <div className="patrons-header">
          <span className="patrons-badge">LEADERSHIP & GUIDANCE</span>
          <h2 className="section-heading">OUR PATRONS</h2>
          <p className="section-sub">
            Steered by distinguished leaders and academic pioneers shaping national innovation.
          </p>
        </div>
      </div>

      <div className="patrons-marquee">
        <div className="patrons-marquee-fade patrons-marquee-fade-left" />
        <div className="patrons-marquee-fade patrons-marquee-fade-right" />
        <ScrollableMarquee speed={36} direction="left" baseCount={patrons.length}>
          <div className="patrons-track">
            {loopPatrons.map((patron, i) => (
              <PatronSlideCard
                key={`${patron.id}-${i}`}
                patron={patron}
                index={i}
              />
            ))}
          </div>
        </ScrollableMarquee>
      </div>
    </section>
  );
}
