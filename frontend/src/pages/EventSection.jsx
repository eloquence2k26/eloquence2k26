import { getCachedEvents, fetchEventsData } from '../services/api.js';
import EventCard from './EventCard.jsx';

export default function EventSection({ onRegister, onViewRules }) {
  const initialCache = getCachedEvents();
  const [eventsList, setEventsList] = useState(() => initialCache || []);
  const [filter, setFilter] = useState('all');
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    fetchEventsData().then((data) => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setEventsList(data);
      }
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
