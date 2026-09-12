import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  FaChartBar, 
  FaCalendarCheck, 
  FaUsers, 
  FaQrcode, 
  FaTrophy, 
  FaSignOutAlt, 
  FaSun, 
  FaMoon, 
  FaPhoneAlt, 
  FaWhatsapp, 
  FaEnvelope, 
  FaEdit, 
  FaCheck, 
  FaTimes, 
  FaSearch, 
  FaFilter, 
  FaFileCsv, 
  FaUserTie, 
  FaLayerGroup, 
  FaClock, 
  FaMapMarkerAlt, 
  FaPaperPlane, 
  FaAward, 
  FaMedal, 
  FaStar, 
  FaInfoCircle, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaBars,
  FaShieldAlt,
  FaFileAlt
} from 'react-icons/fa';
import defaultEvents from '../data/events.js';
import rulesData from '../data/rules.js';
import { getApiUrl } from '../config/api';
import ParticipantVerifier from '../components/ParticipantVerifier.jsx';
import { 
  fetchEventWinners, 
  submitEventWinners, 
  updateEventCoordinatorDetails,
  getCachedEvents,
  fetchEventsData
} from '../services/api.js';

export default function EventCoordinatorDashboard({ token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('coord_theme') || 'dark');
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('coord_theme', next);
  };

  // ── 1. Load Data ──
  const [eventsList, setEventsList] = useState(() => getCachedEvents() || defaultEvents);
  const [registrationsList, setRegistrationsList] = useState([]);
  const [coordinatorsList, setCoordinatorsList] = useState([]);
  const [winnersList, setWinnersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── 2. Determine Allocated Event(s) for this Coordinator ──
  // Check user.assignedEvents or match user.username with coordinator data
  const userAllocatedEventIds = useMemo(() => {
    if (user?.assignedEvents && Array.isArray(user.assignedEvents) && user.assignedEvents.length > 0) {
      return user.assignedEvents;
    }
    if (user?.eventId) {
      return [user.eventId];
    }
    // Try matching coordinator name with logged in username or role
    const uName = String(user?.username || '').toLowerCase();
    const matchedCoord = coordinatorsList.find(c => 
      c.name?.toLowerCase().includes(uName) || uName.includes(c.name?.toLowerCase().split(' ')[0])
    );
    if (matchedCoord && matchedCoord.assignedEvents?.length > 0) {
      return matchedCoord.assignedEvents;
    }
    // Default fallback: first technical event
    return ['tech-01'];
  }, [user, coordinatorsList]);

  const [selectedEventId, setSelectedEventId] = useState(() => userAllocatedEventIds[0] || 'tech-01');

  useEffect(() => {
    if (userAllocatedEventIds.length > 0 && !userAllocatedEventIds.includes(selectedEventId)) {
      setSelectedEventId(userAllocatedEventIds[0]);
    }
  }, [userAllocatedEventIds]);

  // Current allocated event object
  const currentEvent = useMemo(() => {
    return eventsList.find(e => e.id === selectedEventId) || eventsList[0] || {
      id: selectedEventId,
      name: 'Allocated Event',
      category: 'technical',
      fee: 250,
      isTeam: false
    };
  }, [eventsList, selectedEventId]);

  // Current event's rules and rounds
  const currentEventRuleData = useMemo(() => {
    return rulesData[selectedEventId] || null;
  }, [selectedEventId]);

  // ── 3. Fetch Master Data on Mount ──
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Events
      fetchEventsData().then(evts => {
        if (evts && evts.length > 0) setEventsList(evts);
      }).catch(() => {});

      // 2. Fetch Registrations
      const regRes = await fetch(getApiUrl('/api/registrations'));
      const regJson = await regRes.json();
      if (regJson.success && Array.isArray(regJson.data)) {
        setRegistrationsList(regJson.data);
      }

      // 3. Fetch Coordinators
      const coordRes = await fetch(getApiUrl('/api/coordinators'));
      const coordJson = await coordRes.json();
      if (coordJson.success && Array.isArray(coordJson.data)) {
        setCoordinatorsList(coordJson.data);
      }

      // 4. Fetch Winners
      const winData = await fetchEventWinners();
      if (Array.isArray(winData)) {
        setWinnersList(winData);
      }
    } catch (err) {
      console.warn('Error fetching coordinator dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── 4. Filtered Participants for ONLY the Allocated Event ──
  const eventParticipants = useMemo(() => {
    return registrationsList.filter(r => {
      const eId = (r.eventId || r.event_id || '').toLowerCase().trim();
      const target = selectedEventId.toLowerCase().trim();
      return eId === target || eId === target.replace('-', '') || (r.eventName && r.eventName.toLowerCase() === currentEvent.name?.toLowerCase());
    });
  }, [registrationsList, selectedEventId, currentEvent]);

  // ── 5. Participant Search & Filter State ──
  const [partSearch, setPartSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // all | present | absent

  const filteredEventParticipants = useMemo(() => {
    return eventParticipants.filter(p => {
      const q = partSearch.toLowerCase();
      const matchQuery = !q || 
        (p.fullName || p.name || '').toLowerCase().includes(q) ||
        (p.registrationId || p.id || '').toLowerCase().includes(q) ||
        (p.college || '').toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.teamName || '').toLowerCase().includes(q);

      const isPresent = p.verified || p.attended || p.checkedIn;
      const matchAttendance = 
        attendanceFilter === 'all' ? true :
        attendanceFilter === 'present' ? isPresent :
        !isPresent;

      return matchQuery && matchAttendance;
    });
  }, [eventParticipants, partSearch, attendanceFilter]);

  // Verified / Attended stats
  const verifiedCount = useMemo(() => {
    return eventParticipants.filter(p => p.verified || p.attended || p.checkedIn).length;
  }, [eventParticipants]);

  // Current Event Coordinators / Conductors
  const currentEventCoordinators = useMemo(() => {
    return coordinatorsList.filter(c => 
      c.assignedEvents?.includes(selectedEventId) || 
      c.assignedEvents?.includes(selectedEventId.replace('-', ''))
    );
  }, [coordinatorsList, selectedEventId]);

  // Current Event Winner Submission
  const currentWinnerSubmission = useMemo(() => {
    return winnersList.find(w => w.eventId === selectedEventId) || null;
  }, [winnersList, selectedEventId]);

  // ── 6. Attendance Toggle Handler ──
  const handleToggleAttendance = async (participant) => {
    const regId = participant.registrationId || participant.id;
    const nextStatus = !(participant.verified || participant.attended || participant.checkedIn);
    
    // Optimistic UI update
    setRegistrationsList(prev => prev.map(item => {
      const id = item.registrationId || item.id;
      if (id === regId) {
        return { ...item, verified: nextStatus, attended: nextStatus, checkedIn: nextStatus };
      }
      return item;
    }));

    toast.success(`${participant.fullName || 'Participant'} marked ${nextStatus ? 'PRESENT' : 'ABSENT'}`);

    try {
      await fetch(getApiUrl(`/api/admin/registrations/${regId}/verify`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ verified: nextStatus, attended: nextStatus })
      });
    } catch (err) {
      console.warn('Could not persist verification to server:', err);
    }
  };

  // ── 7. CSV Export for Allocated Event ──
  const handleExportCSV = () => {
    if (eventParticipants.length === 0) {
      return toast.error('No participants found to export for this event');
    }

    const headers = ['Registration ID', 'Participant Name', 'Email', 'Phone', 'WhatsApp', 'College', 'Department', 'Year', 'Team Name', 'Team Members', 'Status', 'Attendance'];
    const rows = eventParticipants.map(p => [
      `"${p.registrationId || p.id || ''}"`,
      `"${p.fullName || p.name || ''}"`,
      `"${p.email || ''}"`,
      `"${p.phone || ''}"`,
      `"${p.whatsapp || p.phone || ''}"`,
      `"${p.college || ''}"`,
      `"${p.dept || p.department || ''}"`,
      `"${p.year || ''}"`,
      `"${p.teamName || ''}"`,
      `"${Array.isArray(p.teamMembers) ? p.teamMembers.map(m => typeof m === 'string' ? m : m.name).join('; ') : ''}"`,
      `"${p.paymentStatus || 'Confirmed'}"`,
      `"${(p.verified || p.attended || p.checkedIn) ? 'PRESENT' : 'ABSENT'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentEvent.name.replace(/\s+/g, '_')}_Participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${eventParticipants.length} participants to CSV`);
  };

  // ── 8. Edit Event Rounds & Conductor Modal States ──
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editVenue, setEditVenue] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRoundsText, setEditRoundsText] = useState('');
  const [editRulesText, setEditRulesText] = useState('');
  const [editConductorNotes, setEditConductorNotes] = useState('');
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const openEditEventModal = () => {
    setEditVenue(currentEvent.venue || 'Lab 3 / Main Seminar Hall');
    setEditTime(currentEvent.time || '10:00 AM - 1:00 PM');
    
    // Rounds
    if (Array.isArray(currentEvent.rounds) && currentEvent.rounds.length > 0) {
      setEditRoundsText(currentEvent.rounds.map(r => typeof r === 'string' ? r : `${r.title || r.name}: ${r.desc || ''}`).join('\n'));
    } else if (currentEventRuleData?.rounds) {
      setEditRoundsText(currentEventRuleData.rounds.map(r => `${r.title}: ${r.desc || ''}`).join('\n'));
    } else {
      setEditRoundsText('Round 1: Preliminary Round\nRound 2: Main Challenge\nRound 3: Final Evaluation');
    }

    // Rules
    if (Array.isArray(currentEvent.rules) && currentEvent.rules.length > 0) {
      setEditRulesText(currentEvent.rules.join('\n'));
    } else if (currentEventRuleData?.rules) {
      setEditRulesText(currentEventRuleData.rules.join('\n'));
    } else {
      setEditRulesText('1. College ID card is mandatory.\n2. Malpractice leads to immediate disqualification.\n3. Judges decision is final.');
    }

    setEditConductorNotes(currentEvent.conductorNotes || '');
    setIsEditEventModalOpen(true);
  };

  const handleSaveEventDetails = async (e) => {
    e.preventDefault();
    setIsSavingEvent(true);
    const toastId = toast.loading('Updating event details & rounds...');

    const roundsArray = editRoundsText.split('\n').map(s => s.trim()).filter(Boolean);
    const rulesArray = editRulesText.split('\n').map(s => s.trim()).filter(Boolean);

    try {
      const res = await updateEventCoordinatorDetails(selectedEventId, {
        venue: editVenue,
        time: editTime,
        rounds: roundsArray,
        rules: rulesArray,
        conductorNotes: editConductorNotes
      });

      if (res.success) {
        toast.success('Event details & rounds updated successfully!', { id: toastId });
        setEventsList(prev => prev.map(evt => {
          if (evt.id === selectedEventId) {
            return {
              ...evt,
              venue: editVenue,
              time: editTime,
              rounds: roundsArray,
              rules: rulesArray,
              conductorNotes: editConductorNotes
            };
          }
          return evt;
        }));
        setIsEditEventModalOpen(false);
      } else {
        toast.error(res.message || 'Failed to update event', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error saving event details', { id: toastId });
    } finally {
      setIsSavingEvent(false);
    }
  };

  // ── 9. Winner Selection & Submission State ──
  const [firstPlaceRegId, setFirstPlaceRegId] = useState('');
  const [firstPlaceScore, setFirstPlaceScore] = useState('');
  const [firstPlaceRemarks, setFirstPlaceRemarks] = useState('');

  const [secondPlaceRegId, setSecondPlaceRegId] = useState('');
  const [secondPlaceScore, setSecondPlaceScore] = useState('');
  const [secondPlaceRemarks, setSecondPlaceRemarks] = useState('');

  const [thirdPlaceRegId, setThirdPlaceRegId] = useState('');
  const [thirdPlaceScore, setThirdPlaceScore] = useState('');
  const [thirdPlaceRemarks, setThirdPlaceRemarks] = useState('');

  const [winnerNotes, setWinnerNotes] = useState('');
  const [isSubmittingWinners, setIsSubmittingWinners] = useState(false);

  // Sync existing winner record if present
  useEffect(() => {
    if (currentWinnerSubmission) {
      if (currentWinnerSubmission.firstPlace) {
        setFirstPlaceRegId(currentWinnerSubmission.firstPlace.registrationId || '');
        setFirstPlaceScore(currentWinnerSubmission.firstPlace.score || '');
        setFirstPlaceRemarks(currentWinnerSubmission.firstPlace.remarks || '');
      }
      if (currentWinnerSubmission.secondPlace) {
        setSecondPlaceRegId(currentWinnerSubmission.secondPlace.registrationId || '');
        setSecondPlaceScore(currentWinnerSubmission.secondPlace.score || '');
        setSecondPlaceRemarks(currentWinnerSubmission.secondPlace.remarks || '');
      }
      if (currentWinnerSubmission.thirdPlace) {
        setThirdPlaceRegId(currentWinnerSubmission.thirdPlace.registrationId || '');
        setThirdPlaceScore(currentWinnerSubmission.thirdPlace.score || '');
        setThirdPlaceRemarks(currentWinnerSubmission.thirdPlace.remarks || '');
      }
      setWinnerNotes(currentWinnerSubmission.notes || '');
    } else {
      setFirstPlaceRegId('');
      setFirstPlaceScore('');
      setFirstPlaceRemarks('');
      setSecondPlaceRegId('');
      setSecondPlaceScore('');
      setSecondPlaceRemarks('');
      setThirdPlaceRegId('');
      setThirdPlaceScore('');
      setThirdPlaceRemarks('');
      setWinnerNotes('');
    }
  }, [currentWinnerSubmission, selectedEventId]);

  const handleSubmitWinners = async (e) => {
    e.preventDefault();
    if (!firstPlaceRegId) {
      return toast.error('Please select the 1st Place (Winner) participant');
    }

    const p1 = eventParticipants.find(p => (p.registrationId || p.id) === firstPlaceRegId);
    const p2 = secondPlaceRegId ? eventParticipants.find(p => (p.registrationId || p.id) === secondPlaceRegId) : null;
    const p3 = thirdPlaceRegId ? eventParticipants.find(p => (p.registrationId || p.id) === thirdPlaceRegId) : null;

    if (!p1) {
      return toast.error('Selected 1st place participant not found in roster');
    }

    const formatWinnerObj = (p, score, remarks) => {
      if (!p) return null;
      return {
        registrationId: p.registrationId || p.id,
        name: p.fullName || p.name,
        college: p.college || 'CAHCET',
        dept: p.dept || p.department || '',
        year: p.year || '',
        phone: p.phone || '',
        email: p.email || '',
        teamName: p.teamName || '',
        teamMembers: p.teamMembers || [],
        score: score || '',
        remarks: remarks || ''
      };
    };

    const payload = {
      eventId: selectedEventId,
      eventName: currentEvent.name,
      eventCategory: currentEvent.category || 'technical',
      submittedBy: user?.username || 'Lead Coordinator',
      firstPlace: formatWinnerObj(p1, firstPlaceScore, firstPlaceRemarks),
      secondPlace: formatWinnerObj(p2, secondPlaceScore, secondPlaceRemarks),
      thirdPlace: formatWinnerObj(p3, thirdPlaceScore, thirdPlaceRemarks),
      notes: winnerNotes
    };

    setIsSubmittingWinners(true);
    const toastId = toast.loading(`Submitting Winner List for ${currentEvent.name} to Certificate Team...`);

    try {
      const res = await submitEventWinners(payload);
      if (res.success) {
        toast.success(res.message || 'Winner list submitted successfully!', { id: toastId, duration: 6000 });
        setWinnersList(prev => {
          const filtered = prev.filter(w => w.eventId !== selectedEventId);
          return [...filtered, res.data];
        });
      } else {
        toast.error(res.message || 'Failed to submit winners', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error submitting winners', { id: toastId });
    } finally {
      setIsSubmittingWinners(false);
    }
  };

  // ── Styles (Cyberpunk Dark / Sleek Light) ──
  const S = useMemo(() => getCoordinatorStyles(isDark), [isDark]);

  return (
    <div style={S.container}>
      {/* ── Top Header Navigation Bar ── */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <button 
            type="button" 
            style={S.mobileMenuBtn} 
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            <FaBars size={18} />
          </button>
          
          <div style={S.brandLogoGroup}>
            <div style={S.brandIconBadge}>
              <FaShieldAlt style={{ color: '#39FF88', fontSize: '1.1rem' }} />
            </div>
            <div>
              <div style={S.brandTitle}>EVENT COORDINATOR PORTAL</div>
              <div style={S.brandSub}>ELOQUENCE 2026 • CAHCET</div>
            </div>
          </div>
        </div>

        {/* Header Right: Event Selector Pills & Actions */}
        <div style={S.headerRight}>
          {/* Assigned Event Selector */}
          <div style={S.eventSelectorWrap}>
            <span style={S.eventSelectorLabel}>ALLOCATED EVENT:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={S.eventSelectDropdown}
            >
              {eventsList.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({evt.category === 'technical' ? 'TECH' : 'NON-TECH'})
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme} 
            style={S.themeBtn}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <FaSun size={15} style={{ color: '#fbbf24' }} /> : <FaMoon size={15} style={{ color: '#6366f1' }} />}
          </button>

          {/* User Badge */}
          <div style={S.userBadge}>
            <FaUserTie size={12} style={{ color: '#39FF88' }} />
            <span>{user?.username || 'Coordinator'}</span>
          </div>

          {/* Logout */}
          <button onClick={onLogout} style={S.logoutBtn} title="Sign Out">
            <FaSignOutAlt size={14} />
            <span className="coord-logout-text">Logout</span>
          </button>
        </div>
      </header>

      {/* ── Main Layout Body ── */}
      <div style={S.layoutBody}>
        {/* ── Dedicated Sidebar for Event Coordinator ── */}
        <aside style={{ ...S.sidebar, ...(mobileSidebarOpen ? S.sidebarMobileOpen : {}) }}>
          <div style={S.sidebarHeader}>
            <div style={S.sidebarEventBadge}>
              <span style={S.sidebarEventDot} />
              <span style={S.sidebarEventName}>{currentEvent.name}</span>
            </div>
          </div>

          <nav style={S.navMenu}>
            {/* 1. Dashboard */}
            <button
              type="button"
              style={activeTab === 'dashboard' ? { ...S.navItem, ...S.navItemActive } : S.navItem}
              onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}
            >
              <FaChartBar style={S.navIcon} />
              <span>Dashboard</span>
            </button>

            {/* 2. Event Allocated & Rounds */}
            <button
              type="button"
              style={activeTab === 'allocated-event' ? { ...S.navItem, ...S.navItemActive } : S.navItem}
              onClick={() => { setActiveTab('allocated-event'); setMobileSidebarOpen(false); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaCalendarCheck style={S.navIcon} />
                  <span>Event Allocated</span>
                </div>
                <span style={S.badgePill}>{selectedEventId.toUpperCase()}</span>
              </div>
            </button>

            {/* 3. Event Participant List */}
            <button
              type="button"
              style={activeTab === 'event-participants' ? { ...S.navItem, ...S.navItemActive } : S.navItem}
              onClick={() => { setActiveTab('event-participants'); setMobileSidebarOpen(false); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaUsers style={S.navIcon} />
                  <span>Participant List</span>
                </div>
                <span style={S.badgeCount}>{eventParticipants.length}</span>
              </div>
            </button>

            {/* 4. Search & Verify (QR) */}
            <button
              type="button"
              style={activeTab === 'search-verify' ? { ...S.navItem, ...S.navItemActive } : S.navItem}
              onClick={() => { setActiveTab('search-verify'); setMobileSidebarOpen(false); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaQrcode style={S.navIcon} />
                  <span>Search & Verify</span>
                </div>
                <span style={{ ...S.badgeCount, background: isDark ? '#064e3b' : '#ecfdf5', color: isDark ? '#6ee7b7' : '#047857' }}>
                  QR
                </span>
              </div>
            </button>

            {/* 5. Winner Selection & Certificates */}
            <button
              type="button"
              style={activeTab === 'winners-certificates' ? { ...S.navItem, ...S.navItemActive } : S.navItem}
              onClick={() => { setActiveTab('winners-certificates'); setMobileSidebarOpen(false); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaTrophy style={{ ...S.navIcon, color: '#f59e0b' }} />
                  <span>Winner Selection</span>
                </div>
                {currentWinnerSubmission && (
                  <span style={{ ...S.badgeCount, background: '#10b981', color: '#ffffff', fontSize: '0.62rem' }}>
                    SUBMITTED
                  </span>
                )}
              </div>
            </button>
          </nav>

          <div style={S.sidebarFooter}>
            <div style={S.allocatedInfoBox}>
              <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>Allocated Category:</div>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: currentEvent.category === 'technical' ? '#38bdf8' : '#ec4899', textTransform: 'uppercase' }}>
                {currentEvent.category} • {currentEvent.isTeam ? 'Team Event' : 'Solo Event'}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content View Area ── */}
        <main style={S.mainContent}>
          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD VIEW                                   */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && (
            <div style={S.tabView}>
              <div style={S.viewHeroBanner}>
                <div style={S.heroBannerContent}>
                  <div style={S.heroBadge}>
                    <FaAward /> {currentEvent.category === 'technical' ? 'TECHNICAL TRACK' : 'NON-TECHNICAL TRACK'}
                  </div>
                  <h1 style={S.heroTitle}>{currentEvent.name}</h1>
                  <p style={S.heroDesc}>
                    {currentEvent.description || 'Welcome to your event coordinator control center. Monitor attendance, communicate with participants directly, and finalize winners.'}
                  </p>
                  
                  <div style={S.heroMetaRow}>
                    <span style={S.metaChip}><FaClock style={{ color: '#39FF88' }} /> {currentEvent.time || '10:00 AM - 1:00 PM'}</span>
                    <span style={S.metaChip}><FaMapMarkerAlt style={{ color: '#39FF88' }} /> {currentEvent.venue || 'Lab 3 / Main Seminar Hall'}</span>
                    <span style={S.metaChip}><FaUsers style={{ color: '#39FF88' }} /> {currentEvent.isTeam ? 'Team Event (2-4 Members)' : 'Solo Event'}</span>
                  </div>
                </div>

                <div style={S.heroActions}>
                  <button 
                    onClick={() => setActiveTab('search-verify')}
                    style={S.btnPrimaryHero}
                  >
                    <FaQrcode /> Fast Verify QR
                  </button>
                  <button 
                    onClick={() => setActiveTab('event-participants')}
                    style={S.btnSecondaryHero}
                  >
                    <FaUsers /> View Participants ({eventParticipants.length})
                  </button>
                </div>
              </div>

              {/* Stat Metric Cards */}
              <div style={S.metricGrid}>
                {/* Total Participants for this event */}
                <div style={S.metricCard}>
                  <div style={S.metricIconWrap}>
                    <FaUsers style={{ color: '#38bdf8' }} />
                  </div>
                  <div>
                    <div style={S.metricLabel}>Total Registrations</div>
                    <div style={S.metricVal}>{eventParticipants.length}</div>
                    <div style={S.metricSub}>Registered for {currentEvent.name}</div>
                  </div>
                </div>

                {/* Verified / Present */}
                <div style={S.metricCard}>
                  <div style={{ ...S.metricIconWrap, background: 'rgba(57, 255, 136, 0.12)' }}>
                    <FaCheckCircle style={{ color: '#39FF88' }} />
                  </div>
                  <div>
                    <div style={S.metricLabel}>Verified / Present</div>
                    <div style={{ ...S.metricVal, color: '#39FF88' }}>{verifiedCount}</div>
                    <div style={S.metricSub}>
                      {eventParticipants.length > 0 
                        ? `${Math.round((verifiedCount / eventParticipants.length) * 100)}% attendance rate`
                        : '0% attendance'}
                    </div>
                  </div>
                </div>

                {/* Pending Check-in */}
                <div style={S.metricCard}>
                  <div style={{ ...S.metricIconWrap, background: 'rgba(245, 158, 11, 0.12)' }}>
                    <FaClock style={{ color: '#f59e0b' }} />
                  </div>
                  <div>
                    <div style={S.metricLabel}>Pending Check-in</div>
                    <div style={{ ...S.metricVal, color: '#f59e0b' }}>
                      {Math.max(0, eventParticipants.length - verifiedCount)}
                    </div>
                    <div style={S.metricSub}>Awaiting arrival at venue</div>
                  </div>
                </div>

                {/* Winner Status */}
                <div style={S.metricCard}>
                  <div style={{ ...S.metricIconWrap, background: 'rgba(234, 179, 8, 0.12)' }}>
                    <FaTrophy style={{ color: '#eab308' }} />
                  </div>
                  <div>
                    <div style={S.metricLabel}>Winner Selection</div>
                    <div style={{ ...S.metricVal, fontSize: '1.25rem', color: currentWinnerSubmission ? '#10b981' : '#eab308' }}>
                      {currentWinnerSubmission ? 'SUBMITTED' : 'PENDING'}
                    </div>
                    <div style={S.metricSub}>
                      {currentWinnerSubmission 
                        ? 'Transmitted to Certificate Team' 
                        : 'Select winners after final round'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Conductor Overview */}
              <div style={S.twoColGrid}>
                {/* Event Conductors Box */}
                <div style={S.cardBox}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}>
                      <FaUserTie style={{ color: '#39FF88' }} /> Event Conductors & Coordinators
                    </div>
                    <button onClick={openEditEventModal} style={S.btnSmallOutline}>
                      <FaEdit /> Edit Details
                    </button>
                  </div>

                  <div style={S.cardBody}>
                    {currentEventCoordinators.length > 0 ? (
                      <div style={S.conductorList}>
                        {currentEventCoordinators.map(c => (
                          <div key={c.id} style={S.conductorItem}>
                            <div style={S.conductorAvatar}>
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={S.conductorName}>{c.name}</div>
                              <div style={S.conductorRole}>{c.role || 'Lead Coordinator'} • {c.department || 'CSE'}</div>
                              <div style={S.conductorContactRow}>
                                {c.phone && (
                                  <a href={`tel:${c.phone}`} style={S.contactChip} title="Call Conductor">
                                    <FaPhoneAlt size={10} /> {c.phone}
                                  </a>
                                )}
                                {c.whatsapp && (
                                  <a href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ ...S.contactChip, color: '#10b981' }} title="WhatsApp">
                                    <FaWhatsapp size={11} /> WhatsApp
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={S.emptyBox}>
                        <p>No specific conductor records mapped. You are the assigned lead coordinator for {currentEvent.name}.</p>
                        <button onClick={openEditEventModal} style={S.btnPrimarySmall}>
                          <FaEdit /> Add Conductor Notes & Timing
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Rounds Preview Box */}
                <div style={S.cardBox}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}>
                      <FaLayerGroup style={{ color: '#38bdf8' }} /> Rounds & Evaluation Breakdown
                    </div>
                    <button onClick={openEditEventModal} style={S.btnSmallOutline}>
                      <FaEdit /> Update Rounds
                    </button>
                  </div>

                  <div style={S.cardBody}>
                    <div style={S.roundStepsList}>
                      {(Array.isArray(currentEvent.rounds) && currentEvent.rounds.length > 0
                        ? currentEvent.rounds
                        : currentEventRuleData?.rounds || ['Round 1: Preliminary screening', 'Round 2: Technical Challenge', 'Round 3: Grand Finale & Scoring']
                      ).map((rnd, idx) => (
                        <div key={idx} style={S.roundStepCard}>
                          <div style={S.roundStepBadge}>0{idx + 1}</div>
                          <div style={S.roundStepContent}>
                            <div style={S.roundStepTitle}>
                              {typeof rnd === 'string' ? rnd : rnd.title || `Round ${idx + 1}`}
                            </div>
                            {typeof rnd === 'object' && rnd.desc && (
                              <div style={S.roundStepDesc}>{rnd.desc}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: ALLOCATED EVENT & ROUNDS DETAILS                  */}
          {/* ======================================================== */}
          {activeTab === 'allocated-event' && (
            <div style={S.tabView}>
              <div style={S.sectionHeadingRow}>
                <div>
                  <h2 style={S.sectionHeadingTitle}>Allocated Event Management</h2>
                  <p style={S.sectionHeadingSub}>
                    View and update coordinator details, round breakdown, rules, and venue schedule for <strong>{currentEvent.name}</strong>.
                  </p>
                </div>
                <button onClick={openEditEventModal} style={S.btnPrimary}>
                  <FaEdit /> Edit Event Details & Rounds
                </button>
              </div>

              <div style={S.detailsGrid}>
                {/* Event Summary Box */}
                <div style={S.cardBox}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}><FaInfoCircle style={{ color: '#39FF88' }} /> Event Overview</div>
                    <span style={S.badgePill}>{currentEvent.id}</span>
                  </div>
                  <div style={S.cardBody}>
                    <div style={S.infoRow}>
                      <span style={S.infoLabel}>Event Title:</span>
                      <span style={S.infoValue}>{currentEvent.name}</span>
                    </div>
                    <div style={S.infoRow}>
                      <span style={S.infoLabel}>Category:</span>
                      <span style={S.infoValue}>{currentEvent.category?.toUpperCase()}</span>
                    </div>
                    <div style={S.infoRow}>
                      <span style={S.infoLabel}>Participation Type:</span>
                      <span style={S.infoValue}>{currentEvent.isTeam ? 'Team Event (2-4 Members)' : 'Solo Individual'}</span>
                    </div>
                    <div style={S.infoRow}>
                      <span style={S.infoLabel}>Registration Fee:</span>
                      <span style={S.infoValue}>₹{currentEvent.fee || 250}</span>
                    </div>
                    <div style={S.infoRow}>
                      <span style={S.infoLabel}>Allocated Venue:</span>
                      <span style={S.infoValue}>{currentEvent.venue || 'Lab 3 / Main Seminar Hall'}</span>
                    </div>
                    <div style={S.infoRow}>
                      <span style={S.infoLabel}>Time Schedule:</span>
                      <span style={S.infoValue}>{currentEvent.time || '10:00 AM - 1:00 PM'}</span>
                    </div>
                    {currentEvent.conductorNotes && (
                      <div style={S.infoRow}>
                        <span style={S.infoLabel}>Conductor Notes:</span>
                        <span style={S.infoValue}>{currentEvent.conductorNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conductors List */}
                <div style={S.cardBox}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}><FaUserTie style={{ color: '#38bdf8' }} /> Assigned Coordinators</div>
                  </div>
                  <div style={S.cardBody}>
                    {currentEventCoordinators.length > 0 ? (
                      currentEventCoordinators.map(c => (
                        <div key={c.id} style={{ ...S.conductorItem, marginBottom: '0.85rem' }}>
                          <div style={S.conductorAvatar}>{c.name.slice(0, 2).toUpperCase()}</div>
                          <div style={{ flex: 1 }}>
                            <div style={S.conductorName}>{c.name}</div>
                            <div style={S.conductorRole}>{c.role} • {c.department} ({c.year || '3rd Year'})</div>
                            <div style={S.conductorContactRow}>
                              {c.phone && (
                                <a href={`tel:${c.phone}`} style={S.contactChip}>
                                  <FaPhoneAlt size={10} /> Call ({c.phone})
                                </a>
                              )}
                              {c.email && (
                                <a href={`mailto:${c.email}`} style={S.contactChip}>
                                  <FaEnvelope size={10} /> {c.email}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.88rem' }}>
                        You are managing this event as the lead coordinator.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Rounds & Rules */}
              <div style={{ ...S.cardBox, marginTop: '1.5rem' }}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}><FaLayerGroup style={{ color: '#39FF88' }} /> Event Guidelines & Round Structure</div>
                  <button onClick={openEditEventModal} style={S.btnSmallOutline}>
                    <FaEdit /> Modify Guidelines
                  </button>
                </div>
                <div style={S.cardBody}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: '#39FF88', marginBottom: '0.65rem' }}>Round Breakdown:</h4>
                    <div style={S.roundStepsList}>
                      {(Array.isArray(currentEvent.rounds) && currentEvent.rounds.length > 0
                        ? currentEvent.rounds
                        : currentEventRuleData?.rounds || ['Round 1: Preliminary Round', 'Round 2: Final Evaluation']
                      ).map((rnd, idx) => (
                        <div key={idx} style={S.roundStepCard}>
                          <div style={S.roundStepBadge}>0{idx + 1}</div>
                          <div style={S.roundStepContent}>
                            <div style={S.roundStepTitle}>
                              {typeof rnd === 'string' ? rnd : rnd.title || `Round ${idx + 1}`}
                            </div>
                            {typeof rnd === 'object' && rnd.desc && (
                              <div style={S.roundStepDesc}>{rnd.desc}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: '#38bdf8', marginBottom: '0.65rem' }}>Rules & Judging Criteria:</h4>
                    <ul style={S.rulesList}>
                      {(Array.isArray(currentEvent.rules) && currentEvent.rules.length > 0
                        ? currentEvent.rules
                        : currentEventRuleData?.rules || ['Participants must carry college ID card.', 'All submissions must be original.']
                      ).map((rule, idx) => (
                        <li key={idx} style={S.ruleItem}>
                          <FaCheck size={11} style={{ color: '#39FF88', marginTop: '3px' }} />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: EVENT PARTICIPANT LIST (ALLOCATED EVENT ONLY)     */}
          {/* ======================================================== */}
          {activeTab === 'event-participants' && (
            <div style={S.tabView}>
              <div style={S.sectionHeadingRow}>
                <div>
                  <h2 style={S.sectionHeadingTitle}>
                    Participant List — {currentEvent.name}
                  </h2>
                  <p style={S.sectionHeadingSub}>
                    Showing <strong>{filteredEventParticipants.length}</strong> of <strong>{eventParticipants.length}</strong> participants registered strictly for your allocated event.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={handleExportCSV} style={S.btnSecondary}>
                    <FaFileCsv /> Export CSV
                  </button>
                  <button onClick={() => setActiveTab('search-verify')} style={S.btnPrimary}>
                    <FaQrcode /> Scan QR & Verify
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div style={S.filterBar}>
                <div style={S.searchWrap}>
                  <FaSearch style={S.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search by participant name, registration ID, phone, college..."
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                    style={S.searchInput}
                  />
                  {partSearch && (
                    <button onClick={() => setPartSearch('')} style={S.clearSearchBtn}>
                      <FaTimes size={12} />
                    </button>
                  )}
                </div>

                <div style={S.filterGroup}>
                  <span style={S.filterLabel}><FaFilter size={11} /> Attendance:</span>
                  <select 
                    value={attendanceFilter} 
                    onChange={(e) => setAttendanceFilter(e.target.value)}
                    style={S.filterSelect}
                  >
                    <option value="all">All Participants ({eventParticipants.length})</option>
                    <option value="present">Present / Verified ({verifiedCount})</option>
                    <option value="absent">Pending / Absent ({Math.max(0, eventParticipants.length - verifiedCount)})</option>
                  </select>
                </div>
              </div>

              {/* Participant Cards / Table */}
              {filteredEventParticipants.length > 0 ? (
                <div style={S.participantGrid}>
                  {filteredEventParticipants.map(p => {
                    const isPresent = Boolean(p.verified || p.attended || p.checkedIn);
                    const cleanPhone = (p.phone || '').replace(/[^0-9+]/g, '');
                    const cleanWhatsapp = (p.whatsapp || p.phone || '').replace(/[^0-9]/g, '');

                    return (
                      <div key={p.registrationId || p.id} style={{ ...S.participantCard, borderLeft: isPresent ? '4px solid #39FF88' : '4px solid #64748b' }}>
                        {/* Header: Name + ID + Attendance Badge */}
                        <div style={S.partCardHeader}>
                          <div>
                            <div style={S.partName}>{p.fullName || p.name}</div>
                            <div style={S.partIdBadge}>{p.registrationId || p.id}</div>
                          </div>

                          {/* Attendance Status Button */}
                          <button
                            onClick={() => handleToggleAttendance(p)}
                            style={{
                              ...S.attendanceToggleBtn,
                              background: isPresent ? 'rgba(57, 255, 136, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                              color: isPresent ? '#39FF88' : '#94a3b8',
                              borderColor: isPresent ? '#39FF88' : 'rgba(255, 255, 255, 0.15)'
                            }}
                            title="Click to toggle attendance status"
                          >
                            {isPresent ? <FaCheck size={11} /> : <FaTimes size={11} />}
                            <span>{isPresent ? 'PRESENT' : 'MARK PRESENT'}</span>
                          </button>
                        </div>

                        {/* College & Department */}
                        <div style={S.partDetailsBox}>
                          <div style={S.partDetailRow}>
                            <span style={S.detailKey}>College:</span>
                            <span style={S.detailVal}>{p.college || 'CAHCET'}</span>
                          </div>
                          {(p.dept || p.department) && (
                            <div style={S.partDetailRow}>
                              <span style={S.detailKey}>Dept & Year:</span>
                              <span style={S.detailVal}>{p.dept || p.department} • {p.year || '3rd Year'}</span>
                            </div>
                          )}
                          {p.teamName && (
                            <div style={S.partDetailRow}>
                              <span style={S.detailKey}>Team Name:</span>
                              <span style={{ ...S.detailVal, color: '#38bdf8', fontWeight: '700' }}>{p.teamName}</span>
                            </div>
                          )}
                          {Array.isArray(p.teamMembers) && p.teamMembers.length > 0 && (
                            <div style={S.partDetailRow}>
                              <span style={S.detailKey}>Members:</span>
                              <span style={S.detailVal}>
                                {p.teamMembers.map(m => typeof m === 'string' ? m : m.name).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Direct Call & Action Buttons */}
                        <div style={S.partActionRow}>
                          {cleanPhone ? (
                            <a
                              href={`tel:${cleanPhone}`}
                              style={S.btnDirectCall}
                              title={`Call ${p.fullName || 'Participant'} directly`}
                            >
                              <FaPhoneAlt size={12} />
                              <span>CALL NOW ({cleanPhone})</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No phone provided</span>
                          )}

                          {cleanWhatsapp && (
                            <a
                              href={`https://wa.me/${cleanWhatsapp}`}
                              target="_blank"
                              rel="noreferrer"
                              style={S.btnDirectWhatsapp}
                              title="Message on WhatsApp"
                            >
                              <FaWhatsapp size={14} />
                            </a>
                          )}

                          {p.email && (
                            <a
                              href={`mailto:${p.email}`}
                              style={S.btnDirectEmail}
                              title={`Send Email to ${p.email}`}
                            >
                              <FaEnvelope size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={S.emptyBox}>
                  <FaUsers size={36} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
                  <h3>No Participants Found</h3>
                  <p>
                    {partSearch 
                      ? `No registered participants match "${partSearch}" for ${currentEvent.name}.`
                      : `No participants have registered for ${currentEvent.name} yet.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SEARCH & VERIFY (RESTRICTED TO ALLOCATED EVENT)   */}
          {/* ======================================================== */}
          {activeTab === 'search-verify' && (
            <div style={S.tabView}>
              <div style={S.sectionHeadingRow}>
                <div>
                  <h2 style={S.sectionHeadingTitle}>
                    Search & QR Ticket Verification
                  </h2>
                  <p style={S.sectionHeadingSub}>
                    Scan ticket QR codes or search registration IDs. Verification is scoped to <strong>{currentEvent.name}</strong>.
                  </p>
                </div>
              </div>

              {/* QR / Search Verifier Component */}
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <ParticipantVerifier
                  token={token}
                  user={user}
                  isDark={isDark}
                  registrations={registrationsList}
                  events={eventsList}
                  allocatedEventId={selectedEventId}
                  allocatedEventName={currentEvent.name}
                  onRefreshRegistrations={fetchData}
                  onVerificationSuccess={(verifiedItem) => {
                    toast.success(`Verified participant: ${verifiedItem.fullName || verifiedItem.name}`);
                    fetchData();
                  }}
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: WINNER SELECTION & CERTIFICATE SUBMISSION        */}
          {/* ======================================================== */}
          {activeTab === 'winners-certificates' && (
            <div style={S.tabView}>
              <div style={S.sectionHeadingRow}>
                <div>
                  <h2 style={S.sectionHeadingTitle}>
                    Winner Selection & Certificate Pipeline
                  </h2>
                  <p style={S.sectionHeadingSub}>
                    Select 1st, 2nd, and 3rd place winners from your verified participants. Submitting locks the record and sends it directly to the <strong>Certificate Team</strong> to generate official certificates.
                  </p>
                </div>

                {currentWinnerSubmission && (
                  <div style={S.submissionStatusBadge}>
                    <FaCheckCircle style={{ color: '#10b981' }} />
                    <span>WINNER LIST SUBMITTED</span>
                  </div>
                )}
              </div>

              {/* Form to Select Winners */}
              <div style={S.cardBox}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>
                    <FaTrophy style={{ color: '#f59e0b' }} /> Select Event Winners — {currentEvent.name}
                  </div>
                  <span style={S.badgePill}>{eventParticipants.length} Participants Available</span>
                </div>

                <div style={S.cardBody}>
                  <form onSubmit={handleSubmitWinners}>
                    {/* 1st Place / Winner */}
                    <div style={S.winnerFormSection}>
                      <div style={S.winnerRankHeader}>
                        <FaTrophy style={{ color: '#eab308', fontSize: '1.2rem' }} />
                        <span style={{ color: '#eab308', fontWeight: '800', fontSize: '1rem' }}>1ST PLACE (WINNER) *</span>
                      </div>

                      <div style={S.formGrid}>
                        <div style={S.formFieldFull}>
                          <label style={S.formLabel}>Select 1st Place Winner *</label>
                          <select
                            value={firstPlaceRegId}
                            onChange={(e) => setFirstPlaceRegId(e.target.value)}
                            style={S.formInput}
                            required
                          >
                            <option value="">-- Choose Winner from Verified Participants --</option>
                            {eventParticipants.map(p => (
                              <option key={p.registrationId || p.id} value={p.registrationId || p.id}>
                                {p.fullName || p.name} ({p.registrationId || p.id}) • {p.college || 'CAHCET'} {p.teamName ? `[Team: ${p.teamName}]` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={S.formField}>
                          <label style={S.formLabel}>Final Score / Points (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. 96/100 or 1st Place"
                            value={firstPlaceScore}
                            onChange={(e) => setFirstPlaceScore(e.target.value)}
                            style={S.formInput}
                          />
                        </div>

                        <div style={S.formField}>
                          <label style={S.formLabel}>Project Title / Remarks (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. AI Sentinel Project"
                            value={firstPlaceRemarks}
                            onChange={(e) => setFirstPlaceRemarks(e.target.value)}
                            style={S.formInput}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2nd Place / 1st Runner Up */}
                    <div style={{ ...S.winnerFormSection, borderLeftColor: '#94a3b8' }}>
                      <div style={S.winnerRankHeader}>
                        <FaMedal style={{ color: '#94a3b8', fontSize: '1.2rem' }} />
                        <span style={{ color: '#94a3b8', fontWeight: '800', fontSize: '1rem' }}>2ND PLACE (RUNNER UP)</span>
                      </div>

                      <div style={S.formGrid}>
                        <div style={S.formFieldFull}>
                          <label style={S.formLabel}>Select 2nd Place Runner Up</label>
                          <select
                            value={secondPlaceRegId}
                            onChange={(e) => setSecondPlaceRegId(e.target.value)}
                            style={S.formInput}
                          >
                            <option value="">-- None / Select Participant --</option>
                            {eventParticipants.map(p => (
                              <option key={p.registrationId || p.id} value={p.registrationId || p.id}>
                                {p.fullName || p.name} ({p.registrationId || p.id}) • {p.college || 'CAHCET'} {p.teamName ? `[Team: ${p.teamName}]` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={S.formField}>
                          <label style={S.formLabel}>Score / Points (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. 88/100"
                            value={secondPlaceScore}
                            onChange={(e) => setSecondPlaceScore(e.target.value)}
                            style={S.formInput}
                          />
                        </div>

                        <div style={S.formField}>
                          <label style={S.formLabel}>Remarks (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Clean architecture"
                            value={secondPlaceRemarks}
                            onChange={(e) => setSecondPlaceRemarks(e.target.value)}
                            style={S.formInput}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3rd Place / 2nd Runner Up */}
                    <div style={{ ...S.winnerFormSection, borderLeftColor: '#b45309' }}>
                      <div style={S.winnerRankHeader}>
                        <FaAward style={{ color: '#b45309', fontSize: '1.2rem' }} />
                        <span style={{ color: '#b45309', fontWeight: '800', fontSize: '1rem' }}>3RD PLACE (2ND RUNNER UP)</span>
                      </div>

                      <div style={S.formGrid}>
                        <div style={S.formFieldFull}>
                          <label style={S.formLabel}>Select 3rd Place Winner</label>
                          <select
                            value={thirdPlaceRegId}
                            onChange={(e) => setThirdPlaceRegId(e.target.value)}
                            style={S.formInput}
                          >
                            <option value="">-- None / Select Participant --</option>
                            {eventParticipants.map(p => (
                              <option key={p.registrationId || p.id} value={p.registrationId || p.id}>
                                {p.fullName || p.name} ({p.registrationId || p.id}) • {p.college || 'CAHCET'} {p.teamName ? `[Team: ${p.teamName}]` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={S.formField}>
                          <label style={S.formLabel}>Score / Points (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. 82/100"
                            value={thirdPlaceScore}
                            onChange={(e) => setThirdPlaceScore(e.target.value)}
                            style={S.formInput}
                          />
                        </div>

                        <div style={S.formField}>
                          <label style={S.formLabel}>Remarks (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Excellent presentation"
                            value={thirdPlaceRemarks}
                            onChange={(e) => setThirdPlaceRemarks(e.target.value)}
                            style={S.formInput}
                          />
                        </div>
                      </div>
                    </div>

                    {/* General Coordinator Notes for Certificate Team */}
                    <div style={{ marginTop: '1rem' }}>
                      <label style={S.formLabel}>Notes for Certificate Generation Team (Optional)</label>
                      <textarea
                        rows={3}
                        placeholder="Any special remarks or instructions for printing/generating winner certificates..."
                        value={winnerNotes}
                        onChange={(e) => setWinnerNotes(e.target.value)}
                        style={S.formTextarea}
                      />
                    </div>

                    {/* Submit Button */}
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={isSubmittingWinners}
                        style={S.btnSubmitWinners}
                      >
                        <FaPaperPlane />
                        <span>{isSubmittingWinners ? 'Transmitting Winner List...' : 'Submit to Certificate Team'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* All Submitted Winners Overview */}
              <div style={{ ...S.cardBox, marginTop: '1.5rem' }}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>
                    <FaAward style={{ color: '#38bdf8' }} /> Verified Winner List Records
                  </div>
                  <span style={S.badgePill}>{winnersList.length} Events Completed</span>
                </div>

                <div style={S.cardBody}>
                  {winnersList.length > 0 ? (
                    <div style={S.winnerCardsGrid}>
                      {winnersList.map(w => (
                        <div key={w.id || w.eventId} style={S.winnerSummaryCard}>
                          <div style={S.winnerCardHead}>
                            <div>
                              <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#39FF88', margin: 0 }}>
                                {w.eventName}
                              </h4>
                              <span style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                                Submitted by: {w.submittedBy} • {new Date(w.submittedAt || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                            <span style={S.badgePill}>CERTIFICATE READY</span>
                          </div>

                          <div style={S.winnerPlacesList}>
                            {w.firstPlace && (
                              <div style={S.winnerPlaceItem}>
                                <span style={{ color: '#eab308', fontWeight: '800' }}>🥇 1st Place:</span>
                                <span style={{ fontWeight: '700' }}>{w.firstPlace.name}</span>
                                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>({w.firstPlace.college})</span>
                              </div>
                            )}
                            {w.secondPlace && (
                              <div style={S.winnerPlaceItem}>
                                <span style={{ color: '#94a3b8', fontWeight: '800' }}>🥈 2nd Place:</span>
                                <span style={{ fontWeight: '700' }}>{w.secondPlace.name}</span>
                                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>({w.secondPlace.college})</span>
                              </div>
                            )}
                            {w.thirdPlace && (
                              <div style={S.winnerPlaceItem}>
                                <span style={{ color: '#b45309', fontWeight: '800' }}>🥉 3rd Place:</span>
                                <span style={{ fontWeight: '700' }}>{w.thirdPlace.name}</span>
                                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>({w.thirdPlace.college})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.88rem' }}>
                      No winner lists have been submitted yet. Once you submit, certificates can be generated directly.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Edit Event Details & Rounds Modal ── */}
      {isEditEventModalOpen && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>
                <FaEdit style={{ color: '#39FF88' }} /> Edit Event Rounds & Details — {currentEvent.name}
              </h3>
              <button onClick={() => setIsEditEventModalOpen(false)} style={S.modalCloseBtn}>
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEventDetails} style={S.modalForm}>
              <div style={S.formGrid}>
                <div style={S.formField}>
                  <label style={S.formLabel}>Allocated Venue</label>
                  <input
                    type="text"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    placeholder="e.g. Lab 3 / Seminar Hall"
                    style={S.formInput}
                    required
                  />
                </div>

                <div style={S.formField}>
                  <label style={S.formLabel}>Time Schedule</label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="e.g. 10:00 AM - 1:00 PM"
                    style={S.formInput}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <label style={S.formLabel}>Event Rounds (One round per line)</label>
                <textarea
                  rows={4}
                  value={editRoundsText}
                  onChange={(e) => setEditRoundsText(e.target.value)}
                  placeholder="Round 1: Preliminary Quiz\nRound 2: Problem Solving\nRound 3: Final Presentation"
                  style={S.formTextarea}
                />
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <label style={S.formLabel}>Rules & Guidelines (One rule per line)</label>
                <textarea
                  rows={4}
                  value={editRulesText}
                  onChange={(e) => setEditRulesText(e.target.value)}
                  placeholder="1. College ID card is mandatory.\n2. Decision of judges will be final."
                  style={S.formTextarea}
                />
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <label style={S.formLabel}>Conductor / Coordinator Special Notes (Optional)</label>
                <input
                  type="text"
                  value={editConductorNotes}
                  onChange={(e) => setEditConductorNotes(e.target.value)}
                  placeholder="e.g. Bring your own laptops with Python installed"
                  style={S.formInput}
                />
              </div>

              <div style={S.modalActionRow}>
                <button
                  type="button"
                  onClick={() => setIsEditEventModalOpen(false)}
                  style={S.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  style={S.btnPrimary}
                >
                  {isSavingEvent ? 'Saving Changes...' : 'Save & Publish Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── High-Tech Cyberpunk & Sleek Responsive Styles ──
function getCoordinatorStyles(isDark) {
  const bg = isDark ? '#050a06' : '#f8fafc';
  const headerBg = isDark ? 'rgba(5, 12, 7, 0.92)' : 'rgba(255, 255, 255, 0.95)';
  const sidebarBg = isDark ? '#060d08' : '#ffffff';
  const cardBg = isDark ? 'rgba(8, 18, 10, 0.75)' : '#ffffff';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const border = isDark ? 'rgba(57, 255, 136, 0.16)' : 'rgba(0, 0, 0, 0.08)';
  const green = '#39FF88';

  return {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: bg,
      color: text,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1.5rem',
      background: headerBg,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${border}`,
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    mobileMenuBtn: {
      display: 'none',
      background: 'transparent',
      border: 'none',
      color: text,
      cursor: 'pointer',
      padding: '0.4rem'
    },
    brandLogoGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    brandIconBadge: {
      width: '34px',
      height: '34px',
      borderRadius: '8px',
      background: 'rgba(57, 255, 136, 0.12)',
      border: '1px solid rgba(57, 255, 136, 0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    brandTitle: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '0.95rem',
      fontWeight: '800',
      letterSpacing: '0.04em',
      color: isDark ? '#ffffff' : '#0f172a'
    },
    brandSub: {
      fontSize: '0.68rem',
      color: green,
      fontWeight: '700',
      letterSpacing: '0.08em'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem'
    },
    eventSelectorWrap: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.45rem',
      background: isDark ? 'rgba(0, 0, 0, 0.35)' : '#f1f5f9',
      padding: '0.25rem 0.65rem',
      borderRadius: '8px',
      border: `1px solid ${border}`
    },
    eventSelectorLabel: {
      fontSize: '0.66rem',
      fontWeight: '800',
      color: green,
      letterSpacing: '0.05em'
    },
    eventSelectDropdown: {
      background: 'transparent',
      border: 'none',
      color: isDark ? '#ffffff' : '#0f172a',
      fontSize: '0.82rem',
      fontWeight: '700',
      outline: 'none',
      cursor: 'pointer'
    },
    themeBtn: {
      background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
      border: `1px solid ${border}`,
      borderRadius: '8px',
      width: '34px',
      height: '34px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    },
    userBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.35rem 0.75rem',
      borderRadius: '20px',
      background: isDark ? 'rgba(57, 255, 136, 0.08)' : 'rgba(57, 255, 136, 0.15)',
      border: '1px solid rgba(57, 255, 136, 0.3)',
      fontSize: '0.78rem',
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#047857'
    },
    logoutBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.4rem 0.85rem',
      borderRadius: '8px',
      background: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#ef4444',
      fontSize: '0.78rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    layoutBody: {
      display: 'flex',
      flex: 1
    },
    sidebar: {
      width: '260px',
      flexShrink: 0,
      background: sidebarBg,
      borderRight: `1px solid ${border}`,
      display: 'flex',
      flexDirection: 'column',
      padding: '1.25rem 0.85rem'
    },
    sidebarMobileOpen: {
      display: 'flex'
    },
    sidebarHeader: {
      marginBottom: '1.25rem',
      paddingBottom: '0.75rem',
      borderBottom: `1px solid ${border}`
    },
    sidebarEventBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: isDark ? 'rgba(57, 255, 136, 0.08)' : 'rgba(57, 255, 136, 0.12)',
      padding: '0.5rem 0.75rem',
      borderRadius: '8px',
      border: '1px solid rgba(57, 255, 136, 0.25)'
    },
    sidebarEventDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: green,
      boxShadow: '0 0 8px #39FF88'
    },
    sidebarEventName: {
      fontSize: '0.82rem',
      fontWeight: '800',
      color: isDark ? '#ffffff' : '#0f172a',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    navMenu: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.45rem',
      flex: 1
    },
    navItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.65rem 0.85rem',
      borderRadius: '8px',
      background: 'transparent',
      border: '1px solid transparent',
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '0.84rem',
      fontWeight: '600',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.2s ease'
    },
    navItemActive: {
      background: isDark ? 'rgba(57, 255, 136, 0.12)' : 'rgba(57, 255, 136, 0.18)',
      color: isDark ? '#ffffff' : '#047857',
      borderColor: 'rgba(57, 255, 136, 0.35)',
      fontWeight: '700'
    },
    navIcon: {
      fontSize: '1rem',
      color: green
    },
    badgeCount: {
      padding: '0.15rem 0.5rem',
      borderRadius: '12px',
      background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
      color: text,
      fontSize: '0.7rem',
      fontWeight: '800'
    },
    badgePill: {
      padding: '0.15rem 0.55rem',
      borderRadius: '6px',
      background: 'rgba(57, 255, 136, 0.15)',
      color: green,
      fontSize: '0.66rem',
      fontWeight: '800',
      letterSpacing: '0.04em'
    },
    sidebarFooter: {
      marginTop: 'auto',
      paddingTop: '1rem',
      borderTop: `1px solid ${border}`
    },
    allocatedInfoBox: {
      background: isDark ? 'rgba(0, 0, 0, 0.3)' : '#f8fafc',
      padding: '0.6rem 0.75rem',
      borderRadius: '6px',
      border: `1px solid ${border}`
    },
    mainContent: {
      flex: 1,
      padding: '1.75rem',
      overflowY: 'auto'
    },
    tabView: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    viewHeroBanner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      padding: '2rem',
      borderRadius: '14px',
      background: isDark 
        ? 'linear-gradient(135deg, rgba(8, 24, 12, 0.9) 0%, rgba(3, 10, 5, 0.95) 100%)' 
        : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      border: `1px solid ${border}`,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      marginBottom: '1.75rem',
      position: 'relative',
      overflow: 'hidden'
    },
    heroBannerContent: {
      flex: 1
    },
    heroBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.25rem 0.65rem',
      borderRadius: '20px',
      background: 'rgba(57, 255, 136, 0.15)',
      color: green,
      fontSize: '0.72rem',
      fontWeight: '800',
      letterSpacing: '0.06em',
      marginBottom: '0.75rem'
    },
    heroTitle: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '1.85rem',
      fontWeight: '900',
      margin: '0 0 0.5rem 0',
      letterSpacing: '0.02em',
      color: isDark ? '#ffffff' : '#064e3b'
    },
    heroDesc: {
      fontSize: '0.9rem',
      color: isDark ? '#94a3b8' : '#475569',
      margin: '0 0 1.25rem 0',
      lineHeight: '1.5'
    },
    heroMetaRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.65rem'
    },
    metaChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      background: isDark ? 'rgba(0, 0, 0, 0.4)' : '#ffffff',
      border: `1px solid ${border}`,
      fontSize: '0.78rem',
      fontWeight: '600'
    },
    heroActions: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      flexShrink: 0
    },
    btnPrimaryHero: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1.35rem',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #00C84B 0%, #008732 100%)',
      color: '#ffffff',
      border: 'none',
      fontSize: '0.86rem',
      fontWeight: '800',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(0, 200, 75, 0.35)',
      transition: 'all 0.2s ease'
    },
    btnSecondaryHero: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      padding: '0.65rem 1.25rem',
      borderRadius: '8px',
      background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
      color: text,
      border: `1px solid ${border}`,
      fontSize: '0.84rem',
      fontWeight: '700',
      cursor: 'pointer'
    },
    metricGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.25rem',
      marginBottom: '1.75rem'
    },
    metricCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1.35rem',
      borderRadius: '12px',
      background: cardBg,
      border: `1px solid ${border}`,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
    },
    metricIconWrap: {
      width: '46px',
      height: '46px',
      borderRadius: '10px',
      background: 'rgba(56, 189, 248, 0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.25rem'
    },
    metricLabel: {
      fontSize: '0.78rem',
      fontWeight: '700',
      color: isDark ? '#94a3b8' : '#64748b'
    },
    metricVal: {
      fontSize: '1.65rem',
      fontWeight: '900',
      color: isDark ? '#ffffff' : '#0f172a',
      lineHeight: '1.2',
      margin: '0.15rem 0'
    },
    metricSub: {
      fontSize: '0.72rem',
      color: isDark ? '#64748b' : '#94a3b8'
    },
    twoColGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
      gap: '1.5rem'
    },
    cardBox: {
      background: cardBg,
      border: `1px solid ${border}`,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.25rem',
      borderBottom: `1px solid ${border}`,
      background: isDark ? 'rgba(0, 0, 0, 0.25)' : '#f8fafc'
    },
    cardTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.95rem',
      fontWeight: '800',
      color: isDark ? '#ffffff' : '#0f172a'
    },
    cardBody: {
      padding: '1.25rem'
    },
    conductorList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    },
    conductorItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem',
      padding: '0.75rem',
      borderRadius: '8px',
      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
      border: `1px solid ${border}`
    },
    conductorAvatar: {
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #00A83B 0%, #032b11 100%)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '800',
      fontSize: '0.85rem'
    },
    conductorName: {
      fontSize: '0.9rem',
      fontWeight: '800',
      color: isDark ? '#ffffff' : '#0f172a'
    },
    conductorRole: {
      fontSize: '0.74rem',
      color: isDark ? '#94a3b8' : '#64748b',
      marginBottom: '0.35rem'
    },
    conductorContactRow: {
      display: 'flex',
      gap: '0.5rem'
    },
    contactChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
      color: text,
      fontSize: '0.72rem',
      fontWeight: '600',
      textDecoration: 'none'
    },
    roundStepsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    roundStepCard: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      padding: '0.75rem',
      borderRadius: '8px',
      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
      border: `1px solid ${border}`
    },
    roundStepBadge: {
      width: '26px',
      height: '26px',
      borderRadius: '6px',
      background: 'rgba(57, 255, 136, 0.15)',
      color: green,
      fontWeight: '800',
      fontSize: '0.76rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    roundStepContent: {
      flex: 1
    },
    roundStepTitle: {
      fontSize: '0.86rem',
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#0f172a'
    },
    roundStepDesc: {
      fontSize: '0.76rem',
      color: isDark ? '#94a3b8' : '#64748b',
      marginTop: '0.2rem'
    },
    sectionHeadingRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    sectionHeadingTitle: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '1.45rem',
      fontWeight: '800',
      margin: 0,
      color: isDark ? '#ffffff' : '#0f172a'
    },
    sectionHeadingSub: {
      fontSize: '0.84rem',
      color: isDark ? '#94a3b8' : '#64748b',
      margin: '0.25rem 0 0 0'
    },
    filterBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      marginBottom: '1.25rem',
      flexWrap: 'wrap'
    },
    searchWrap: {
      position: 'relative',
      flex: 1,
      minWidth: '280px'
    },
    searchIcon: {
      position: 'absolute',
      left: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDark ? '#64748b' : '#94a3b8',
      fontSize: '0.85rem'
    },
    searchInput: {
      width: '100%',
      padding: '0.65rem 2.25rem 0.65rem 2.5rem',
      borderRadius: '8px',
      background: isDark ? 'rgba(0, 0, 0, 0.4)' : '#ffffff',
      border: `1px solid ${border}`,
      color: text,
      fontSize: '0.84rem',
      outline: 'none',
      boxSizing: 'border-box'
    },
    clearSearchBtn: {
      position: 'absolute',
      right: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'transparent',
      border: 'none',
      color: '#94a3b8',
      cursor: 'pointer'
    },
    filterGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    filterLabel: {
      fontSize: '0.76rem',
      fontWeight: '700',
      color: isDark ? '#94a3b8' : '#64748b'
    },
    filterSelect: {
      padding: '0.55rem 0.85rem',
      borderRadius: '8px',
      background: isDark ? 'rgba(0, 0, 0, 0.4)' : '#ffffff',
      border: `1px solid ${border}`,
      color: text,
      fontSize: '0.8rem',
      fontWeight: '600',
      outline: 'none'
    },
    participantGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      gap: '1.25rem'
    },
    participantCard: {
      background: cardBg,
      border: `1px solid ${border}`,
      borderRadius: '10px',
      padding: '1.25rem',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    },
    partCardHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '0.75rem'
    },
    partName: {
      fontSize: '1rem',
      fontWeight: '800',
      color: isDark ? '#ffffff' : '#0f172a'
    },
    partIdBadge: {
      display: 'inline-block',
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      background: 'rgba(57, 255, 136, 0.1)',
      color: green,
      fontFamily: 'monospace',
      fontSize: '0.72rem',
      fontWeight: '700',
      marginTop: '0.2rem'
    },
    attendanceToggleBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.35rem 0.65rem',
      borderRadius: '20px',
      border: '1px solid',
      fontSize: '0.72rem',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      flexShrink: 0
    },
    partDetailsBox: {
      background: isDark ? 'rgba(0, 0, 0, 0.25)' : '#f8fafc',
      padding: '0.65rem 0.85rem',
      borderRadius: '6px',
      border: `1px solid ${border}`,
      fontSize: '0.78rem'
    },
    partDetailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.2rem 0'
    },
    detailKey: {
      color: isDark ? '#94a3b8' : '#64748b',
      fontWeight: '600'
    },
    detailVal: {
      color: text,
      fontWeight: '700',
      textAlign: 'right'
    },
    partActionRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: 'auto'
    },
    btnDirectCall: {
      flex: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.4rem',
      padding: '0.55rem',
      borderRadius: '6px',
      background: 'linear-gradient(135deg, #00C84B 0%, #008732 100%)',
      color: '#ffffff',
      fontSize: '0.78rem',
      fontWeight: '800',
      textDecoration: 'none',
      boxShadow: '0 2px 8px rgba(0, 200, 75, 0.25)'
    },
    btnDirectWhatsapp: {
      width: '34px',
      height: '34px',
      borderRadius: '6px',
      background: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      color: '#10b981',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textDecoration: 'none'
    },
    btnDirectEmail: {
      width: '34px',
      height: '34px',
      borderRadius: '6px',
      background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
      border: `1px solid ${border}`,
      color: text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textDecoration: 'none'
    },
    winnerFormSection: {
      borderLeft: '4px solid #eab308',
      background: isDark ? 'rgba(0, 0, 0, 0.25)' : '#f8fafc',
      borderRadius: '8px',
      padding: '1.25rem',
      marginBottom: '1.25rem',
      border: `1px solid ${border}`,
      borderLeftWidth: '4px'
    },
    winnerRankHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.85rem'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '0.85rem'
    },
    formFieldFull: {
      gridColumn: '1 / -1',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem'
    },
    formField: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem'
    },
    formLabel: {
      fontSize: '0.78rem',
      fontWeight: '700',
      color: isDark ? '#cbd5e1' : '#334155'
    },
    formInput: {
      padding: '0.65rem 0.85rem',
      borderRadius: '6px',
      background: isDark ? 'rgba(0, 0, 0, 0.4)' : '#ffffff',
      border: `1px solid ${border}`,
      color: text,
      fontSize: '0.84rem',
      outline: 'none'
    },
    formTextarea: {
      width: '100%',
      padding: '0.65rem 0.85rem',
      borderRadius: '6px',
      background: isDark ? 'rgba(0, 0, 0, 0.4)' : '#ffffff',
      border: `1px solid ${border}`,
      color: text,
      fontSize: '0.84rem',
      outline: 'none',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    },
    btnSubmitWinners: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.65rem',
      padding: '0.85rem 1.75rem',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
      color: '#000000',
      border: 'none',
      fontSize: '0.9rem',
      fontWeight: '900',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(234, 179, 8, 0.35)'
    },
    submissionStatusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.45rem 0.95rem',
      borderRadius: '20px',
      background: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid rgba(16, 185, 129, 0.4)',
      color: '#10b981',
      fontSize: '0.78rem',
      fontWeight: '800',
      letterSpacing: '0.04em'
    },
    winnerCardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '1.25rem'
    },
    winnerSummaryCard: {
      background: isDark ? 'rgba(0, 0, 0, 0.3)' : '#f8fafc',
      borderRadius: '8px',
      padding: '1rem',
      border: `1px solid ${border}`
    },
    winnerCardHead: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${border}`,
      paddingBottom: '0.65rem',
      marginBottom: '0.75rem'
    },
    winnerPlacesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.45rem',
      fontSize: '0.82rem'
    },
    winnerPlaceItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.45rem',
      flexWrap: 'wrap'
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '1.5rem'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.45rem 0',
      borderBottom: `1px dashed ${border}`,
      fontSize: '0.84rem'
    },
    infoLabel: {
      color: isDark ? '#94a3b8' : '#64748b',
      fontWeight: '600'
    },
    infoValue: {
      fontWeight: '700',
      color: text,
      textAlign: 'right'
    },
    rulesList: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    ruleItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      fontSize: '0.84rem',
      lineHeight: '1.4'
    },
    btnPrimary: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 1.15rem',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #00C84B 0%, #008732 100%)',
      color: '#ffffff',
      border: 'none',
      fontSize: '0.82rem',
      fontWeight: '800',
      cursor: 'pointer'
    },
    btnPrimarySmall: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.45rem 0.85rem',
      borderRadius: '6px',
      background: 'linear-gradient(135deg, #00C84B 0%, #008732 100%)',
      color: '#ffffff',
      border: 'none',
      fontSize: '0.78rem',
      fontWeight: '800',
      cursor: 'pointer'
    },
    btnSecondary: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 1.15rem',
      borderRadius: '8px',
      background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
      color: text,
      border: `1px solid ${border}`,
      fontSize: '0.82rem',
      fontWeight: '700',
      cursor: 'pointer'
    },
    btnSmallOutline: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.3rem 0.65rem',
      borderRadius: '6px',
      background: 'transparent',
      color: isDark ? '#39FF88' : '#047857',
      border: '1px solid rgba(57, 255, 136, 0.35)',
      fontSize: '0.74rem',
      fontWeight: '700',
      cursor: 'pointer'
    },
    emptyBox: {
      textAlign: 'center',
      padding: '2.5rem 1rem',
      color: isDark ? '#94a3b8' : '#64748b'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '1rem'
    },
    modalBox: {
      width: '100%',
      maxWidth: '620px',
      maxHeight: '90vh',
      overflowY: 'auto',
      background: isDark ? '#0b160e' : '#ffffff',
      border: `1px solid ${border}`,
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)'
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${border}`,
      paddingBottom: '0.85rem',
      marginBottom: '1rem'
    },
    modalTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '1.05rem',
      fontWeight: '800',
      margin: 0,
      color: isDark ? '#ffffff' : '#0f172a'
    },
    modalCloseBtn: {
      background: 'transparent',
      border: 'none',
      color: '#94a3b8',
      cursor: 'pointer',
      padding: '0.25rem'
    },
    modalForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    },
    modalActionRow: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '0.75rem',
      marginTop: '1.25rem',
      paddingTop: '0.85rem',
      borderTop: `1px solid ${border}`
    }
  };
}
