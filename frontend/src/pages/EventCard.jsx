import { FaArrowRight } from 'react-icons/fa';
import { getEventBanner } from '../data/eventImages.js';

function getEventIllustration(event) {
  const bannerSrc = getEventBanner(event);
  if (bannerSrc) {
    return (
      <div className="event-banner-img-container">
        <img
          src={bannerSrc}
          alt={event?.alias || event?.name || 'Event'}
          className="event-card-banner-img"
          loading="lazy"
          onError={(e) => {
            const fallback = getEventBanner({ ...event, image: '' });
            if (e.target.src !== fallback) {
              e.target.src = fallback;
            }
          }}
        />
      </div>
    );
  }
  return null;
}

function getEventIcon(id) {
  switch (id) {
    case 'tech-02':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#39FF88" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="event-title-icon-svg">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case 'tech-01':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#39FF88" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="event-title-icon-svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'tech-04':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#39FF88" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="event-title-icon-svg">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#39FF88" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="event-title-icon-svg">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
  }
}

export default function EventCard({ event, onRegister, onViewRules }) {
  const handleViewRules = (e) => {
    if (e) e.stopPropagation();
    if (onViewRules) {
      onViewRules(event);
    } else if (onRegister) {
      onRegister(event.id || event);
    }
  };

  const handleRegister = (e) => {
    if (e) e.stopPropagation();
    if (onRegister) {
      onRegister(event.id || event);
    } else if (onViewRules) {
      onViewRules(event);
    }
  };

  const isTech = event.category === 'technical';

  return (
    <div className={`event-poster-card ${isTech ? 'poster-tech' : 'poster-nontech'}`}>
      {/* Top Banner Container with Poster Illustration */}
      <div className="event-card-top-banner">
        {getEventIllustration(event)}
      </div>

      {/* Bottom Content Block */}
      <div className="event-card-bottom-content">
        <div className="event-header-row">
          <span className="event-header-icon">{getEventIcon(event.id)}</span>
          <h3 className="event-card-title">{event.name}</h3>
        </div>

        <p className="event-card-desc">
          {event.subtitle || event.description}
        </p>

        <div className="event-card-meta-list">
          <div className="meta-line">
            <span className="meta-key">Venue:</span>
            <span className="meta-val">{event.venue || 'CSE Department Labs'}</span>
          </div>
          <div className="meta-line">
            <span className="meta-key">Time:</span>
            <span className="meta-val">{event.timing || '10:00 AM – 1:00 PM'}</span>
          </div>
          <div className="meta-line meta-fee-row">
            <div className="meta-fee-left">
              <span className="meta-key">Fee:</span>
              <span className="meta-val fee-val-highlight">{event.fee}</span>
            </div>
            <button
              type="button"
              className="view-rules-direct-btn"
              onClick={handleViewRules}
              title={`View complete rules and guidelines for ${event.name}`}
            >
              View Rules <FaArrowRight style={{ fontSize: '0.62rem', marginLeft: '4px' }} />
            </button>
          </div>
        </div>

        {/* Single Primary Register Action Button (leads to rules page) */}
        <div className="event-card-buttons-row">
          <button
            type="button"
            className="btn btn-primary btn-card-register btn-full-width"
            onClick={handleRegister}
          >
            REGISTER <FaArrowRight style={{ marginLeft: '0.35rem', verticalAlign: '-1px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
