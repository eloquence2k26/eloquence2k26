import { useState, useEffect, useRef } from 'react';
import { FaBolt, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import EventCard from './EventCard.jsx';
import { getCachedEvents, fetchEventsData } from '../services/api.js';

function AnimatedNumber({ value, prefix = '', suffix = '', padDigits = 2, duration = 1800 }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const target = typeof value === 'number' ? value : parseInt(value, 10) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeProgress * target);

      setDisplayVal(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayVal(target);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  const formattedStr =
    padDigits > 0 ? String(displayVal).padStart(padDigits, '0') : String(displayVal);

  return (
    <span className="stat-num">
      {prefix}
      {formattedStr}
      {suffix}
    </span>
  );
}

export default function EventsPage({ onNavigate }) {
  const initialCache = getCachedEvents();
  const [eventsList, setEventsList] = useState(() => initialCache || []);
  const [loading, setLoading] = useState(() => !initialCache || initialCache.length === 0);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const canvasRef = useRef(null);

  // Fetch live event data from backend API
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
        console.warn('EventsPage live fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Scroll to top when page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Ambient canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    const particles = [];

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.color = Math.random() > 0.5 ? '#39FF88' : '#00A83B';
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    resize();
    for (let i = 0; i < 60; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => { p.update(); p.draw(); });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    window.addEventListener('resize', resize, { passive: true });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleViewRules = (eventId) => {
    if (onNavigate) {
      onNavigate('event-rules', eventId, { from: 'events' });
    }
  };

  const handleRegister = (eventId) => {
    if (onNavigate) {
      onNavigate('event-rules', eventId, { from: 'events' });
    }
  };

  // Filter & search events
  const filteredEvents = eventsList.filter((e) => {
    const matchesCategory = filter === 'all' || e.category === filter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.subtitle && e.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.alias && e.alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.tag && e.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalTechCount = eventsList.filter((e) => e.category === 'technical').length;
  const totalNonTechCount = eventsList.filter((e) => e.category === 'non-technical').length;
  const techEvents = filteredEvents.filter((e) => e.category === 'technical');
  const nonTechEvents = filteredEvents.filter((e) => e.category === 'non-technical');

  if (loading && eventsList.length === 0) {
    return (
      <div className="events-page" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="events-loading-container"
          style={{ padding: '3rem 1.5rem', maxWidth: '480px' }}
        >
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
            <h4 className="cyber-loading-title">INITIALIZING EVENTS DATABASE</h4>
            <p className="cyber-loading-subtext">
              Loading official competitions directly from server
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
    <div className="events-page">
      <canvas ref={canvasRef} className="events-page-canvas" />
      <div className="events-hero-glow" />

      {/* Main Events Content */}
      <section className="events-catalog-section">
        {/* Breadcrumb Navigation */}
        <div className="events-breadcrumb">
          <button
            className="breadcrumb-back-btn"
            onClick={() => onNavigate && onNavigate('home')}
          >
            <FaArrowLeft style={{ marginRight: '0.4rem', verticalAlign: '-1px' }} />
            BACK TO HOME
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">EVENTS CATALOGUE</span>
        </div>

        <div className="events-controls-wrapper">
          {/* Search Bar */}
          <div className="events-search-box">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="events-search-input"
              placeholder="Search event by title, tag, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="filter-bar">
            <button
              className={`filter-btn ${filter === 'all' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              ALL EVENTS ({eventsList.length})
            </button>
            <button
              className={`filter-btn ${filter === 'technical' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilter('technical')}
            >
              TECHNICAL ({totalTechCount})
            </button>
            <button
              className={`filter-btn ${filter === 'non-technical' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilter('non-technical')}
            >
              NON-TECHNICAL ({totalNonTechCount})
            </button>
          </div>
        </div>

        {/* Quick Stats Grid below Search Bar & Filters */}
        <div className="events-stats-grid">
          <div className="stat-card">
            <AnimatedNumber value={eventsList.length} padDigits={2} duration={1800} />
            <span className="stat-label">TOTAL SHOWDOWNS</span>
          </div>
          <div className="stat-card">
            <AnimatedNumber value={totalTechCount} padDigits={2} duration={1600} />
            <span className="stat-label">TECHNICAL EVENTS</span>
          </div>
          <div className="stat-card">
            <AnimatedNumber value={totalNonTechCount} padDigits={2} duration={1600} />
            <span className="stat-label">NON-TECHNICAL</span>
          </div>
        </div>

        {/* Results Info */}
        <div className="events-results-meta">
          <span>Showing <strong>{filteredEvents.length}</strong> competition{filteredEvents.length !== 1 ? 's' : ''}</span>
          {searchQuery && (
            <span className="search-query-badge">
              Filter: "{searchQuery}"
            </span>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="no-events-found">
            <p className="no-events-title">No Events Match Your Search</p>
            <p className="no-events-desc">Try searching for a different keyword or resetting your filter.</p>
            <button
              className="btn btn-primary"
              onClick={() => { setFilter('all'); setSearchQuery(''); }}
            >
              RESET FILTERS
            </button>
          </div>
        ) : (
          <>
            {/* Technical Events Grid */}
            {(filter === 'all' || filter === 'technical') && techEvents.length > 0 && (
              <div className="event-group-block">
                <div className="category-header-row">
                  <div className="category-label">TECHNICAL EVENTS ({techEvents.length})</div>
                  <div className="category-line" />
                </div>
                <div className="events-grid">
                  {techEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onViewRules={handleViewRules}
                      onRegister={handleRegister}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Non-Technical Events Grid */}
            {(filter === 'all' || filter === 'non-technical') && nonTechEvents.length > 0 && (
              <div className="event-group-block">
                <div className="category-header-row">
                  <div className="category-label">NON-TECHNICAL EVENTS ({nonTechEvents.length})</div>
                  <div className="category-line" />
                </div>
                <div className="events-grid">
                  {nonTechEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onViewRules={handleViewRules}
                      onRegister={handleRegister}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
