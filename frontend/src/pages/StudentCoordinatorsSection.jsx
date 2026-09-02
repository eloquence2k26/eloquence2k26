import { useEffect, useRef, useState } from 'react';
import studentCoordinators from '../data/studentCoordinators.json';
import ShaderCard from '../components/ShaderCard.jsx';

function renderCoordinatorIcon(iconName, tier) {
  const strokeColor =
    tier === 'cyan'
      ? '#00f0ff'
      : tier === 'gold'
      ? '#f5e4b8'
      : tier === 'purple'
      ? '#d946ef'
      : '#39ff88';

  switch (iconName) {
    case 'Code':
    case 'Terminal':
      return (
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="coordinator-icon-svg"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case 'Users':
      return (
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="coordinator-icon-svg"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'Rocket':
      return (
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="coordinator-icon-svg"
        >
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4.5c1.62-1.63 5-2.5 5-2.5" />
          <path d="M12 15v5s3.03-.55 4.5-2c1.63-1.62 2.5-5 2.5-5" />
        </svg>
      );
    case 'Sparkles':
      return (
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="coordinator-icon-svg"
        >
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      );
    case 'Shield':
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="coordinator-icon-svg"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
  }
}

function CoordinatorSlideCard({ item, index }) {
  const tier = item.tier || 'emerald';

  // Determine shader colors based on tier
  let color1 = '#00a83b';
  let color2 = '#39ff88';
  let color3 = '#040a06';

  if (tier === 'cyan') {
    color1 = '#0077b6';
    color2 = '#00f0ff';
    color3 = '#020e18';
  } else if (tier === 'gold') {
    color1 = '#b99358';
    color2 = '#f5e4b8';
    color3 = '#0a0804';
  } else if (tier === 'purple') {
    color1 = '#7928ca';
    color2 = '#d946ef';
    color3 = '#0d0216';
  }

  // Support both member objects and simple name strings
  const membersList = item.members && item.members.length > 0
    ? item.members
    : item.names && item.names.length > 0
    ? item.names.map((name) => ({ name, role: '' }))
    : [];

  return (
    <div
      className={`student-coordinator-slide-item coordinator-${tier}-tier`}
    >
      <ShaderCard
        color1={color1}
        color2={color2}
        color3={color3}
        className="student-coordinator-shader-card"
      >
        <div className="student-coordinator-card-inner">
          <div className="student-coordinator-card-header">
            <div className="coordinator-icon-badge">
              {renderCoordinatorIcon(item.iconName, tier)}
            </div>
            <div className="coordinator-tag-badge">{item.tag || 'TEAM'}</div>
          </div>

          <h3 className="coordinator-role-title">{item.role}</h3>

          <div className="coordinator-card-flourish">
            <span className="coordinator-flourish-line" />
            <span className="coordinator-star-symbol">◆</span>
            <span className="coordinator-flourish-line" />
          </div>

          <div className="coordinator-names-list">
            {membersList.length > 0 ? (
              membersList.map((member, i) => (
                <div className="coordinator-name-item" key={typeof member === 'string' ? member : member.name || i}>
                  <span className="coordinator-name-bullet">❖</span>
                  <div className="coordinator-member-info">
                    <span className="coordinator-name-text">
                      {typeof member === 'string' ? member : member.name}
                    </span>
                    {typeof member === 'object' && member.role && (
                      <span className="coordinator-sub-role">{member.role}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="coordinator-pending-members">
                <span className="coordinator-pending-dot" />
                <span>Members Announcement Coming Soon</span>
              </div>
            )}
          </div>

          {item.desc && <p className="coordinator-desc">{item.desc}</p>}

          <div className="patron-tech-corner corner-top-left" />
          <div className="patron-tech-corner corner-bottom-right" />
        </div>
      </ShaderCard>
    </div>
  );
}

export default function StudentCoordinatorsSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Duplicate items for smooth infinite loop in marquee track
  const loopItems = [
    ...studentCoordinators,
    ...studentCoordinators,
    ...studentCoordinators,
    ...studentCoordinators,
    ...studentCoordinators,
    ...studentCoordinators,
  ];

  return (
    <section
      id="student-coordinators"
      ref={sectionRef}
      className={`student-coordinators-section ${visible ? 'coordinators-visible' : ''}`}
    >
      <div className="student-coordinators-ambient-light" />
      <div className="student-coordinators-container">
        <div className="student-coordinators-header">
          <span className="student-coordinators-badge">STUDENT LEADERSHIP & CREW</span>
          <h2 className="section-heading">STUDENT COORDINATORS</h2>
          <p className="section-sub">
            The visionary student teams driving innovation, technical systems, and organizing Eloquence 2026.
          </p>
        </div>
      </div>

      <div className="student-coordinators-marquee">
        <div className="student-coordinators-marquee-fade marquee-fade-left" />
        <div className="student-coordinators-marquee-fade marquee-fade-right" />
        <div className="student-coordinators-track">
          {loopItems.map((item, i) => (
            <CoordinatorSlideCard
              key={`${item.id}-${i}`}
              item={item}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
