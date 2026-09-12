import { useState, useEffect } from 'react';
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
  FaBolt,
  FaLock
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { getApiUrl, getWsUrl } from '../config/api';
import { getCachedEvents, fetchEventsData } from '../services/api.js';

export default function EventRulesPage({ eventId, from, categoryFilter, onNavigate }) {
  const initialCache = getCachedEvents();
  const initialFound = initialCache ? initialCache.find((e) => e.id === eventId || e.id?.toLowerCase() === eventId?.toLowerCase()) : null;

  const [eventsList, setEventsList] = useState(() => initialCache || []);
  const [loading, setLoading] = useState(() => !initialFound);
  const [liveCoordinators, setLiveCoordinators] = useState([]);
  const [isRegClosed, setIsRegClosed] = useState(false);

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
    fetchEventsData()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setEventsList(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('EventRulesPage fetch error:', err);
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
    const staticFallback = Array.isArray(event.coordinators) ? event.coordinators : [];
    fetch(getApiUrl(`/api/coordinators/event/${encodeURIComponent(event.id)}`))
      .then((res) => res.json())
      .then((result) => {
        if (!isMounted) return;
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          setLiveCoordinators(result.data);
        } else {
          setLiveCoordinators(staticFallback);
        }
      })
      .catch(() => {
        if (isMounted) setLiveCoordinators(staticFallback);
      });
    return () => { isMounted = false; };
  }, [event?.id]);

  const rulesList = (event && Array.isArray(event.rules) && event.rules.length > 0)
    ? event.rules
    : [];

  const coordsList = (Array.isArray(liveCoordinators) && liveCoordinators.length > 0)
    ? liveCoordinators
    : (event && Array.isArray(event.coordinators) && event.coordinators.length > 0
        ? event.coordinators
        : []);

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

  if (loading || !event) {
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

        {/* Main Title & Category Tag Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rules-title-header-wrap"
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
          {/* Left Side: Overview Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rules-card-glass rules-left-overview-card"
          >
            <div className="rules-card-header">
              <h2 className="rules-card-title">
                <FaMapMarkerAlt className="rules-card-icon" /> Overview
              </h2>
            </div>

            <div className="rules-clean-meta-list">
              <div className="rules-meta-row">
                <span className="rules-meta-icon"><FaMapMarkerAlt /></span>
                <div className="rules-meta-content">
                  <strong className="rules-meta-key">Venue:</strong>
                  <span className="rules-meta-val">{event.venue || 'CSE Department Labs'}</span>
                </div>
              </div>

              <div className="rules-meta-row">
                <span className="rules-meta-icon"><FaClock /></span>
                <div className="rules-meta-content">
                  <strong className="rules-meta-key">Timing:</strong>
                  <span className="rules-meta-val">{event.timing || '10:40 AM – 12:40 PM'}</span>
                </div>
              </div>

              <div className="rules-meta-row">
                <span className="rules-meta-icon"><FaMoneyBillWave /></span>
                <div className="rules-meta-content">
                  <strong className="rules-meta-key">Registration Fee:</strong>
                  <span className="rules-meta-val fee-highlight">{event.fee}</span>
                </div>
              </div>

              <div className="rules-meta-row">
                <span className="rules-meta-icon"><FaUsers /></span>
                <div className="rules-meta-content">
                  <strong className="rules-meta-key">Members:</strong>
                  <span className="rules-meta-val">{event.teamSize}</span>
                </div>
              </div>

              <div className="rules-meta-row desc-row">
                <div className="rules-meta-content">
                  <strong className="rules-meta-key">Description:</strong>
                  <p className="rules-meta-desc-text">{event.subtitle || event.description}</p>
                </div>
              </div>
            </div>

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
    </div>
  );
}
