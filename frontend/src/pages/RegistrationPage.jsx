import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getApiUrl } from '../config/api';
import {
  FaBolt,
  FaGamepad,
  FaArrowRight,
  FaArrowLeft,
  FaCheck,
  FaClipboard,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
  FaPrint,
  FaUserPlus,
  FaUsers,
  FaShieldAlt,
  FaEdit,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaGraduationCap,
  FaBuilding,
  FaCheckCircle,
  FaSpinner,
  FaHeadset,
  FaBookOpen
} from 'react-icons/fa';
import events from '../data/events.js';
import coordinatorsData from '../data/coordinator.js';
import { submitRegistration } from '../services/api.js';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other'];

export default function RegistrationPage({ eventId, initialGame, onNavigate }) {
  const [eventsList, setEventsList] = useState(events);
  // Determine initially selected event
  const initialEvent = eventId ? (events.find((e) => e.id === eventId || e.id.toLowerCase() === eventId.toLowerCase()) || null) : null;
  const [selectedEvent, setSelectedEvent] = useState(initialEvent);

  useEffect(() => {
    fetch(getApiUrl('/api/events'))
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          setEventsList(result.data);
          if (eventId) {
            const found = result.data.find(
              (e) => e.id === eventId || e.id.toLowerCase() === eventId.toLowerCase()
            );
            if (found) setSelectedEvent(found);
          }
        }
      })
      .catch(() => {});
  }, [eventId]);

  // Event-specific student coordinators (live from backend with local fallback)
  const [liveCoordinators, setLiveCoordinators] = useState(() => {
    return selectedEvent ? (coordinatorsData[selectedEvent.id]?.coordinators || []) : [];
  });

  useEffect(() => {
    if (!selectedEvent?.id) {
      setLiveCoordinators([]);
      return;
    }

    let isMounted = true;
    const staticFallback = coordinatorsData[selectedEvent.id]?.coordinators || [];

    fetch(getApiUrl(`/api/coordinators/event/${encodeURIComponent(selectedEvent.id)}`))
      .then((res) => res.json())
      .then((result) => {
        if (!isMounted) return;
        if (result.success && Array.isArray(result.data)) {
          setLiveCoordinators(result.data);
        } else {
          setLiveCoordinators(staticFallback);
        }
      })
      .catch(() => {
        if (isMounted) setLiveCoordinators(staticFallback);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedEvent?.id]);

  const eventCoordinators = liveCoordinators;

  // Stepper: 'participant' | 'team' | 'review' | 'success'
  const [step, setStep] = useState('participant');

  useEffect(() => {
    if (!eventId) {
      if (onNavigate) {
        onNavigate('events');
      } else {
        window.location.hash = '/events';
      }
    } else {
      const found = eventsList.find((e) => e.id === eventId || e.id.toLowerCase() === eventId.toLowerCase()) || events.find((e) => e.id === eventId || e.id.toLowerCase() === eventId.toLowerCase());
      if (found) {
        setSelectedEvent(found);
      }
    }
  }, [eventId, eventsList, onNavigate]);

  const formRef = useRef(null);
  const isEsports = selectedEvent ? selectedEvent.id === 'nontech-05' : eventId === 'nontech-05';

  const getValidGame = (g) => {
    if (!g) return 'FREE FIRE';
    const upper = String(g).toUpperCase();
    if (upper.includes('BGMI')) return 'BGMI';
    return 'FREE FIRE';
  };

  const [selectedGame, setSelectedGame] = useState(() => {
    if (initialGame) return getValidGame(initialGame);
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const q = new URLSearchParams(hash.substring(qIndex));
      if (q.get('game')) return getValidGame(q.get('game'));
    }
    return 'FREE FIRE';
  });

  const initialFields = {
    fullName: '',
    email: '',
    phone: '',
    whatsapp: '',
    sameAsPhone: true,
    college: '',
    department: '',
    year: '',
    teamName: '',
    teamMembers: [],
  };

  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Sync when eventId prop changes from routing
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (eventId) {
      const ev = events.find((e) => e.id === eventId || e.id.toLowerCase() === eventId.toLowerCase());
      if (ev) {
        setSelectedEvent(ev);
        setStep('participant');
        initTeamMembersForEvent(ev);
      } else {
        if (onNavigate) onNavigate('events');
        else window.location.hash = '/events';
      }
    } else {
      if (onNavigate) onNavigate('events');
      else window.location.hash = '/events';
    }
    if (initialGame) {
      setSelectedGame(getValidGame(initialGame));
    }
  }, [eventId, initialGame, onNavigate]);

  // Helper to pre-populate team members based on event requirements
  const initTeamMembersForEvent = (event) => {
    if (!event) return;
    if (event.feeType === 'per_squad' && event.maxMembers > 1) {
      // Fixed 4-player squad: 1 lead + 3 members
      setFields((prev) => ({
        ...prev,
        teamMembers: Array(event.maxMembers - 1).fill(''),
      }));
    } else if (event.isTeam && event.minMembers > 1) {
      // Min members required
      const count = Math.max(1, event.minMembers - 1);
      setFields((prev) => ({
        ...prev,
        teamMembers: Array(count).fill(''),
      }));
    } else {
      setFields((prev) => ({
        ...prev,
        teamMembers: [],
      }));
    }
  };

  // Fee calculation using event data
  const calculateTotalFee = () => {
    if (!selectedEvent) return { total: 0, formula: 'No event selected', count: 0, feePerHead: 0 };

    if (selectedEvent.feeType === 'per_squad') {
      return {
        total: 200,
        formula: 'Flat ₹200 for 4-Player Squad',
        count: 4,
        feePerHead: 50,
      };
    }

    const participantCount = 1 + (fields.teamMembers ? fields.teamMembers.length : 0);
    const fee = selectedEvent.feePerHead || 0;
    const total = participantCount * fee;

    return {
      total,
      formula: total === 0 ? 'FREE' : `₹${fee} × ${participantCount} participant${participantCount > 1 ? 's' : ''}`,
      count: participantCount,
      feePerHead: fee,
    };
  };

  const feeInfo = calculateTotalFee();

  // Field change handler
  const handleChange = (field, value) => {
    setFields((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'phone' && prev.sameAsPhone) {
        updated.whatsapp = value;
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setServerError(null);
  };

  const handleSameAsPhoneToggle = (checked) => {
    setFields((prev) => ({
      ...prev,
      sameAsPhone: checked,
      whatsapp: checked ? prev.phone : '',
    }));
  };

  const handleTeamMemberChange = (index, value) => {
    setFields((prev) => {
      const updated = [...prev.teamMembers];
      updated[index] = value;
      return { ...prev, teamMembers: updated };
    });
    if (errors[`teamMember_${index}`]) {
      setErrors((prev) => ({ ...prev, [`teamMember_${index}`]: undefined }));
    }
  };

  const addTeamMember = () => {
    if (!selectedEvent) return;
    if (fields.teamMembers.length + 1 < selectedEvent.maxMembers) {
      setFields((prev) => ({
        ...prev,
        teamMembers: [...prev.teamMembers, ''],
      }));
    }
  };

  const removeTeamMember = (index) => {
    setFields((prev) => {
      const updated = prev.teamMembers.filter((_, i) => i !== index);
      return { ...prev, teamMembers: updated };
    });
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[`teamMember_${index}`];
      return updated;
    });
  };

  // Change Event action
  const handleChangeEvent = () => {
    if (onNavigate) {
      onNavigate('events');
    } else {
      window.location.hash = '/events';
    }
  };

  // Validation
  const validateParticipant = () => {
    const errs = {};
    if (!fields.fullName.trim()) {
      errs.fullName = 'Full Name is required.';
    } else if (fields.fullName.trim().length < 2) {
      errs.fullName = 'Name must be at least 2 characters.';
    }

    if (!fields.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      errs.email = 'Enter a valid email address (e.g. name@domain.com).';
    }

    if (!fields.phone.trim()) {
      errs.phone = 'Mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(fields.phone.trim())) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number (starts with 6-9).';
    }

    if (fields.whatsapp && fields.whatsapp.trim() && !/^[6-9]\d{9}$/.test(fields.whatsapp.trim())) {
      errs.whatsapp = 'Enter a valid 10-digit WhatsApp number.';
    }

    if (!fields.college.trim()) {
      errs.college = 'College / Institution name is required.';
    }

    if (!fields.department.trim()) {
      errs.department = 'Department / Branch is required.';
    }

    if (!fields.year) {
      errs.year = 'Please select year of study.';
    }

    return errs;
  };

  const validateTeam = () => {
    const errs = {};
    if (!selectedEvent || !selectedEvent.isTeam) return errs;

    if (!fields.teamName.trim()) {
      errs.teamName = 'Team / Squad Name is required.';
    } else if (fields.teamName.trim().length < 2) {
      errs.teamName = 'Team Name must be at least 2 characters.';
    }

    fields.teamMembers.forEach((member, idx) => {
      if (!member || !member.trim()) {
        errs[`teamMember_${idx}`] = `Member ${idx + 2} Full Name is required.`;
      } else if (member.trim().length < 2) {
        errs[`teamMember_${idx}`] = `Member ${idx + 2} Name must be at least 2 characters.`;
      }
    });

    return errs;
  };

  // Step transitions
  const handleProceedToTeamOrReview = (e) => {
    e.preventDefault();
    const errs = validateParticipant();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrors({});

    if (selectedEvent?.isTeam) {
      setStep('team');
    } else {
      setStep('review');
    }
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleProceedToReviewFromTeam = (e) => {
    e.preventDefault();
    const errs = validateTeam();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrors({});
    setStep('review');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Final submission
  const handleFinalSubmit = async () => {
    // Validate everything once more
    const pErrors = validateParticipant();
    const tErrors = selectedEvent?.isTeam ? validateTeam() : {};
    const allErrors = { ...pErrors, ...tErrors };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setStep(Object.keys(pErrors).length > 0 ? 'participant' : 'team');
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      fullName: fields.fullName,
      email: fields.email,
      phone: fields.phone,
      whatsapp: fields.whatsapp || null,
      college: fields.college,
      department: fields.department,
      year: fields.year,
      eventId: selectedEvent.id,
      eventName: isEsports ? `${selectedEvent.name} (${selectedGame})` : selectedEvent.name,
      eventCategory: selectedEvent.category,
      game: isEsports ? selectedGame : null,
      isTeam: selectedEvent.isTeam,
      teamName: fields.teamName || null,
      teamMembers: fields.teamMembers || [],
      feePerHead: selectedEvent.feePerHead,
      totalFee: feeInfo.total,
      feeFormula: feeInfo.formula,
    };

    try {
      const result = await submitRegistration(payload);
      if (result.success) {
        setTicketData(result.data);
        setStep('success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setServerError(result.error || 'Registration submission failed. Please try again.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setServerError('An unexpected network error occurred. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
    fetch(getApiUrl('/api/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentEvent: isEsports 
          ? { ...selectedEvent, name: `${selectedEvent.name} (${selectedGame})`, game: selectedGame }
          : selectedEvent,
        fields,
        totalFee: feeInfo.total,
        game: isEsports ? selectedGame : null
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Registration successful!');
          const resTicket = data.ticketData || {};
          setTicketData({
            ...resTicket,
            registrationId: resTicket.ticketCode || data.registrationId || 'ELQ26-REG',
            fullName: fields.fullName,
            college: fields.college,
            department: fields.department,
            year: fields.year,
            phone: fields.phone,
            email: fields.email,
            eventName: isEsports ? `${selectedEvent.name} (${selectedGame})` : selectedEvent.name,
            eventCategory: selectedEvent.category,
            isTeam: selectedEvent.isTeam,
            teamName: fields.teamName,
            participantCount: 1 + (fields.teamMembers ? fields.teamMembers.length : 0),
            totalFee: feeInfo.total,
            game: isEsports ? selectedGame : null
          });
          setStep('success');
          if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          toast.error('Registration failed: ' + (data.errorDetails || data.message || 'Unknown error'));
        }
      })
      .catch(async (err) => {
        console.warn('API fetch failed, trying local fallback:', err);
        const payload = {
          fullName: fields.fullName,
          email: fields.email,
          phone: fields.phone,
          whatsapp: fields.whatsapp || null,
          college: fields.college,
          department: fields.department,
          year: fields.year,
          eventId: selectedEvent.id,
          eventName: isEsports ? `${selectedEvent.name} (${selectedGame})` : selectedEvent.name,
          eventCategory: selectedEvent.category,
          game: isEsports ? selectedGame : null,
          isTeam: selectedEvent.isTeam,
          teamName: fields.teamName || null,
          teamMembers: fields.teamMembers || [],
          feePerHead: selectedEvent.feePerHead,
          totalFee: feeInfo.total,
          feeFormula: feeInfo.formula,
        };
        try {
          const result = await submitRegistration(payload);
          if (result.success) {
            toast.success('Registration saved!');
            setTicketData(result.data);
            setStep('success');
            if (formRef.current) {
              formRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          } else {
            toast.error('Registration failed: ' + (result.error || 'Server error'));
          }
        } catch (fallbackErr) {
          toast.error('Something went wrong connecting to the server. Please try again.');
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleCopyId = () => {
    if (ticketData?.registrationId) {
      navigator.clipboard.writeText(ticketData.registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const resetForNewRegistration = () => {
    if (onNavigate) {
      onNavigate('events');
    } else {
      window.location.hash = '/events';
    }
  };

  if (!selectedEvent) {
    return null;
  }

  return (
    <div className="registration-page">
      <div className="registration-page-container" ref={formRef}>
        {/* Terminal Header */}
        <div className="reg-terminal-header">
          <div className="reg-terminal-brand">
            <span className="reg-terminal-sys-id">// SECURE SYMPOSIUM GATEWAY //</span>
            <h1 className="reg-terminal-title">ELOQUENCE'26 REGISTRATION TERMINAL</h1>
            <p className="reg-terminal-meta">
              9TH NATIONAL LEVEL TECHNICAL SYMPOSIUM • CAHCET MELVISHARAM • SEPTEMBER 26, 2026
            </p>
          </div>
          <div className="reg-terminal-status-badge">
            <span className="terminal-live-dot" />
            <span>ADMISSIONS ACTIVE</span>
          </div>
        </div>

        {/* Stepper Navigation */}
        {step !== 'success' && (
          <nav className="reg-stepper" aria-label="Registration Progress">
            <div className={`reg-step-item ${step === 'participant' ? 'active' : ['team', 'review'].includes(step) ? 'completed' : ''}`}>
              <span className="reg-step-num">01</span>
              <span className="reg-step-label">PARTICIPANT DETAILS</span>
            </div>
            <div className="reg-step-sep">/</div>

            {selectedEvent?.isTeam && (
              <>
                <div className={`reg-step-item ${step === 'team' ? 'active' : step === 'review' ? 'completed' : ''}`}>
                  <span className="reg-step-num">02</span>
                  <span className="reg-step-label">TEAM DETAILS</span>
                </div>
                <div className="reg-step-sep">/</div>
              </>
            )}

            <div className={`reg-step-item ${step === 'review' ? 'active' : ''}`}>
              <span className="reg-step-num">{selectedEvent?.isTeam ? '03' : '02'}</span>
              <span className="reg-step-label">REVIEW & CONFIRM</span>
            </div>
          </nav>
        )}

        {/* STEP 02 & 03: FORM VIEWS (Participant & Team Details) */}
        {(step === 'participant' || step === 'team') && selectedEvent && (
          <div className="reg-two-column-layout">
            {/* Left Column: Form Steps */}
            <div className="reg-form-col">
              {/* Selected Event HUD Banner */}
              <div className="selected-event-hud">
                <div className="hud-badge-row">
                  <span className={`hud-badge ${selectedEvent.category === 'technical' ? 'hud-badge-tech' : 'hud-badge-nontech'}`}>
                    {selectedEvent.category === 'technical' ? <FaBolt /> : <FaGamepad />}
                    {selectedEvent.category.toUpperCase()}
                  </span>
                  <span className="hud-fee-pill">{selectedEvent.fee}</span>
                  <button type="button" className="btn-change-event" onClick={handleChangeEvent}>
                    <FaExchangeAlt style={{ marginRight: '0.35rem' }} /> Change Event
                  </button>
                </div>
                <h2 className="hud-event-name">
                  {selectedEvent.name}
                  {isEsports && <span className="banner-game-badge"> — {selectedGame}</span>}
                </h2>
                <div className="hud-meta-grid">
                  <span><strong>Format:</strong> {selectedEvent.teamSize}</span>
                  <span><strong>Venue:</strong> {selectedEvent.venue || 'CSE Department Labs'}</span>
                  <span><strong>Time:</strong> {selectedEvent.timing || '10:00 AM – 1:00 PM'}</span>
                </div>
              </div>

              {/* STEP 01: PARTICIPANT DETAILS */}
              {step === 'participant' && (
                <form onSubmit={handleProceedToTeamOrReview} noValidate className="reg-card-panel">
                  <div className="panel-title-bar">
                    <div className="panel-title-left">
                      <span className="panel-step-tag">STEP 01</span>
                      <h3 className="panel-title">PARTICIPANT DETAILS</h3>
                    </div>
                    <span className="panel-req-hint">* Required Fields</span>
                  </div>

                  {isEsports && (
                    <div className="esports-game-select-section" id="reg-field-gameArena">
                      <label className="form-label">
                        SELECT GAME ARENA <span className="required-star">*</span>
                      </label>
                      <div className="esports-game-toggle-grid">
                        <button
                          type="button"
                          className={`esports-toggle-card ${selectedGame === 'FREE FIRE' ? 'active' : ''}`}
                          onClick={() => setSelectedGame('FREE FIRE')}
                        >
                          <div className="game-toggle-radio-circle">
                            {selectedGame === 'FREE FIRE' && <span className="game-toggle-radio-dot" />}
                          </div>
                          <div className="game-toggle-info">
                            <span className="game-toggle-title">FREE FIRE</span>
                            <span className="game-toggle-meta">4-Player Squad • Battle Royale</span>
                          </div>
                          <span className="game-toggle-badge">₹200 / Squad</span>
                        </button>
                        <button
                          type="button"
                          className={`esports-toggle-card ${selectedGame === 'BGMI' ? 'active' : ''}`}
                          onClick={() => setSelectedGame('BGMI')}
                        >
                          <div className="game-toggle-radio-circle">
                            {selectedGame === 'BGMI' && <span className="game-toggle-radio-dot" />}
                          </div>
                          <div className="game-toggle-info">
                            <span className="game-toggle-title">BGMI</span>
                            <span className="game-toggle-meta">4-Player Squad • Battle Royale</span>
                          </div>
                          <span className="game-toggle-badge">₹200 / Squad</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="form-grid-2col">
                    {/* Full Name */}
                    <div className={`form-group ${errors.fullName ? 'form-group-error' : ''}`} id="field-fullName">
                      <label className="form-label">
                        Full Name {selectedEvent.isTeam ? '(Team Leader)' : ''} <span className="required-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Syed Subhan"
                        value={fields.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        required
                      />
                      {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                    </div>

                    {/* Email */}
                    <div className={`form-group ${errors.email ? 'form-group-error' : ''}`} id="field-email">
                      <label className="form-label">
                        Email Address <span className="required-star">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="e.g. student@example.com"
                        value={fields.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        required
                      />
                      {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    {/* Phone */}
                    <div className={`form-group ${errors.phone ? 'form-group-error' : ''}`} id="field-phone">
                      <label className="form-label">
                        Mobile Number <span className="required-star">*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="10-digit Indian Mobile"
                        maxLength={10}
                        value={fields.phone}
                        onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                        required
                      />
                      {errors.phone && <span className="error-message">{errors.phone}</span>}
                    </div>

                    {/* WhatsApp */}
                    <div className={`form-group ${errors.whatsapp ? 'form-group-error' : ''}`} id="field-whatsapp">
                      <div className="whatsapp-label-row">
                        <label className="form-label">WhatsApp Number</label>
                        <label className="same-as-phone-toggle">
                          <input
                            type="checkbox"
                            checked={fields.sameAsPhone}
                            onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                          />
                          <span>Same as Mobile</span>
                        </label>
                      </div>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="10-digit WhatsApp Number"
                        maxLength={10}
                        value={fields.whatsapp}
                        onChange={(e) => handleChange('whatsapp', e.target.value.replace(/\D/g, ''))}
                        disabled={fields.sameAsPhone}
                      />
                      {errors.whatsapp && <span className="error-message">{errors.whatsapp}</span>}
                    </div>

                    {/* College */}
                    <div className={`form-group ${errors.college ? 'form-group-error' : ''}`} id="field-college">
                      <label className="form-label">
                        College / Institution Name <span className="required-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. C. Abdul Hakeem College of Engineering & Tech"
                        value={fields.college}
                        onChange={(e) => handleChange('college', e.target.value)}
                        required
                      />
                      {errors.college && <span className="error-message">{errors.college}</span>}
                    </div>

                    {/* Department */}
                    <div className={`form-group ${errors.department ? 'form-group-error' : ''}`} id="field-department">
                      <label className="form-label">
                        Department / Branch <span className="required-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Computer Science & Engineering"
                        value={fields.department}
                        onChange={(e) => handleChange('department', e.target.value)}
                        required
                      />
                      {errors.department && <span className="error-message">{errors.department}</span>}
                    </div>

                    {/* Year of Study */}
                    <div className={`form-group form-group-full ${errors.year ? 'form-group-error' : ''}`} id="field-year">
                      <label className="form-label">
                        Year of Study <span className="required-star">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={fields.year}
                        onChange={(e) => handleChange('year', e.target.value)}
                        required
                      >
                        <option value="">-- Select Year of Study --</option>
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      {errors.year && <span className="error-message">{errors.year}</span>}
                    </div>
                  </div>

                  <div className="panel-actions-row">
                    <button type="button" className="btn btn-secondary" onClick={handleChangeEvent}>
                      <FaArrowLeft style={{ marginRight: '0.4rem' }} /> BACK TO EVENTS
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {selectedEvent.isTeam ? (
                        <>
                          CONTINUE TO TEAM DETAILS <FaArrowRight style={{ marginLeft: '0.4rem' }} />
                        </>
                      ) : (
                        <>
                          PROCEED TO REVIEW <FaArrowRight style={{ marginLeft: '0.4rem' }} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 02: TEAM DETAILS (Only for team events) */}
              {step === 'team' && selectedEvent?.isTeam && (
                <form onSubmit={handleProceedToReviewFromTeam} noValidate className="reg-card-panel">
                  <div className="panel-title-bar">
                    <div className="panel-title-left">
                      <span className="panel-step-tag">STEP 02</span>
                      <h3 className="panel-title">SQUAD / TEAM CONFIGURATION</h3>
                    </div>
                    <span className="panel-req-hint">{selectedEvent.teamSize}</span>
                  </div>

                  <p className="team-intro-note">
                    Leader is automatically <strong>{fields.fullName || 'Lead Participant'}</strong>.
                    Add squad members according to the competition rules (Maximum {selectedEvent.maxMembers} total participants).
                  </p>

                  {/* Team Name */}
                  <div className={`form-group ${errors.teamName ? 'form-group-error' : ''}`} id="field-teamName" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">
                      Squad / Team Name <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Doom Hackers / Byte Knights"
                      value={fields.teamName}
                      onChange={(e) => handleChange('teamName', e.target.value)}
                      required
                    />
                    {errors.teamName && <span className="error-message">{errors.teamName}</span>}
                  </div>

                  {/* Leader Card */}
                  <div className="leader-preview-card">
                    <div className="leader-badge">MEMBER 1 (SQUAD LEADER)</div>
                    <div className="leader-name">{fields.fullName || 'Lead Participant'}</div>
                    <div className="leader-info">{fields.email} • {fields.phone}</div>
                  </div>

                  {/* Additional Members List */}
                  <div className="team-members-container">
                    <h4 className="members-subheading">// ADDITIONAL SQUAD MEMBERS:</h4>

                    {fields.teamMembers.length === 0 && selectedEvent.feeType !== 'per_squad' && (
                      <p className="no-members-hint">No extra members added yet. You can compete as a solo participant or add team members below.</p>
                    )}

                    {fields.teamMembers.map((member, idx) => (
                      <div
                        key={idx}
                        className={`form-group team-member-entry ${errors[`teamMember_${idx}`] ? 'form-group-error' : ''}`}
                        id={`field-teamMember_${idx}`}
                      >
                        <div className="team-member-row-label">
                          <label className="form-label">
                            Member {idx + 2} Full Name <span className="required-star">*</span>
                          </label>
                          {selectedEvent.feeType !== 'per_squad' && (
                            <button
                              type="button"
                              className="remove-member-btn"
                              onClick={() => removeTeamMember(idx)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={`Enter Full Name of Member ${idx + 2}`}
                          value={member}
                          onChange={(e) => handleTeamMemberChange(idx, e.target.value)}
                          required
                        />
                        {errors[`teamMember_${idx}`] && (
                          <span className="error-message">{errors[`teamMember_${idx}`]}</span>
                        )}
                      </div>
                    ))}

                    {/* Add Member Button if limit not reached */}
                    {selectedEvent.feeType !== 'per_squad' && fields.teamMembers.length + 1 < selectedEvent.maxMembers && (
                      <button type="button" className="add-member-btn" onClick={addTeamMember}>
                        + ADD TEAM MEMBER (UP TO {selectedEvent.maxMembers} PARTICIPANTS TOTAL)
                      </button>
                    )}
                  </div>

                  <div className="panel-actions-row">
                    <button type="button" className="btn btn-secondary" onClick={() => setStep('participant')}>
                      <FaArrowLeft style={{ marginRight: '0.4rem' }} /> EDIT PARTICIPANT
                    </button>
                    <button type="submit" className="btn btn-primary">
                      PROCEED TO REVIEW <FaArrowRight style={{ marginLeft: '0.4rem' }} />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right Column: Live Terminal Summary Card */}
            <aside className="reg-summary-col">
              <div className="reg-sticky-summary">
                <div className="summary-card-header">
                  <span className="summary-title-tag">TERMINAL SUMMARY</span>
                  <h4 className="summary-card-heading">FEE BREAKDOWN</h4>
                </div>

                <div className="summary-event-snippet">
                  <span className="snippet-cat">{selectedEvent.category.toUpperCase()}</span>
                  <div className="snippet-name">{selectedEvent.name}</div>
                  <div className="snippet-structure">{selectedEvent.teamSize}</div>
                </div>

                <div className="summary-lines">
                  <div className="summary-line">
                    <span className="line-label">Base Fee:</span>
                    <span className="line-val">{selectedEvent.fee}</span>
                  </div>
                  <div className="summary-line">
                    <span className="line-label">Registered Count:</span>
                    <span className="line-val">{feeInfo.count} {feeInfo.count === 1 ? 'Participant' : 'Participants'}</span>
                  </div>
                  <div className="summary-line">
                    <span className="line-label">Calculation:</span>
                    <span className="line-val line-calc">{feeInfo.formula}</span>
                  </div>
                  <div className="summary-line line-total">
                    <span className="line-label">TOTAL PAYABLE:</span>
                    <span className="line-val total-glow">
                      {feeInfo.total === 0 ? 'FREE' : `₹${feeInfo.total}`}
                    </span>
                  </div>
                </div>

                <div className="summary-desk-note">
                  <div className="desk-note-icon">ℹ</div>
                  <p>
                    <strong>On-Site Desk Payment:</strong> Payment will be settled at the CAHCET campus registration desk upon reporting on September 26, 2026.
                  </p>
                </div>

                {/* Event-Specific Student Coordinators & Contact */}
                <div className="reg-coordinators-section">
                  <div className="summary-card-header coord-header">
                    <span className="summary-title-tag">STUDENT COORDINATORS</span>
                    <h4 className="summary-card-heading">
                      <FaHeadset style={{ marginRight: '0.45rem', color: 'var(--bright-green)', verticalAlign: '-1px' }} />
                      CONTACT & ASSISTANCE
                    </h4>
                  </div>

                  {eventCoordinators.length > 0 ? (
                    <div className="reg-coord-list">
                      {eventCoordinators.map((coord, idx) => (
                        <div key={idx} className="reg-coord-item">
                          <div className="reg-coord-top">
                            <span className="reg-coord-role">{coord.role || 'Lead Coordinator'}</span>
                            {coord.slot && <span className="reg-coord-slot">SLOT {coord.slot}</span>}
                          </div>
                          <div className="reg-coord-name">{coord.name}</div>
                          <a href={`tel:${coord.phone}`} className="reg-coord-phone">
                            <FaPhoneAlt style={{ marginRight: '0.4rem', fontSize: '0.75rem' }} />
                            {coord.displayPhone || coord.phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.82rem', textAlign: 'center' }}>
                      Coordinator details will be updated soon.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* STEP 03 / 02: REVIEW & CONFIRM */}
        {step === 'review' && selectedEvent && (
          <div className="reg-review-view">
            <div className="review-panel-card">
              <div className="panel-title-bar">
                <div className="panel-title-left">
                  <span className="panel-step-tag">STEP {selectedEvent.isTeam ? '03' : '02'}</span>
                  <h3 className="panel-title">REVIEW REGISTRATION</h3>
                </div>
                <span className="review-check-pill">
                  <FaShieldAlt style={{ marginRight: '0.35rem' }} /> READY FOR CONFIRMATION
                </span>
              </div>

              {serverError && (
                <div className="server-error-banner">
                  <FaExclamationTriangle style={{ marginRight: '0.5rem', flexShrink: 0 }} />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Review Sections Grid */}
              <div className="review-grid-sections">
                {/* 1. Participant Details */}
                <div className="review-section-box">
                  <div className="review-sec-header">
                    <h4>PARTICIPANT INFORMATION</h4>
                    <button type="button" className="btn-edit-sec" onClick={() => setStep('participant')}>
                      <FaEdit /> Edit
                    </button>
                  </div>
                  <div className="review-data-list">
                    <div className="review-row">
                      <span className="r-label">Full Name:</span>
                      <span className="r-val">{fields.fullName}</span>
                    </div>
                    <div className="review-row">
                      <span className="r-label">Email:</span>
                      <span className="r-val">{fields.email}</span>
                    </div>
                    <div className="review-row">
                      <span className="r-label">Mobile Number:</span>
                      <span className="r-val">{fields.phone}</span>
                    </div>
                    {fields.whatsapp && (
                      <div className="review-row">
                        <span className="r-label">WhatsApp:</span>
                        <span className="r-val">{fields.whatsapp}</span>
                      </div>
                    )}
                    <div className="review-row">
                      <span className="r-label">College:</span>
                      <span className="r-val">{fields.college}</span>
                    </div>
                    <div className="review-row">
                      <span className="r-label">Department:</span>
                      <span className="r-val">{fields.department}</span>
                    </div>
                    <div className="review-row">
                      <span className="r-label">Year of Study:</span>
                      <span className="r-val">{fields.year}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Competition Details */}
                <div className="review-section-box">
                  <div className="review-sec-header">
                    <h4>SELECTED SHOWDOWN</h4>
                    <button type="button" className="btn-edit-sec" onClick={handleChangeEvent}>
                      <FaExchangeAlt /> Change
                    </button>
                  </div>
                  <div className="review-data-list">
                    <div className="review-row">
                      <span className="r-label">Competition:</span>
                      <span className="r-val font-accent">
                        {selectedEvent.name}
                        {isEsports && ` (${selectedGame})`}
                      </span>
                    </div>
                    {isEsports && (
                      <div className="review-row">
                        <span className="r-label">Game Arena:</span>
                        <span className="r-val font-accent">🔥 {selectedGame}</span>
                      </div>
                    )}
                    <div className="review-row">
                      <span className="r-label">Category:</span>
                      <span className="r-val">{selectedEvent.category.toUpperCase()}</span>
                    </div>
                    <div className="review-row">
                      <span className="r-label">Structure:</span>
                      <span className="r-val">{selectedEvent.teamSize}</span>
                    </div>
                    <div className="review-row">
                      <span className="r-label">Reporting Venue:</span>
                      <span className="r-val">{selectedEvent.venue || 'CSE Department Labs'}</span>
                    </div>
                    <div className="review-row">
                      <span className="r-label">Scheduled Time:</span>
                      <span className="r-val">{selectedEvent.timing || '10:00 AM – 1:00 PM'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Team Details (If Applicable) */}
                {selectedEvent.isTeam && (
                  <div className="review-section-box review-full-col">
                    <div className="review-sec-header">
                      <h4>SQUAD CONFIGURATION</h4>
                      <button type="button" className="btn-edit-sec" onClick={() => setStep('team')}>
                        <FaEdit /> Edit Squad
                      </button>
                    </div>
                    <div className="review-data-list">
                      <div className="review-row">
                        <span className="r-label">Team Name:</span>
                        <span className="r-val font-bold">{fields.teamName || 'N/A'}</span>
                      </div>
                      <div className="review-row">
                        <span className="r-label">Leader (Member 1):</span>
                        <span className="r-val">{fields.fullName}</span>
                      </div>
                      {fields.teamMembers.length > 0 ? (
                        fields.teamMembers.map((m, idx) => (
                          <div key={idx} className="review-row">
                            <span className="r-label">Member {idx + 2}:</span>
                            <span className="r-val">{m}</span>
                          </div>
                        ))
                      ) : (
                        <div className="review-row">
                          <span className="r-label">Additional Members:</span>
                          <span className="r-val">Solo Participation</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Financial Summary */}
                <div className="review-section-box review-full-col review-finances-box">
                  <div className="review-sec-header">
                    <h4>REGISTRATION FEE & PAYMENT SUMMARY</h4>
                  </div>
                  <div className="review-finance-grid">
                    <div className="fin-item">
                      <span className="fin-label">BASE EVENT FEE</span>
                      <span className="fin-val">{selectedEvent.fee}</span>
                    </div>
                    <div className="fin-item">
                      <span className="fin-label">REGISTERED PARTICIPANTS</span>
                      <span className="fin-val">{feeInfo.count}</span>
                    </div>
                    <div className="fin-item">
                      <span className="fin-label">CALCULATION</span>
                      <span className="fin-val">{feeInfo.formula}</span>
                    </div>
                    <div className="fin-item fin-item-total">
                      <span className="fin-label">TOTAL PAYABLE AMOUNT</span>
                      <span className="fin-val fin-highlight">
                        {feeInfo.total === 0 ? 'FREE' : `₹${feeInfo.total}`}
                      </span>
                    </div>
                  </div>
                  <p className="fin-desk-reminder">
                    * Registration status will be marked as <strong>CONFIRMED</strong> with payment settled at on-site helpdesk.
                  </p>
                </div>

                {/* 5. Student Coordinators & Contact in Review */}
                <div className="review-section-box review-full-col">
                  <div className="review-sec-header">
                    <h4>
                      <FaHeadset style={{ marginRight: '0.45rem', color: 'var(--bright-green)', verticalAlign: '-1px' }} />
                      STUDENT COORDINATORS & CONTACT ({selectedEvent.name})
                    </h4>
                  </div>
                  {eventCoordinators.length > 0 ? (
                    <div className="review-coord-grid">
                      {eventCoordinators.map((c, idx) => (
                        <div key={idx} className="review-coord-entry">
                          <span className="review-coord-role">{c.role || `Coordinator ${idx + 1}`}</span>
                          <strong className="review-coord-name">{c.name}</strong>
                          <a href={`tel:${c.phone}`} className="review-coord-phone">
                            <FaPhoneAlt style={{ marginRight: '0.35rem', fontSize: '0.75rem' }} />
                            {c.displayPhone || c.phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem', textAlign: 'center' }}>
                      Coordinator details will be updated soon.
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation Actions */}
              <div className="panel-actions-row review-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(selectedEvent.isTeam ? 'team' : 'participant')}
                  disabled={isSubmitting}
                >
                  <FaArrowLeft style={{ marginRight: '0.4rem' }} /> EDIT DETAILS
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-confirm-submit"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="spinner-rotate" style={{ marginRight: '0.5rem' }} />
                      TRANSMITTING TO TERMINAL...
                    </>
                  ) : (
                    <>
                      CONFIRM REGISTRATION →
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 05: SUCCESS SCREEN */}
        {step === 'success' && ticketData && (
          <div className="reg-success-view">
            <div className="success-badge-icon">
              <FaCheck />
            </div>

            <span className="success-pre-title">// TRANSMISSION COMPLETE //</span>
            <h2 className="success-card-title">REGISTRATION SUCCESSFUL</h2>
            <p className="success-card-sub">
              Your registration for <strong>{ticketData.eventName}</strong> has been officially confirmed and logged in the symposium database.
            </p>

            {/* Official Cyber Ticket Pass */}
            <div className="ticket-pass">
              <div className="ticket-pass-header">
                <div>
                  <span className="ticket-fest-tag">ELOQUENCE'26 SYMPOSIUM PASS</span>
                  <h3 className="ticket-event-name">{ticketData.eventName}</h3>
                  <span className={`ticket-cat-badge ${ticketData.eventCategory === 'technical' ? 'badge-tech' : 'badge-nontech'}`}>
                    {ticketData.eventCategory.toUpperCase()} SHOWDOWN
                  </span>
                </div>

                <div className="ticket-code-block">
                  <span className="ticket-code-label">OFFICIAL REGISTRATION ID</span>
                  <div className="ticket-code-value">{ticketData.registrationId}</div>
                  <button type="button" className="btn-copy-code" onClick={handleCopyId}>
                    {copied ? (
                      <>
                        <FaCheck style={{ marginRight: '0.3rem' }} /> COPIED TO CLIPBOARD
                      </>
                    ) : (
                      <>
                        <FaClipboard style={{ marginRight: '0.3rem' }} /> COPY REGISTRATION ID
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="ticket-pass-grid">
                <div className="ticket-info-item">
                  <span className="ticket-label">LEAD PARTICIPANT</span>
                  <span className="ticket-val">{ticketData.fullName}</span>
                </div>

                <div className="ticket-info-item">
                  <span className="ticket-label">COLLEGE / INSTITUTION</span>
                  <span className="ticket-val">{ticketData.college}</span>
                </div>

                <div className="ticket-info-item">
                  <span className="ticket-label">DEPARTMENT & YEAR</span>
                  <span className="ticket-val">{ticketData.department} ({ticketData.year})</span>
                </div>

                <div className="ticket-info-item">
                  <span className="ticket-label">CONTACT PHONE & EMAIL</span>
                  <span className="ticket-val">{ticketData.phone} • {ticketData.email}</span>
                </div>

                {ticketData.isTeam && ticketData.teamName && (
                  <div className="ticket-info-item">
                    <span className="ticket-label">SQUAD / TEAM NAME</span>
                    <span className="ticket-val">{ticketData.teamName} ({ticketData.participantCount} Total)</span>
                  </div>
                )}
                {(ticketData.game || isEsports) && (
                  <div className="ticket-info-item">
                    <span className="ticket-label">GAME ARENA</span>
                    <span className="ticket-val game-highlight">🔥 {ticketData.game || selectedGame} SQUAD</span>
                  </div>
                )}
                <div className="ticket-info-item">
                  <span className="ticket-label">REGISTRATION STATUS</span>
                  <span className="ticket-val status-confirmed">
                    <FaCheckCircle style={{ marginRight: '0.35rem', verticalAlign: '-1px' }} />
                    {ticketData.registrationStatus || 'CONFIRMED'}
                  </span>
                </div>

                <div className="ticket-info-item">
                  <span className="ticket-label">TOTAL PAYABLE FEE</span>
                  <span className="ticket-val fee-highlight">
                    {ticketData.totalAmount === 0 ? 'FREE' : `₹${ticketData.totalAmount}`} (On-Site Desk)
                  </span>
                </div>
              </div>

              <div className="ticket-pass-footer">
                <span>
                  <FaCalendarAlt style={{ marginRight: '0.35rem', verticalAlign: '-1px' }} />
                  Date: September 26, 2026
                </span>
                <span>
                  <FaMapMarkerAlt style={{ marginRight: '0.35rem', verticalAlign: '-1px' }} />
                  Venue: CAHCET Campus, Melvisharam
                </span>
                <span>
                  <FaClock style={{ marginRight: '0.35rem', verticalAlign: '-1px' }} />
                  Logged: {ticketData.createdAtFormatted || '2026-09-26'}
                </span>
              </div>
            </div>

            {/* Success Actions */}
            <div className="success-actions">
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <FaPrint style={{ marginRight: '0.4rem' }} /> PRINT / SAVE PASS
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForNewRegistration}>
                <FaUserPlus style={{ marginRight: '0.4rem' }} /> REGISTER ANOTHER EVENT
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate && onNavigate('events')}>
                EXPLORE ALL EVENTS →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
