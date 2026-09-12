import { useState, useEffect, useRef } from 'react';
import { FaBolt, FaArrowLeft, FaArrowRight, FaTimes } from 'react-icons/fa';
import events from '../data/events.js';
import EventCard from './EventCard.jsx';
import { getApiUrl } from '../config/api';

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
  const [eventsList, setEventsList] = useState(events);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const canvasRef = useRef(null);

  // Fetch live event data from backend API with static fallback
  useEffect(() => {
    let isMounted = true;
    fetch(getApiUrl('/api/events'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((result) => {
        if (isMounted && result.success && Array.isArray(result.data) && result.data.length > 0) {
          const sorted = [...result.data].sort((a, b) => {
            if (a.category !== b.category) {
              return a.category === 'technical' ? -1 : 1;
            }
            return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
          });
          setEventsList(sorted);
        }
      })
      .catch((err) => {
        console.warn('EventsPage live fetch fallback to local data:', err);
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

  // Register button on event cards leads to rules page as requested
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
