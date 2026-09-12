import { useEffect, useRef, useState } from 'react';
import { FaGlobe, FaMapMarkerAlt, FaPhoneAlt, FaUser } from 'react-icons/fa';
import { getApiUrl } from '../config/api';

function SponsorCard({ sponsor, tier }) {
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef(null);

  // Auto flip back to front when user clicks anywhere outside this card
  useEffect(() => {
    if (!flipped) return;

    const handlePointerDownOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setFlipped(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [flipped]);

  const handleCardClick = (e) => {
    // If the click is inside an interactive action button, don't toggle flip
    if (e.target.closest('a') || e.target.closest('button')) {
      return;
    }
    setFlipped((f) => !f);
  };

  const tag = sponsor.tag || sponsor.category || 'PARTNER';
  const hasContact = Boolean(sponsor.contactName || sponsor.contactPhone);
  const cleanPhone = sponsor.contactPhone ? String(sponsor.contactPhone).replace(/[^0-9+]/g, '') : '';

  const rawLocation = sponsor.locationUrl || sponsor.location_url || (sponsor.website && /maps|goo\.gl/i.test(sponsor.website) ? sponsor.website : '');
  const locationLink = rawLocation
    ? (rawLocation.startsWith('http') ? rawLocation : `https://${rawLocation}`)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sponsor.name + ' ' + (sponsor.companyName || 'Vellore'))}`;

  const rawWebsite = sponsor.website && (!rawLocation || sponsor.website !== rawLocation) && !/maps|goo\.gl/i.test(sponsor.website) ? sponsor.website : '';
  const websiteLink = rawWebsite ? (rawWebsite.startsWith('http') ? rawWebsite : `https://${rawWebsite}`) : '';
  const hasDetails = Boolean(sponsor.contactName || sponsor.contactPhone || locationLink || websiteLink);
  const hasActions = Boolean(cleanPhone || locationLink || websiteLink);

  const resolveLogo = (logo) => {
    if (!logo || typeof logo !== 'string' || !logo.trim()) return null;
    const trimmed = logo.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/sponsors/')) {
      return trimmed;
    }
    if (trimmed.startsWith('/uploads/')) {
      return getApiUrl(trimmed);
    }
    return trimmed;
  };
  const logoSrc = resolveLogo(sponsor.logo);
  const hasLogo = Boolean(logoSrc);

  const websiteDisplay = websiteLink ? websiteLink.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

  return (
    <div
      ref={cardRef}
      className={`sponsor-card sponsor-card-${tier} ${flipped ? 'card-is-flipped' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`${sponsor.name} — click or tap to view contact details`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
    >
      <div className={`sponsor-card-inner ${flipped ? 'sponsor-flipped' : ''}`}>
        {/* Front Face: Sponsor Image/Logo + Sponsor Name Only */}
        <div className={`sponsor-face sponsor-front ${hasLogo ? 'has-sponsor-photo' : 'no-sponsor-photo'}`}>
          <div className="sponsor-mark">
            {hasLogo ? (
              <img 
                src={logoSrc} 
                alt={sponsor.name} 
                className="sponsor-logo-img"
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.parentElement) {
                    e.target.parentElement.classList.add('sponsor-mark-fallback');
                  }
                }}
              />
            ) : (
              <div className="sponsor-initials-badge">
                <span className="sponsor-initials-text">
                  {sponsor.initials || (sponsor.name ? sponsor.name.slice(0, 2).toUpperCase() : 'SP')}
                </span>
              </div>
            )}
          </div>
          <div className="sponsor-front-bottom">
            <h4 className="sponsor-name">{sponsor.name}</h4>
            {(sponsor.description || (sponsor.companyName && sponsor.companyName !== sponsor.name ? sponsor.companyName : null)) && (
              <p
                className="sponsor-front-desc"
                title={sponsor.description || sponsor.companyName}
              >
                {sponsor.description || sponsor.companyName}
              </p>
            )}
          </div>
        </div>

        {/* Back Face: Contact Details Box + Action Buttons (Description moved to front) */}
        <div className="sponsor-face sponsor-back">
          <div className="sponsor-back-header">
            <span className="sponsor-back-tier-tag">{tag}</span>
            <h4 className="sponsor-back-name">{sponsor.name}</h4>
            {sponsor.companyName && sponsor.companyName !== sponsor.name && (
              <span className="sponsor-back-company">{sponsor.companyName}</span>
            )}
          </div>

          {hasDetails && (
            <div className="sponsor-contact-box">
              {sponsor.contactName && (
                <div className="sponsor-contact-row">
                  <span className="sponsor-contact-label">
                    <FaUser className="sponsor-contact-icon" /> CONTACT
                  </span>
                  <span className="sponsor-contact-val">{sponsor.contactName}</span>
                </div>
              )}
              {sponsor.contactPhone && (
                <div className="sponsor-contact-row">
                  <span className="sponsor-contact-label">
                    <FaPhoneAlt className="sponsor-contact-icon" /> MOBILE
                  </span>
                  <a
                    href={`tel:${cleanPhone}`}
                    className="sponsor-contact-phone-link"
                    onClick={(e) => e.stopPropagation()}
                    title={`Call ${sponsor.contactName || sponsor.name} (${sponsor.contactPhone})`}
                  >
                    {sponsor.contactPhone}
                  </a>
                </div>
              )}
              {websiteLink && (
                <div className="sponsor-contact-row">
                  <span className="sponsor-contact-label">
                    <FaGlobe className="sponsor-contact-icon" /> WEBSITE
                  </span>
                  <a
                    href={websiteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sponsor-contact-location-link sponsor-contact-web-link"
                    onClick={(e) => e.stopPropagation()}
                    title={`Visit ${sponsor.name} official website (${websiteLink})`}
                  >
                    {websiteDisplay} ↗
                  </a>
                </div>
              )}
              {locationLink && (
                <div className="sponsor-contact-row">
                  <span className="sponsor-contact-label">
                    <FaMapMarkerAlt className="sponsor-contact-icon" /> LOCATION
                  </span>
                  <a
                    href={locationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sponsor-contact-location-link"
                    onClick={(e) => e.stopPropagation()}
                    title={`Open ${sponsor.name} in Google Maps`}
                  >
                    View on Map ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {hasActions && (
            <div className="sponsor-back-actions">
              {cleanPhone && (
                <a
                  href={`tel:${cleanPhone}`}
                  className="sponsor-action-pill-btn sponsor-btn-call"
                  onClick={(e) => e.stopPropagation()}
                  title={`Call ${sponsor.contactName || sponsor.name} (${sponsor.contactPhone})`}
                  aria-label={`Call ${sponsor.contactName || sponsor.name}`}
                >
                  <FaPhoneAlt size={12} />
                  <span>Call</span>
                </a>
              )}
              {websiteLink && (
                <a
                  href={websiteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sponsor-action-pill-btn sponsor-btn-website"
                  onClick={(e) => e.stopPropagation()}
                  title={`Visit ${sponsor.name} Website (${websiteLink})`}
                  aria-label={`Website of ${sponsor.name}`}
                >
                  <FaGlobe size={12} />
                  <span>Website ↗</span>
                </a>
              )}
              {locationLink && (
                <a
                  href={locationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sponsor-action-pill-btn sponsor-btn-map"
                  onClick={(e) => e.stopPropagation()}
                  title={`View ${sponsor.name} on Map`}
                  aria-label={`Location of ${sponsor.name}`}
                >
                  <FaMapMarkerAlt size={12} />
                  <span>Map ↗</span>
                </a>
              )}
            </div>
          )}

          <button
            type="button"
            className="sponsor-flip-hint sponsor-flip-back-hint"
            onClick={(e) => {
              e.stopPropagation();
              setFlipped(false);
            }}
            title="Return to front view"
          >
            CLICK TO FLIP BACK ↻
          </button>
        </div>
      </div>
    </div>
  );
}

function SponsorRow({ tier, label, items, direction }) {
  if (!items || items.length === 0) return null;

  // Build a base list that contains at least 8 items so the track easily spans across any screen
  const targetMin = 8;
  const repeatCount = Math.max(1, Math.ceil(targetMin / items.length));
  const baseItems = Array.from({ length: repeatCount }, () => items).flat();

  // Clone baseItems once for the seamless 50% translateX marquee loop
  const loopItems = [...baseItems, ...baseItems];

  return (
    <div className="sponsor-tier">
      <div className="sponsor-tier-label">
        <span className={`sponsor-tier-badge sponsor-tier-${tier}`}>{label}</span>
      </div>
      <div className="sponsor-marquee">
        <div className="sponsor-marquee-fade sponsor-marquee-fade-left" />
        <div className="sponsor-marquee-fade sponsor-marquee-fade-right" />
        <div
          className={`sponsor-track ${direction === 'right' ? 'sponsor-track-reverse' : ''}`}
        >
          {loopItems.map((sponsor, i) => (
            <SponsorCard key={`${sponsor.id}-${tier}-${i}`} sponsor={sponsor} tier={tier} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sponsors() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [liveTiers, setLiveTiers] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.05 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [liveTiers]);

  useEffect(() => {
    let isMounted = true;
    fetch(getApiUrl('/api/sponsors'))
      .then((res) => res.json())
      .then((result) => {
        if (!isMounted) return;
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          const list = result.data;
          const elite = [];
          const premium = [];
          const standard = [];

          list.forEach((s) => {
            const cat = (s.category || '').toLowerCase();
            if (cat.includes('elite') || cat.includes('title')) {
              elite.push(s);
            } else if (cat.includes('premium') || cat.includes('gold') || cat.includes('silver')) {
              premium.push(s);
            } else {
              standard.push(s);
            }
          });

          setLiveTiers({
            elite,
            premium,
            standard,
          });
        }
      })
      .catch((err) => {
        console.warn('Error fetching sponsors from DB:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const tiers = liveTiers || { elite: [], premium: [], standard: [] };
  const hasAnySponsors = (tiers.elite?.length || 0) + (tiers.premium?.length || 0) + (tiers.standard?.length || 0) > 0;

  if (!hasAnySponsors) {
    return null;
  }

  return (
    <section
      id="sponsors"
      ref={sectionRef}
      className={`sponsors-section ${visible ? 'sponsors-visible' : ''}`}
    >
      <h2 className="section-heading">SPONSORS</h2>
      <p className="section-sub">
        The powerhouses fueling ELOQUENCE26 — hover over any card to know them better.
      </p>

      {tiers.elite && tiers.elite.length > 0 && (
        <SponsorRow tier="elite" label="ELITE" items={tiers.elite} direction="left" />
      )}
      {tiers.premium && tiers.premium.length > 0 && (
        <SponsorRow tier="premium" label="PREMIUM" items={tiers.premium} direction="right" />
      )}
      {tiers.standard && tiers.standard.length > 0 && (
        <SponsorRow tier="standard" label="STANDARD" items={tiers.standard} direction="left" />
      )}
    </section>
  );
}
