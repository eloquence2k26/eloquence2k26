import { useState, useEffect, useRef } from 'react';
import events from '../data/events.js';
import EventCard from './EventCard.jsx';
import { getApiUrl } from '../config/api';

export default function EventSection({ onRegister, onViewRules }) {
  const [eventsList, setEventsList] = useState(events);
  const [filter, setFilter] = useState('all');
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

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
        console.warn('EventSection live fetch fallback to local data:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const techEvents = eventsList.filter((e) => e.category === 'technical');
  const nonTechEvents = eventsList.filter((e) => e.category === 'non-technical');

  const showTech = filter === 'all' || filter === 'technical';
  const showNonTech = filter === 'all' || filter === 'non-technical';

  return (
    <section
      id="events"
      ref={sectionRef}
      className={`events-section ${visible ? 'events-visible' : ''}`}
    >
      <h2 className="section-heading">ENTER THE BATTLEFIELD</h2>
      <p className="section-sub">Choose your arena. Pick your challenge. Prove your worth.</p>

      <div className="filter-bar">
        {['all', 'technical', 'non-technical'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'filter-btn-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'ALL' : f === 'technical' ? 'TECH' : 'NON-TECH'}
          </button>
        ))}
      </div>

      {showTech && (
        <>
          <div className="category-label">TECHNICAL EVENTS</div>
          <div className="events-grid">
            {techEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onRegister={onRegister}
                onViewRules={onViewRules}
              />
            ))}
          </div>
        </>
      )}

      {showNonTech && (
        <>
          <div className="category-label">NON-TECHNICAL EVENTS</div>
          <div className="events-grid">
            {nonTechEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onRegister={onRegister}
                onViewRules={onViewRules}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
