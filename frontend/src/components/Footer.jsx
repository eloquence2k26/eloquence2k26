import { useState, useRef } from 'react';
import { FaBolt, FaGamepad, FaCompass } from 'react-icons/fa';
import logoImg from '../assets/logo.png';
import events from '../data/events.js';

export default function Footer({ onNavigate }) {
  const [clickCount, setClickCount] = useState(0);
  const timerRef = useRef(null);

  const handleTripleClick = () => {
    setClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        clearTimeout(timerRef.current);
        window.location.href = '/admin';
        return 0;
      }
      return newCount;
    });

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setClickCount(0);
    }, 1000);
  };

  const handleNav = (page, extra = null) => {
    if (onNavigate) {
      onNavigate(page, extra);
    } else {
      if (typeof extra === 'string') {
        document.getElementById(extra)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const techEvents = events.filter((e) => e.category === 'technical');
  const nonTechEvents = events.filter((e) => e.category === 'non-technical');

  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* Col 1: Brand */}
        <div className="footer-brand">
          <a
            className="footer-logo-container"
            href="#hero"
            onClick={(event) => {
              event.preventDefault();
              handleNav('home', 'hero');
            }}
            aria-label="Return to ELOQUENCE 26 home"
          >
            <img src={logoImg} alt="ELOQUENCE 26" className="footer-logo-img" />
          </a>
          <p className="footer-tagline">THE COUNTDOWN BEGINS.</p>
          <p className="footer-desc">
            Where Ideas Collide. Skills Survive. Legends Emerge.
          </p>
        </div>

        {/* Col 2: Technical Events */}
        <div className="footer-col">
          <h4 className="footer-heading">
            <FaBolt style={{ marginRight: '0.4rem', color: 'var(--bright-green)', verticalAlign: '-1px' }} />
            TECHNICAL
          </h4>
          <ul className="footer-event-list">
            {techEvents.map((event) => (
              <li key={event.id}>
                <a
                  href={`#/events/${event.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav('event-rules', event.id);
                  }}
                >
                  {event.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Non-Technical Events */}
        <div className="footer-col">
          <h4 className="footer-heading">
            <FaGamepad style={{ marginRight: '0.4rem', color: 'var(--bright-green)', verticalAlign: '-1px' }} />
            NON-TECHNICAL
          </h4>
          <ul className="footer-event-list">
            {nonTechEvents.map((event) => (
              <li key={event.id}>
                <a
                  href={`#/events/${event.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav('event-rules', event.id);
                  }}
                >
                  {event.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4: Quick Navigation */}
        <div className="footer-col">
          <h4 className="footer-heading">
            <FaCompass style={{ marginRight: '0.4rem', color: 'var(--bright-green)', verticalAlign: '-1px' }} />
            NAVIGATION
          </h4>
          <ul className="footer-nav-list">
            <li>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('home', 'hero');
                }}
              >
                Home
              </a>
            </li>
            <li>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('events');
                }}
              >
                All Events
              </a>
            </li>
            <li>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('home', 'intro');
                }}
              >
                About Fest
              </a>
            </li>
            <li>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('home', 'patrons');
                }}
              >
                Patrons
              </a>
            </li>
            <li>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('home', 'location');
                }}
              >
                Location
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p
          onClick={handleTripleClick}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title="Triple click to open admin login"
        >
          © 2026 ELOQUENCE26 — C. Abdul Hakeem College of Engineering and Technology. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
