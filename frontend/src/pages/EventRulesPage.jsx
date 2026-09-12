import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaArrowRight,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaClock,
  FaMoneyBillWave,
  FaUsers,
  FaListOl,
  FaHeadset,
  FaSpinner,
  FaBolt,
  FaLock,
  FaTimes,
  FaExternalLinkAlt,
  FaCopy,
  FaBuilding,
  FaCamera,
  FaImage
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { getApiUrl, getWsUrl } from '../config/api';

function VenueImageModal({ isOpen, onClose, event }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const venueName = event?.venue || 'Designated Campus Venue';
  const venuePhoto = event?.venueImage || event?.venue_image;

  return createPortal(
    <div
      className="venue-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="venue-modal-title"
    >
      <div
        className="venue-modal-card venue-image-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="venue-modal-close-btn"
          onClick={onClose}
          aria-label="Close venue photo"
          title="Close (Esc)"
        >
          <FaTimes />
        </button>

        <div className="venue-modal-header">
          <span className="venue-modal-badge">✦ VENUE PHOTO</span>
          <h2 id="venue-modal-title" className="venue-modal-title">{venueName}</h2>
          <p className="venue-modal-college-name">
            {event?.name ? `Designated hall & arena for ${event.name}` : 'Symposium Venue'}
          </p>
        </div>

        {venuePhoto ? (
          <div className="venue-single-photo-wrap">
            <img
              src={venuePhoto}
              alt={venueName}
              className="venue-single-photo-img"
            />
            <div className="venue-single-photo-caption">
              <span className="venue-photo-badge">VENUE VIEW</span>
              <span className="venue-photo-name">{venueName}</span>
            </div>
          </div>
        ) : (
          <div className="venue-no-photo-box">
            <div className="venue-no-photo-icon-ring">
              <FaCamera className="venue-no-photo-icon" />
            </div>
            <h4 className="venue-no-photo-title">Venue Photo Coming Soon</h4>
            <p className="venue-no-photo-text">
              The coordinators have not uploaded a photo for <strong>{venueName}</strong> yet. You can upload photos for this venue anytime in the Admin Panel.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function EventRulesPage({ eventId, from, categoryFilter, onNavigate }) {
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveCoordinators, setLiveCoordinators] = useState([]);
  const [isRegClosed, setIsRegClosed] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let ws = null;
    let reconnectTimer = null;
    let isExplicitlyClosed = false;

    const checkStatus = () => {
      fetch(getApiUrl('/api/registration-status'))
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success) {
            setIsRegClosed(Boolean(data.isRegistrationClosed));
          }
        })
        .catch(() => {});
    };

    checkStatus();

    window.addEventListener('focus', checkStatus);
    document.addEventListener('visibilitychange', checkStatus);

    const connectWs = () => {
      if (isExplicitlyClosed || !isMounted) return;
      try {
        ws = new WebSocket(getWsUrl('/ws/registrations'));
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === 'REGISTRATION_UPDATE' && msg.action === 'REGISTRATION_STATUS_UPDATED') {
              if (isMounted) setIsRegClosed(Boolean(msg.data?.isRegistrationClosed));
            }
          } catch (_) {}
        };
        ws.onclose = () => {
          if (!isExplicitlyClosed && isMounted) {
            reconnectTimer = setTimeout(connectWs, 2000);
          }
        };
        ws.onerror = () => {
          try { ws.close(); } catch (_) {}
        };
      } catch (_) {
        if (!isExplicitlyClosed && isMounted) {
          reconnectTimer = setTimeout(connectWs, 2000);
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      isExplicitlyClosed = true;
      window.removeEventListener('focus', checkStatus);
      document.removeEventListener('visibilitychange', checkStatus);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try { ws.close(); } catch (_) {}
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(getApiUrl('/api/events'))
      .then((res) => res.json())
      .then((result) => {
        if (isMounted && result.success && Array.isArray(result.data)) {
          setEventsList(result.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load events from DB:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [eventId]);

  const event = eventsList.find((e) => e.id === eventId || e.id?.toLowerCase() === eventId?.toLowerCase()) || (eventsList.length > 0 ? eventsList[0] : null);

  useEffect(() => {
    if (!event?.id) return;
    let isMounted = true;
    fetch(getApiUrl(`/api/coordinators/event/${encodeURIComponent(event.id)}`))
      .then((res) => res.json())
      .then((result) => {
        if (!isMounted) return;
        if (result.success && Array.isArray(result.data)) {
          setLiveCoordinators(result.data);
        } else {
          setLiveCoordinators([]);
        }
      })
      .catch(() => {
        if (isMounted) setLiveCoordinators([]);
      });
    return () => { isMounted = false; };
  }, [event?.id]);

  const rulesList = (event && Array.isArray(event.rules) && event.rules.length > 0)
    ? event.rules
    : [];

  const coordsList = (Array.isArray(liveCoordinators) && liveCoordinators.length > 0)
    ? liveCoordinators
    : (event && Array.isArray(event.coordinators) && event.coordinators.length > 0 ? event.coordinators : []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [eventId]);

  const isEsports = event && (event.id === 'nontech-05' || event.name?.toLowerCase().includes('gaming') || event.name?.toLowerCase().includes('battle of champions'));

  const handleRegister = () => {
    if (isRegClosed) return;
    if (onNavigate && event) {
      onNavigate('register', event.id);
    }
  };

  const handleRegisterGame = (game) => {
    if (isRegClosed) return;
    if (onNavigate && event) {
      onNavigate('register', { eventId: event.id, game });
    }
  };

  const handleTopRegisterClick = () => {
    if (isRegClosed) return;
    if (isEsports) {
      const el = document.querySelector('.esports-cta-wrap');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    handleRegister();
  };

  const handleBackToEvents = () => {
    if (onNavigate) {
      onNavigate('events');
    }
  };

  if (loading) {
    return (
      <div className="event-rules-page" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="events-loading-container"
          style={{ padding: '3rem 1.5rem', maxWidth: '480px' }}
        >
          {/* High-tech cyberpunk orbital radar loader */}
          <div className="cyber-loader-wrap">
            <motion.div
              className="cyber-orbit-ring-outer"
              animate={{ rotate: 360 }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="cyber-orbit-ring-inner"
              animate={{ rotate: -360 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="cyber-loader-core"
              animate={{
                scale: [0.92, 1.08, 0.92],
                boxShadow: [
                  '0 0 15px rgba(57, 255, 136, 0.4)',
                  '0 0 28px rgba(0, 240, 255, 0.75)',
                  '0 0 15px rgba(57, 255, 136, 0.4)',
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FaBolt className="cyber-loader-icon" />
            </motion.div>
          </div>

          <div className="cyber-loading-meta">
            <h4 className="cyber-loading-title">LOADING EVENT RULES</h4>
            <p className="cyber-loading-subtext">
              Please wait while we fetch the rules and details
              <span className="cyber-loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            </p>
            <div className="cyber-loading-beam-wrap">
              <motion.div
                className="cyber-loading-beam"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-rules-page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Event Not Found</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>This competition does not exist or hasn't been added to the database yet.</p>
          <button className="btn btn-primary" onClick={handleBackToEvents}>
            <FaArrowLeft style={{ marginRight: '6px' }} /> Return to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="event-rules-page">
      <div className="event-rules-full-container">
        {/* Top Navigation & Breadcrumbs */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rules-clean-top-nav"
        >
          <button className="rules-back-btn" onClick={handleBackToEvents}>
            <FaArrowLeft style={{ marginRight: '0.45rem', verticalAlign: '-1px' }} />
            Back to Events
          </button>
          <button
            className="rules-register-top-btn"
            onClick={isRegClosed ? undefined : handleTopRegisterClick}
            disabled={isRegClosed}
            style={isRegClosed ? {
              background: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.5)',
              color: '#fca5a5',
              cursor: 'not-allowed',
              opacity: 0.9,
              boxShadow: 'none',
              transform: 'none'
            } : {}}
          >
            {isRegClosed ? (
              <>
                <FaLock style={{ marginRight: '0.45rem', verticalAlign: '-1px' }} /> Registrations Closed
              </>
            ) : (
              <>
                Register Now <FaArrowRight style={{ marginLeft: '0.45rem', verticalAlign: '-1px' }} />
              </>
            )}
          </button>
        </motion.div>

        {/* Main Title & Category Tag Header (Centered) */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rules-title-header-wrap rules-title-header-centered"
        >
          <span className="rules-category-tag">
            {event.category === 'technical' ? '⚡ TECHNICAL EVENT' : '🎮 NON-TECHNICAL EVENT'}
          </span>
          <h1 className="rules-clean-main-title">{event.name}</h1>
          {event.alias && event.alias.toLowerCase() !== event.name.toLowerCase() && (
            <p className="rules-alias-sub">// {event.alias}</p>
          )}
        </motion.div>

        {/* 2-Column Split: Overview (Left) & Rules (Right) */}
        <div className="rules-split-grid">
          {/* Left Side: Overview Stack (4 Small Boxes + 1 Long Diagonal Card + CTA) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rules-left-overview-stack"
          >
            {/* 4 Small Detail Boxes Grid */}
            <div className="rules-overview-quad-grid">
              {/* Box 1: Venue (Entire card clickable to view picture) */}
              <div
                className="rules-overview-box rules-overview-box-venue rules-overview-box-clickable"
                onClick={() => setShowVenueModal(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowVenueModal(true);
                  }
                }}
                title="Click to view venue picture"
              >
                <div className="rules-box-top">
                  <span className="rules-box-icon"><FaBuilding /></span>
                  <span className="rules-box-label">VENUE</span>
                  <span className="rules-box-corner-indicator" title="Click to view picture">↗</span>
                </div>
                <div className="rules-box-value">{event.venue || 'CSE Department Labs'}</div>
                <span className="rules-box-subhint">Click to view photo</span>
              </div>

              {/* Box 2: Timing */}
              <div className="rules-overview-box">
                <div className="rules-box-top">
                  <span className="rules-box-icon"><FaClock /></span>
                  <span className="rules-box-label">TIMING</span>
                </div>
                <div className="rules-box-value">{event.timing || '10:40 AM – 12:40 PM'}</div>
                <span className="rules-box-subhint">Reporting: 15 mins prior</span>
              </div>

              {/* Box 3: Registration Fee */}
              <div className="rules-overview-box">
                <div className="rules-box-top">
                  <span className="rules-box-icon"><FaMoneyBillWave /></span>
                  <span className="rules-box-label">REGISTRATION FEE</span>
                </div>
                <div className="rules-box-value fee-highlight">{event.fee}</div>
                <span className="rules-box-subhint">
                  {event.feeType === 'per_head' ? 'Per participant' : 'Per team'}
                </span>
              </div>

              {/* Box 4: Members / Team Size */}
              <div className="rules-overview-box">
                <div className="rules-box-top">
                  <span className="rules-box-icon"><FaUsers /></span>
                  <span className="rules-box-label">MEMBERS</span>
                </div>
                <div className="rules-box-value">{event.teamSize}</div>
                <span className="rules-box-subhint">
                  {event.isTeam ? 'Team competition' : 'Solo entry'}
                </span>
              </div>
            </div>

            {/* One Long Diagonal Card for Description */}
            <div className="rules-desc-diagonal-card">
              <div className="diagonal-card-header">
                <div className="diagonal-card-badge">
                  <span className="diagonal-badge-dot" />
                  <span>OVERVIEW & BRIEF</span>
                </div>
                <span className="diagonal-cut-corner-decor" />
              </div>
              <div className="diagonal-card-content">
                <p className="diagonal-desc-text">
                  {event.description || event.subtitle}
                </p>
                {event.subtitle && event.description && event.subtitle !== event.description && (
                  <div className="diagonal-subtitle-tag">
                    <span>✦ {event.subtitle}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Registration CTA Actions */}
            {isEsports ? (
              <div className="overview-card-cta-wrap esports-cta-wrap">
                <div className="esports-cta-heading">
                  {isRegClosed ? 'REGISTRATIONS STATUS' : 'REGISTRATION FOR THIS EVENT'}
                </div>
                {isRegClosed ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-full-width"
                    disabled={true}
                    style={{
                      background: 'linear-gradient(135deg, #7f1d1d, #451a1a)',
                      borderColor: '#ef4444',
                      color: '#fca5a5',
                      cursor: 'not-allowed',
                      boxShadow: 'none',
                      transform: 'none',
                      opacity: 0.95
                    }}
                  >
                    <FaLock style={{ marginRight: '0.4rem' }} /> REGISTRATIONS CLOSED
                  </button>
                ) : (
                  <div className="esports-buttons-grid">
                    <button
                      type="button"
                      className="esports-action-btn esports-btn-freefire"
                      onClick={() => handleRegisterGame('FREE FIRE')}
                      id="btn-register-freefire"
                    >
                      <span>FREE FIRE</span>
                      <FaArrowRight className="esports-btn-arrow" />
                    </button>
                    <button
                      type="button"
                      className="esports-action-btn esports-btn-bgmi"
                      onClick={() => handleRegisterGame('BGMI')}
                      id="btn-register-bgmi"
                    >
                      <span>BGMI</span>
                      <FaArrowRight className="esports-btn-arrow" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overview-card-cta-wrap">
                <button
                  type="button"
                  className="btn btn-primary btn-full-width"
                  onClick={isRegClosed ? undefined : handleRegister}
                  disabled={isRegClosed}
                  style={isRegClosed ? {
                    background: 'linear-gradient(135deg, #7f1d1d, #451a1a)',
                    borderColor: '#ef4444',
                    color: '#fca5a5',
                    cursor: 'not-allowed',
                    boxShadow: 'none',
                    transform: 'none',
                    opacity: 0.95
                  } : {}}
                >
                  {isRegClosed ? (
                    <>
                      <FaLock style={{ marginRight: '0.4rem' }} /> REGISTRATIONS CLOSED
                    </>
                  ) : (
                    <>
                      REGISTER FOR THIS EVENT <FaArrowRight style={{ marginLeft: '0.4rem' }} />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>

          {/* Right Side: Separate Rules Card and Coordinator Contact Card */}
          <div className="rules-right-stack">
            {/* Card 1: Rules & Guidelines */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="rules-card-glass rules-right-rules-card"
            >
              <div className="rules-card-header">
                <h2 className="rules-card-title">
                  <FaListOl className="rules-card-icon" /> Rules & Guidelines
                </h2>
                {rulesList.length > 0 && (
                  <span className="rules-count-badge">{rulesList.length} Rules</span>
                )}
              </div>

              {rulesList.length > 0 ? (
                <ol className="rules-unified-list">
                  {rulesList.map((rule, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.15 + idx * 0.03 }}
                      className="rules-unified-item"
                    >
                      <span className="rules-item-index">{idx + 1}.</span>
                      <span className="rules-item-text">{rule}</span>
                    </motion.li>
                  ))}
                </ol>
              ) : (
                <p className="rules-empty-text">Standard event guidelines apply. Contact event coordinators for details.</p>
              )}
            </motion.div>

            {/* Card 2: Event Coordinators & Contact (Separate Card) */}
            {coordsList.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="rules-card-glass rules-coords-card"
              >
                <div className="rules-card-header">
                  <h2 className="rules-card-title">
                    <FaHeadset className="rules-card-icon" /> Event Coordinators & Contact
                  </h2>
                  <span className="rules-count-badge">{coordsList.length} Coordinators</span>
                </div>

                <div className="rules-coords-grid">
                  {coordsList.map((coord, idx) => (
                    <div key={idx} className="rules-embedded-coord-chip">
                      <div className="coord-chip-info">
                        <span className="coord-chip-badge">{coord.role || `Coordinator ${idx + 1}`}</span>
                        <h4 className="coord-chip-name">{coord.name}</h4>
                      </div>
                      <a
                        href={`tel:${coord.phone}`}
                        className="coord-chip-call-btn"
                        title={`Call ${coord.name}`}
                      >
                        <FaPhoneAlt size={11} style={{ marginRight: '6px' }} />
                        <span>{coord.displayPhone || coord.phone}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="rules-mobile-sticky-bar">
        <button className="rules-mobile-back-btn" onClick={handleBackToEvents}>
          <FaArrowLeft style={{ marginRight: '0.45rem', verticalAlign: '-1px' }} /> Back
        </button>
        <button className="rules-mobile-register-btn" onClick={handleRegister}>
          Register Now <FaArrowRight style={{ marginLeft: '0.45rem', verticalAlign: '-1px' }} />
        </button>
      </div>

      {/* Venue Photo Popup Modal */}
      <VenueImageModal
        isOpen={showVenueModal}
        onClose={() => setShowVenueModal(false)}
        event={event}
      />
    </div>
  );
}
