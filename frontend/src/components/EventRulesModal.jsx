import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaMapMarkerAlt,
  FaClock,
  FaMoneyBillWave,
  FaUsers,
  FaListOl,
  FaHeadset,
  FaPhoneAlt,
  FaArrowRight,
  FaBolt,
  FaGamepad,
  FaLayerGroup,
  FaCheckCircle
} from 'react-icons/fa';
import { getApiUrl } from '../config/api';

export default function EventRulesModal({ event, isOpen, onClose, onRegister }) {
  const [coordinators, setCoordinators] = useState([]);

  // Fetch live coordinators if available
  useEffect(() => {
    if (!event?.id || !isOpen) {
      setCoordinators([]);
      return;
    }
    let isMounted = true;
    const initialCoords = Array.isArray(event.coordinators) ? event.coordinators : [];
    setCoordinators(initialCoords);

    fetch(getApiUrl(`/api/coordinators/event/${encodeURIComponent(event.id)}`))
      .then((res) => res.json())
      .then((result) => {
        if (isMounted && result.success && Array.isArray(result.data) && result.data.length > 0) {
          setCoordinators(result.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [event?.id, isOpen]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalStyle;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const isTech = event.category === 'technical';
  const rules = Array.isArray(event.rules) ? event.rules : [];
  const rounds = Array.isArray(event.rounds) ? event.rounds : [];
  const highlights = Array.isArray(event.highlights) ? event.highlights : [];
  const isEsports = event.id === 'nontech-05';

  const handleRegisterClick = () => {
    onClose();
    if (onRegister) {
      onRegister(event.id || event);
    }
  };

  const handleRegisterGame = (game) => {
    onClose();
    if (onRegister) {
      onRegister({ eventId: event.id, game });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="rules-modal-overlay" onClick={onClose}>
          {/* Backdrop Blur & Ambient Tint */}
          <motion.div
            className="rules-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          />

          {/* Modal Container */}
          <motion.div
            className="rules-modal-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.88, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 25 }}
            transition={{
              type: 'spring',
              damping: 26,
              stiffness: 340,
              mass: 0.85
            }}
          >
            {/* Ambient Corner Decors */}
            <div className="rules-modal-corner-accent corner-top-left" />
            <div className="rules-modal-corner-accent corner-bottom-right" />
            <div className="rules-modal-glow-top" />

            {/* Modal Header */}
            <div className="rules-modal-header">
              <div className="rules-modal-header-info">
                <div className="rules-modal-badges-row">
                  <span className={`rules-modal-cat-badge ${isTech ? 'badge-tech' : 'badge-nontech'}`}>
                    {isTech ? <FaBolt /> : <FaGamepad />}
                    {isTech ? 'TECHNICAL COMPETITION' : 'NON-TECHNICAL EVENT'}
                  </span>
                  {event.tag && (
                    <span className="rules-modal-tag-badge">
                      {event.tag}
                    </span>
                  )}
                </div>
                <h2 className="rules-modal-title">{event.name}</h2>
                {event.alias && event.alias.toLowerCase() !== event.name.toLowerCase() && (
                  <p className="rules-modal-alias">// {event.alias}</p>
                )}
              </div>

              <button
                type="button"
                className="rules-modal-close-btn"
                onClick={onClose}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="rules-modal-body custom-scrollbar">
              {/* Event Description */}
              {(event.subtitle || event.description) && (
                <div className="rules-modal-desc-box">
                  <p className="rules-modal-desc-text">
                    {event.subtitle || event.description}
                  </p>
                </div>
              )}

              {/* Key Meta Grid */}
              <div className="rules-modal-meta-grid">
                <div className="rules-meta-item">
                  <span className="rules-meta-icon"><FaMapMarkerAlt /></span>
                  <div>
                    <span className="rules-meta-label">VENUE</span>
                    <strong className="rules-meta-value">{event.venue || 'CSE Department Labs'}</strong>
                  </div>
                </div>

                <div className="rules-meta-item">
                  <span className="rules-meta-icon"><FaClock /></span>
                  <div>
                    <span className="rules-meta-label">TIMING</span>
                    <strong className="rules-meta-value">{event.timing || '10:00 AM – 1:00 PM'}</strong>
                  </div>
                </div>

                <div className="rules-meta-item">
                  <span className="rules-meta-icon"><FaMoneyBillWave /></span>
                  <div>
                    <span className="rules-meta-label">ENTRY FEE</span>
                    <strong className="rules-meta-value fee-highlight">{event.fee || '₹50 per head'}</strong>
                  </div>
                </div>

                <div className="rules-meta-item">
                  <span className="rules-meta-icon"><FaUsers /></span>
                  <div>
                    <span className="rules-meta-label">SQUAD / TEAM</span>
                    <strong className="rules-meta-value">{event.teamSize || 'Individual'}</strong>
                  </div>
                </div>
              </div>

              {/* Highlights (if any) */}
              {highlights.length > 0 && (
                <div className="rules-modal-highlights-wrap">
                  <div className="rules-section-title">
                    <FaCheckCircle className="rules-sec-icon" /> QUICK HIGHLIGHTS
                  </div>
                  <div className="rules-highlights-tags">
                    {highlights.map((h, i) => (
                      <span key={i} className="rules-highlight-pill">
                        ⚡ {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rules & Guidelines Section */}
              <div className="rules-modal-section">
                <div className="rules-section-title">
                  <FaListOl className="rules-sec-icon" /> RULES & GUIDELINES ({rules.length})
                </div>

                {rules.length > 0 ? (
                  <ol className="rules-modal-list">
                    {rules.map((rule, idx) => (
                      <motion.li
                        key={idx}
                        className="rules-modal-item"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + idx * 0.03, duration: 0.25 }}
                      >
                        <span className="rule-number-index">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="rule-text-content">{rule}</span>
                      </motion.li>
                    ))}
                  </ol>
                ) : (
                  <div className="rules-modal-empty">
                    Standard symposium rules apply. Contact event coordinators for specific round details.
                  </div>
                )}
              </div>

              {/* Rounds Breakdown (if provided) */}
              {rounds.length > 0 && (
                <div className="rules-modal-section">
                  <div className="rules-section-title">
                    <FaLayerGroup className="rules-sec-icon" /> ROUND STRUCTURE
                  </div>
                  <div className="rules-rounds-grid">
                    {rounds.map((rnd, i) => (
                      <div key={i} className="rules-round-card">
                        <div className="rules-round-header">
                          <span className="rules-round-name">{rnd.name}</span>
                          {rnd.time && <span className="rules-round-time">{rnd.time}</span>}
                        </div>
                        {rnd.desc && <p className="rules-round-desc">{rnd.desc}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinators Contact Section */}
              {coordinators.length > 0 && (
                <div className="rules-modal-section">
                  <div className="rules-section-title">
                    <FaHeadset className="rules-sec-icon" /> STUDENT COORDINATORS
                  </div>
                  <div className="rules-coords-chips">
                    {coordinators.map((c, i) => (
                      <div key={i} className="rules-coord-card">
                        <div className="coord-info">
                          <span className="coord-role-badge">{c.role || `Coordinator ${i + 1}`}</span>
                          <strong className="coord-name-text">{c.name}</strong>
                        </div>
                        <a
                          href={`tel:${c.phone}`}
                          className="coord-call-link"
                          title={`Call ${c.name}`}
                        >
                          <FaPhoneAlt size={10} style={{ marginRight: '5px' }} />
                          <span>{c.displayPhone || c.phone}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Footer */}
            <div className="rules-modal-footer">
              <button
                type="button"
                className="btn btn-secondary rules-btn-secondary"
                onClick={onClose}
              >
                Close
              </button>

              {isEsports ? (
                <div className="rules-modal-esports-actions">
                  <button
                    type="button"
                    className="rules-btn-esports esports-freefire"
                    onClick={() => handleRegisterGame('FREE FIRE')}
                  >
                    <span>REGISTER FREE FIRE</span>
                    <FaArrowRight size={11} style={{ marginLeft: '6px' }} />
                  </button>
                  <button
                    type="button"
                    className="rules-btn-esports esports-bgmi"
                    onClick={() => handleRegisterGame('BGMI')}
                  >
                    <span>REGISTER BGMI</span>
                    <FaArrowRight size={11} style={{ marginLeft: '6px' }} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary rules-btn-primary"
                  onClick={handleRegisterClick}
                >
                  <span>REGISTER FOR THIS EVENT</span>
                  <FaArrowRight style={{ marginLeft: '0.45rem', verticalAlign: '-1px' }} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
