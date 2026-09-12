import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  FaChartBar, 
  FaUserCheck, 
  FaGlobe, 
  FaSignOutAlt, 
  FaPlus, 
  FaTrash, 
  FaSun, 
  FaMoon, 
  FaBolt, 
  FaGamepad, 
  FaBuilding, 
  FaListAlt,
  FaUsers,
  FaFilePdf,
  FaPaperPlane,
  FaThLarge,
  FaTable,
  FaTimes,
  FaBars,
  FaQrcode
} from 'react-icons/fa';
import defaultEvents from '../data/events.js';
import { getApiUrl } from '../config/api';
import ParticipantVerifier from '../components/ParticipantVerifier.jsx';


export default function RegistrationCoordinatorDashboard({ token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('coord_theme') || 'light');
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('coord_theme', next);
  };

  // State
  const [eventsList, setEventsList] = useState(defaultEvents);
  const [registrationsList, setRegistrationsList] = useState([]);
  const [coordinatorsList, setCoordinatorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statFilter, setStatFilter] = useState('all'); // 'all' | 'online' | 'offline' | 'technical' | 'non-technical'

  // Search & Filter States
  const [dashSearch, setDashSearch] = useState('');
  const [regSearch, setRegSearch] = useState('');
  const [onlineRegSearch, setOnlineRegSearch] = useState('');
  const [partEventFilter, setPartEventFilter] = useState('all');
  const [partCategoryFilter, setPartCategoryFilter] = useState('all');
  const [partSearch, setPartSearch] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Send Modal States
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendTargetEvent, setSendTargetEvent] = useState(null);
  const [selectedCoordName, setSelectedCoordName] = useState('');
  const [isSendingList, setIsSendingList] = useState(false);

  // On-Site Registration Form State
  const [onSiteEventId, setOnSiteEventId] = useState('');
  const [onSiteFullName, setOnSiteFullName] = useState('');
  const [onSiteEmail, setOnSiteEmail] = useState('');
  const [onSitePhone, setOnSitePhone] = useState('');
  const [onSiteCollege, setOnSiteCollege] = useState('C. Abdul Hakeem College of Engineering & Technology');
  const [onSiteDept, setOnSiteDept] = useState('CSE');
  const [onSiteYear, setOnSiteYear] = useState('3rd Year');
  const [onSiteTeamName, setOnSiteTeamName] = useState('');
  const [onSiteTeamMembers, setOnSiteTeamMembers] = useState(['']);
  const [isRegisteringOnSite, setIsRegisteringOnSite] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchRegistrations();
    fetchCoordinators();
  }, [token]);

  const fetchEvents = () => {
    fetch(getApiUrl('/api/events'))
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          setEventsList(result.data);
        }
      })
      .catch(err => console.warn('Error fetching events:', err));
  };

  const fetchRegistrations = () => {
    setLoading(true);
    fetch(getApiUrl('/api/registrations'))
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.registrations)) {
          setRegistrationsList(result.registrations);
        } else if (Array.isArray(result)) {
          setRegistrationsList(result);
        }
      })
      .catch(err => console.warn('Error fetching registrations list:', err))
      .finally(() => setLoading(false));
  };

  const fetchCoordinators = () => {
    fetch(getApiUrl('/api/coordinators'))
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          setCoordinatorsList(result.data);
        }
      })
      .catch(err => console.warn('Error fetching coordinators list:', err));
  };

  // PDF Export Sheet Handler
  const handleExportPDF = (targetEvt) => {
    const evtRegs = registrationsList.filter(r => (r.event_id || r.eventId) === targetEvt.id);
    const win = window.open('', '_blank');
    if (!win) return toast.error('Please allow popups to export PDF');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${targetEvt.name} - Official Participant Sheet</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #2563eb; padding-bottom: 12px; }
          .header h1 { margin: 0; color: #1e3a8a; font-size: 24px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0 0; color: #64748b; font-size: 14px; font-weight: 600; }
          .info-bar { display: flex; justify-content: space-between; background: #f8fafc; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 9px 12px; text-align: left; vertical-align: top; }
          th { background: #1e293b; color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { display: inline-block; background: #059669; color: #ffffff; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .members-box { background: #f1f5f9; padding: 6px 8px; border-radius: 6px; font-size: 11px; margin-top: 3px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ELOQUENCE 2026 — OFFICIAL PARTICIPANT SHEET</h1>
          <p>DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING</p>
        </div>

        <div class="info-bar">
          <div><strong>EVENT:</strong> ${targetEvt.name} (${targetEvt.category.toUpperCase()})</div>
          <div><strong>TOTAL REGISTRATIONS:</strong> ${evtRegs.length}</div>
          <div><strong>DATE:</strong> ${new Date().toLocaleDateString()}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="width: 100px;">Ticket Code</th>
              <th style="width: 110px;">Team Name</th>
              <th>Lead Participant</th>
              <th>Phone & Email</th>
              <th>Team Members</th>
              <th>College & Dept</th>
            </tr>
          </thead>
          <tbody>
            ${evtRegs.map((r, i) => {
              const members = getTeamMembers(r);
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${r.ticket_code || r.registrationId || r.id || '-'}</strong></td>
                  <td>${r.team_name || r.teamName ? `<span class="badge">${r.team_name || r.teamName}</span>` : 'Individual'}</td>
                  <td><strong>${r.full_name || r.fullName || 'Anonymous'}</strong></td>
                  <td>${r.phone || '-'}<br/><span style="color:#64748b;font-size:11px;">${r.email || '-'}</span></td>
                  <td>
                    ${members.length > 0 ? `<strong>${members.length + 1} Members:</strong><div class="members-box">1. ${r.full_name || r.fullName} (Lead)<br/>${members.map((m, idx) => `${idx + 2}. ${m}`).join('<br/>')}</div>` : 'Individual Entry'}
                  </td>
                  <td>${r.college || 'CAHCET'}<br/><span style="color:#64748b;font-size:11px;">${r.department || ''} (${r.year || ''})</span></td>
                </tr>
              `;
            }).join('')}
            ${evtRegs.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;">No registered participants for this event.</td></tr>' : ''}
          </tbody>
        </table>

        <div class="footer">
          <div>Generated on: ${new Date().toLocaleString()}</div>
          <div>Event Coordinator Signature: _______________________</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    win.document.write(htmlContent);
    win.document.close();
  };

  // Open Send Modal
  const handleOpenSendModal = (evt) => {
    setSendTargetEvent(evt);
    const assigned = coordinatorsList.find(c => Array.isArray(c.assignedEvents) && c.assignedEvents.map(e => e.toLowerCase()).includes(evt.id.toLowerCase()));
    if (assigned) {
      setSelectedCoordName(assigned.name);
    } else if (coordinatorsList.length > 0) {
      setSelectedCoordName(coordinatorsList[0].name);
    } else {
      setSelectedCoordName('');
    }
    setIsSendModalOpen(true);
  };

  // Send List to Event Coordinator
  const handleConfirmSendList = () => {
    if (!sendTargetEvent || !selectedCoordName.trim()) {
      return toast.error('Please select an Event Coordinator');
    }

    setIsSendingList(true);
    const toastId = toast.loading(`Dispatching list for "${sendTargetEvent.name}"...`);

    fetch(getApiUrl('/api/send-participant-list'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: sendTargetEvent.id,
        eventName: sendTargetEvent.name,
        coordinatorName: selectedCoordName.trim()
      })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          toast.success(resData.message || 'Participant list sent successfully!', { id: toastId, duration: 5000 });
          setIsSendModalOpen(false);
        } else {
          toast.error(resData.message || 'Failed to send list', { id: toastId });
        }
      })
      .catch(err => {
        console.error('Send list error:', err);
        toast.error('Network error while dispatching list', { id: toastId });
      })
      .finally(() => setIsSendingList(false));
  };

  // On-Site Registration Submission
  const handleOnSiteRegisterSubmit = (e) => {
    e.preventDefault();
    if (!onSiteEventId) return toast.error('Please select an event');
    if (!onSiteFullName.trim()) return toast.error('Participant name is required');
    if (!onSitePhone.trim() || !/^[6-9]\d{9}$/.test(onSitePhone.trim().replace(/\s+/g, ''))) {
      return toast.error('Valid 10-digit phone number is required');
    }
    if (!onSiteEmail.trim()) return toast.error('Email address is required');

    const selectedEvt = eventsList.find(evt => evt.id === onSiteEventId);
    if (!selectedEvt) return toast.error('Event not found');

    const validMembers = onSiteTeamMembers.filter(m => m.trim().length > 0);
    const memberCount = 1 + validMembers.length;
    const feePerHead = selectedEvt.feePerHead || 50;
    const totalFee = selectedEvt.isTeam && selectedEvt.feeType === 'fixed' ? feePerHead : (feePerHead * memberCount);

    const payload = {
      currentEvent: selectedEvt,
      fields: {
        fullName: onSiteFullName.trim(),
        email: onSiteEmail.trim(),
        phone: onSitePhone.trim(),
        college: onSiteCollege.trim(),
        department: onSiteDept.trim(),
        year: onSiteYear,
        teamName: selectedEvt.isTeam ? onSiteTeamName.trim() : null,
        teamMembers: validMembers
      },
      totalFee
    };

    setIsRegisteringOnSite(true);
    const toastId = toast.loading('Processing on-site registration...');

    fetch(getApiUrl('/api/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          const ticketCode = resData.ticketData?.ticketCode || 'ELQ26-REG';
          toast.success(`Registration successful! Ticket Code: ${ticketCode}`, { id: toastId, duration: 6000 });
          setOnSiteFullName('');
          setOnSiteEmail('');
          setOnSitePhone('');
          setOnSiteTeamName('');
          setOnSiteTeamMembers(['']);
          fetchRegistrations();
        } else {
          toast.error(resData.message || 'Registration failed', { id: toastId });
        }
      })
      .catch(err => {
        console.error('Registration API error:', err);
        toast.error('Network error during registration', { id: toastId });
      })
      .finally(() => setIsRegisteringOnSite(false));
  };

  // Helper Analytics Calculations
  const isOnlineRecord = (r) => (r.payment_method || r.paymentMethod) !== 'ON_SITE_DESK';
  const getEventCategory = (r) => {
    const evt = eventsList.find(e => e.id === (r.event_id || r.eventId));
    if (evt) return evt.category;
    const id = (r.event_id || r.eventId || '').toLowerCase();
    return id.startsWith('tech') ? 'technical' : 'non-technical';
  };

  const getFee = (r) => Number(r.total_fee || r.totalAmount || r.total_amount || 0);

  const onlineRegs = registrationsList.filter(isOnlineRecord);
  const offlineRegs = registrationsList.filter(r => !isOnlineRecord(r));
  const techRegs = registrationsList.filter(r => getEventCategory(r) === 'technical');
  const nonTechRegs = registrationsList.filter(r => getEventCategory(r) === 'non-technical');

  const totalRevenue = registrationsList.reduce((sum, r) => sum + getFee(r), 0);
  const onlineRevenue = onlineRegs.reduce((sum, r) => sum + getFee(r), 0);
  const offlineRevenue = offlineRegs.reduce((sum, r) => sum + getFee(r), 0);
  const techRevenue = techRegs.reduce((sum, r) => sum + getFee(r), 0);
  const nonTechRevenue = nonTechRegs.reduce((sum, r) => sum + getFee(r), 0);

  const getTeamMembers = (r) => {
    if (Array.isArray(r.registration_members) && r.registration_members.length > 0) {
      return r.registration_members.map(m => m.member_name || m.name || m);
    }
    if (Array.isArray(r.teamMembersList) && r.teamMembersList.length > 0) {
      return r.teamMembersList;
    }
    if (Array.isArray(r.teamMembers) && r.teamMembers.length > 0) {
      return r.teamMembers;
    }
    if (typeof r.team_members === 'string') {
      try {
        const parsed = JSON.parse(r.team_members);
        if (Array.isArray(parsed)) return parsed.map(m => typeof m === 'string' ? m : (m.name || m));
      } catch (e) {
        if (r.team_members.trim()) return [r.team_members.trim()];
      }
    }
    return [];
  };

  // Filtered registrations for Dashboard breakdown table
  const dashboardFilteredRegs = registrationsList.filter(r => {
    if (statFilter === 'online' && !isOnlineRecord(r)) return false;
    if (statFilter === 'offline' && isOnlineRecord(r)) return false;
    if (statFilter === 'technical' && getEventCategory(r) !== 'technical') return false;
    if (statFilter === 'non-technical' && getEventCategory(r) !== 'non-technical') return false;

    const q = dashSearch.toLowerCase().trim();
    if (!q) return true;
    const name = (r.full_name || r.fullName || '').toLowerCase();
    const ticket = (r.ticket_code || r.registrationId || r.id || '').toString().toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    const college = (r.college || '').toLowerCase();
    return name.includes(q) || ticket.includes(q) || phone.includes(q) || college.includes(q);
  });

  // Filtered registrations for Participant List view (event-wise & team-wise)
  const participantFilteredRegs = registrationsList.filter(r => {
    if (partEventFilter !== 'all' && (r.event_id || r.eventId) !== partEventFilter) return false;
    if (partCategoryFilter !== 'all' && getEventCategory(r) !== partCategoryFilter) return false;

    const q = partSearch.toLowerCase().trim();
    if (!q) return true;
    const name = (r.full_name || r.fullName || '').toLowerCase();
    const teamName = (r.team_name || r.teamName || '').toLowerCase();
    const ticket = (r.ticket_code || r.registrationId || r.id || '').toString().toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    const college = (r.college || '').toLowerCase();
    const members = getTeamMembers(r).join(' ').toLowerCase();

    return name.includes(q) || teamName.includes(q) || ticket.includes(q) || phone.includes(q) || college.includes(q) || members.includes(q);
  });

  // Print Registration Ticket / Receipt
  const handlePrintTicket = (reg) => {
    if (!reg) return;
    const isOnline = isOnlineRecord(reg);
    const members = getTeamMembers(reg);
    const win = window.open('', '_blank');
    if (!win) return toast.error('Please allow popups to print ticket');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Eloquence 2026 - Ticket #${reg.ticket_code || reg.registrationId || reg.id}</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body { padding: 40px; background: #f8fafc; color: #0f172a; margin: 0; }
          .ticket-card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 2px solid #059669; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; }
          .header { background: #059669; color: #ffffff; padding: 24px 30px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 4px 0 0 0; opacity: 0.9; font-size: 13px; }
          .badge-mode { padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 12px; text-transform: uppercase; background: ${isOnline ? '#eff6ff' : '#ecfdf5'}; color: ${isOnline ? '#1d4ed8' : '#047857'}; }
          .body { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
          .ticket-code { background: #f1f5f9; padding: 12px 18px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; }
          .code-val { font-size: 18px; font-weight: 800; color: #059669; letter-spacing: 0.5px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .info-box { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .val { font-size: 14px; font-weight: 600; color: #0f172a; }
          .footer { padding: 16px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
          @media print {
            body { padding: 0; background: #ffffff; }
            .ticket-card { box-shadow: none; border-color: #000; }
          }
        </style>
      </head>
      <body>
        <div class="ticket-card">
          <div class="header">
            <div>
              <h1>ELOQUENCE 2026</h1>
              <p>National Level Technical Symposium • C. Abdul Hakeem College of Engg & Tech</p>
            </div>
            <span class="badge-mode">${isOnline ? 'Online Registration' : 'Offline Desk Entry'}</span>
          </div>
          <div class="body">
            <div class="ticket-code">
              <div>
                <div class="label">Ticket Reference / Code</div>
                <div class="code-val">#${reg.ticket_code || reg.registrationId || reg.id}</div>
                <div style="margin-top: 4px;">
                  <span class="label">Status: </span>
                  <span style="color: #10b981; font-weight: 700; font-size: 13px;">${reg.is_verified || reg.isVerified ? 'VERIFIED & ADMITTED' : 'CONFIRMED'}</span>
                </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(reg.ticket_code || reg.registrationId || reg.id)}" 
                  alt="QR Code" 
                  style="width: 75px; height: 75px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; padding: 3px;"
                />
                <span style="font-size: 10px; color: #64748b; font-weight: 600;">Scan at Entry</span>
              </div>
            </div>

            <div class="grid-2">
              <div class="info-box">
                <div class="label">Participant Name</div>
                <div class="val">${reg.full_name || reg.fullName}</div>
              </div>
              <div class="info-box">
                <div class="label">Contact Phone</div>
                <div class="val">${reg.phone || 'N/A'}</div>
              </div>
              <div class="info-box">
                <div class="label">College Name</div>
                <div class="val">${reg.college || 'N/A'}</div>
              </div>
              <div class="info-box">
                <div class="label">Department & Year</div>
                <div class="val">${reg.department || ''} • ${reg.year || ''}</div>
              </div>
              <div class="info-box">
                <div class="label">Event Enrolled</div>
                <div class="val" style="color: #059669;">${getEventName(reg)}</div>
              </div>
              <div class="info-box">
                <div class="label">Category</div>
                <div class="val" style="text-transform: capitalize;">${getEventCategory(reg)} Event</div>
              </div>
              <div class="info-box">
                <div class="label">Total Fee Paid</div>
                <div class="val" style="color: #10b981; font-size: 16px;">₹${getFee(reg)}</div>
              </div>
              <div class="info-box">
                <div class="label">Payment Mode</div>
                <div class="val">${isOnline ? 'Online Web Portal' : 'On-Site Registration Desk'}</div>
              </div>
            </div>

            ${members.length > 0 ? `
              <div class="info-box" style="margin-top: 4px;">
                <div class="label">Team Details: ${reg.team_name || reg.teamName || 'Team'} (${members.length + 1} Members)</div>
                <div class="val" style="font-size: 13px; line-height: 1.6;">
                  1. ${reg.full_name || reg.fullName} (Lead)<br/>
                  ${members.map((m, idx) => `${idx + 2}. ${m}`).join('<br/>')}
                </div>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            Present this ticket at the registration desk on event day. Validated by Registration Coordinator Desk.
          </div>
        </div>
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const S = {
    container: { display: 'flex', height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: isDark ? '#0b0f19' : '#f8fafc', color: isDark ? '#e2e8f0' : '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' },
    loadingContainer: { display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: isDark ? '#0b0f19' : '#f8fafc' },
    spinner: { width: '40px', height: '40px', border: isDark ? '3px solid #1e293b' : '3px solid #e2e8f0', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    
    sidebar: { width: '280px', height: '100vh', position: 'sticky', top: 0, background: isDark ? '#111827' : '#ffffff', borderRight: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 20 },
    sidebarHeader: { padding: '1.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' },
    logoCircle: { width: '42px', height: '42px', borderRadius: '12px', background: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    sidebarTitle: { margin: 0, fontSize: '1.1rem', fontWeight: '800', color: isDark ? '#f9fafb' : '#0f172a' },
    sidebarSubtitle: { fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#64748b', fontWeight: '600' },
    
    navMenu: { flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' },
    navItem: { display: 'flex', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '10px', border: 'none', background: 'transparent', color: isDark ? '#9ca3af' : '#64748b', fontSize: '0.92rem', fontWeight: '600', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', width: '100%' },
    navItemActive: { background: isDark ? '#064e3b' : '#ecfdf5', color: isDark ? '#6ee7b7' : '#059669' },
    navIcon: { marginRight: '12px', fontSize: '1.1rem', flexShrink: 0 },
    badgeCount: { background: isDark ? '#374151' : '#e2e8f0', color: isDark ? '#e5e7eb' : '#475569', padding: '0.15rem 0.45rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700' },

    sidebarFooter: { padding: '1.25rem 1rem', flexShrink: 0, borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' },
    logoutBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.8rem', background: isDark ? '#451a1a' : '#fef2f2', color: '#ef4444', border: isDark ? '1px solid #7f1d1d' : '1px solid #fee2e2', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },

    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowX: 'hidden', overflowY: 'hidden' },
    topHeader: { background: isDark ? '#111827' : '#ffffff', minHeight: '85px', padding: '1rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 },
    pageTitle: { margin: 0, fontSize: '1.4rem', fontWeight: '800', color: isDark ? '#f9fafb' : '#0f172a' },
    pageSubtitle: { margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: isDark ? '#9ca3af' : '#64748b' },
    themeToggleBtn: { background: isDark ? '#1f2937' : '#f1f5f9', border: isDark ? '1px solid #374151' : '1px solid #e2e8f0', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    contentWrapper: { padding: '2.25rem', flex: 1, overflowY: 'auto' },

    // Analytics Stat Cards Grid
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' },
    statCard: { background: isDark ? '#111827' : '#ffffff', padding: '1.5rem', borderRadius: '16px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '0.6rem', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' },
    statCardActive: { border: '1px solid #059669', boxShadow: '0 0 0 2px #059669' },
    statHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    statLabel: { color: isDark ? '#9ca3af' : '#64748b', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' },
    statValue: { color: isDark ? '#f9fafb' : '#0f172a', fontSize: '2rem', fontWeight: '800' },
    statRevenueBadge: { display: 'inline-flex', alignItems: 'center', background: isDark ? '#064e3b' : '#ecfdf5', color: isDark ? '#6ee7b7' : '#047857', padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' },

    viewContainer: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    card: { background: isDark ? '#111827' : '#ffffff', borderRadius: '16px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden' },
    cardHeaderFlex: { padding: '1.25rem 1.75rem', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', background: isDark ? '#1a2234' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' },
    cardTitle: { margin: 0, fontSize: '1.05rem', fontWeight: '700', color: isDark ? '#f9fafb' : '#0f172a' },
    tableResponsive: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { background: isDark ? '#111827' : '#ffffff', padding: '1rem 1.75rem', textAlign: 'left', color: isDark ? '#9ca3af' : '#64748b', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0' },
    tr: { borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' },
    td: { padding: '1.1rem 1.75rem', color: isDark ? '#cbd5e1' : '#334155', fontSize: '0.9rem' },
    strongText: { fontWeight: '600', color: isDark ? '#f9fafb' : '#0f172a' },
    idBadge: { background: isDark ? '#1f2937' : '#f1f5f9', color: isDark ? '#9ca3af' : '#475569', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' },
    tableSubText: { fontSize: '0.78rem', color: isDark ? '#9ca3af' : '#64748b', marginTop: '3px' },
    feeHighlight: { fontWeight: '700', color: '#10b981', fontSize: '0.95rem' },
    badgeTech: { display: 'inline-flex', alignItems: 'center', background: isDark ? '#1e3a8a' : '#eff6ff', color: isDark ? '#93c5fd' : '#1d4ed8', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700' },
    badgeNonTech: { display: 'inline-flex', alignItems: 'center', background: isDark ? '#831843' : '#fdf2f8', color: isDark ? '#fbcfe8' : '#be185d', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700' },
    emptyState: { padding: '3rem', textAlign: 'center', color: isDark ? '#6b7280' : '#94a3b8', fontSize: '0.9rem' },
    searchInput: { width: '100%', padding: '0.75rem 1.25rem', borderRadius: '10px', border: isDark ? '1px solid #374151' : '1px solid #cbd5e1', background: isDark ? '#1f2937' : '#ffffff', fontSize: '0.9rem', outline: 'none', color: isDark ? '#f9fafb' : '#0f172a' },
    filterGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    filterBtn: { padding: '0.55rem 1rem', borderRadius: '8px', border: isDark ? '1px solid #374151' : '1px solid #cbd5e1', background: isDark ? '#1f2937' : '#ffffff', color: isDark ? '#9ca3af' : '#64748b', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    filterBtnActive: { background: '#059669', color: '#ffffff', border: '1px solid #059669' },
    modalInputGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    label: { fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#cbd5e1' : '#334155' },
    input: { padding: '0.75rem 1rem', border: isDark ? '1px solid #374151' : '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', outline: 'none', background: isDark ? '#1f2937' : '#ffffff', color: isDark ? '#f9fafb' : '#0f172a', width: '100%', boxSizing: 'border-box' },
    select: { padding: '0.75rem 1rem', border: isDark ? '1px solid #374151' : '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', outline: 'none', background: isDark ? '#1f2937' : '#ffffff', color: isDark ? '#f9fafb' : '#0f172a', width: '100%', boxSizing: 'border-box' },
    primaryBtn: { padding: '0.75rem 1.5rem', background: '#059669', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.92rem', fontWeight: '600', cursor: 'pointer' },
    actionBtnDelete: { background: isDark ? '#451a1a' : '#fef2f2', border: isDark ? '1px solid #7f1d1d' : '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', fontSize: '0.88rem', padding: '0.45rem 0.65rem', borderRadius: '6px' }
  };

  if (loading) {
    return (
      <div style={S.loadingContainer}>
        <div style={S.spinner}></div>
      </div>
    );
  }

  return (
    <div style={S.container} className="admin-layout-container">
      {/* ==================== SIDEBAR ==================== */}
      <aside style={S.sidebar} className={`admin-sidebar ${mobileSidebarOpen ? 'admin-sidebar-open' : ''}`}>
        <div style={S.sidebarHeader} className="admin-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={S.logoCircle}>
              <FaUserCheck size={20} />
            </div>
            <div>
              <h2 style={S.sidebarTitle}>Registration Portal</h2>
              <span style={S.sidebarSubtitle}>Eloquence 2026 Coordinator</span>
            </div>
          </div>
          <button 
            type="button"
            className="admin-mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileSidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
        </div>

        <nav style={S.navMenu} className={`admin-sidebar-nav ${mobileSidebarOpen ? 'open' : ''}`}>
          <button 
            style={activeTab === 'dashboard' ? { ...S.navItem, ...S.navItemActive } : S.navItem} 
            onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}
          >
            <FaChartBar style={S.navIcon} /> Dashboard
          </button>

          {/* Search & Verify Participant Tab */}
          <button 
            style={activeTab === 'search-participant' ? { ...S.navItem, ...S.navItemActive } : S.navItem} 
            onClick={() => { setActiveTab('search-participant'); setMobileSidebarOpen(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaQrcode style={S.navIcon} />
                <span>Search & Verify</span>
              </div>
              <span style={{ ...S.badgeCount, background: isDark ? '#064e3b' : '#ecfdf5', color: isDark ? '#6ee7b7' : '#059669' }}>
                QR
              </span>
            </div>
          </button>

          <button 
            style={activeTab === 'registration' ? { ...S.navItem, ...S.navItemActive } : S.navItem} 
            onClick={() => { setActiveTab('registration'); setMobileSidebarOpen(false); }}
          >
            <FaUserCheck style={S.navIcon} /> Registration
          </button>

          <button 
            style={activeTab === 'register-list' ? { ...S.navItem, ...S.navItemActive } : S.navItem} 
            onClick={() => { setActiveTab('register-list'); setMobileSidebarOpen(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaListAlt style={S.navIcon} />
                <span>Register List</span>
              </div>
              <span style={S.badgeCount}>{registrationsList.length}</span>
            </div>
          </button>

          <button 
            style={activeTab === 'online-register-list' ? { ...S.navItem, ...S.navItemActive } : S.navItem} 
            onClick={() => { setActiveTab('online-register-list'); setMobileSidebarOpen(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaGlobe style={S.navIcon} />
                <span>Online Registration List</span>
              </div>
              <span style={S.badgeCount}>{onlineRegs.length}</span>
            </div>
          </button>

          <button 
            style={activeTab === 'participant-list' ? { ...S.navItem, ...S.navItemActive } : S.navItem} 
            onClick={() => { setActiveTab('participant-list'); setMobileSidebarOpen(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaUsers style={S.navIcon} />
                <span>Participant List</span>
              </div>
              <span style={S.badgeCount}>{registrationsList.length}</span>
            </div>
          </button>
        </nav>

        <div style={S.sidebarFooter} className="admin-sidebar-footer">
          <button onClick={onLogout} style={S.logoutBtn}>
            <FaSignOutAlt style={S.navIcon} /> Log Out
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <main style={S.mainContent} className="admin-main-content">
        <header style={S.topHeader} className="admin-top-header">
          <div>
            <h1 style={S.pageTitle} className="admin-page-title">
              {activeTab === 'dashboard' && 'Registration Dashboard & Analytics'}
              {activeTab === 'search-participant' && 'Search & Verify Participant (QR Check-in)'}
              {activeTab === 'registration' && 'On-Site Desk Registration'}
              {activeTab === 'register-list' && 'Complete Registrations List'}
              {activeTab === 'online-register-list' && 'Online Portal Registrations'}
              {activeTab === 'participant-list' && 'Event-Wise Participant & Team List'}
            </h1>
            <p style={S.pageSubtitle}>
              {activeTab === 'dashboard' && 'Live breakdown of online vs offline registration counts and revenue collection.'}
              {activeTab === 'search-participant' && 'Search by ticket code, name, phone, email, college or scan participant ticket QR code for live on-site verification & admission.'}
              {activeTab === 'registration' && 'Register participants on-the-spot and generate ticket codes.'}
              {activeTab === 'register-list' && 'Search and filter all registered symposium participants.'}
              {activeTab === 'online-register-list' && 'View participants who registered online via website.'}
              {activeTab === 'participant-list' && 'Filter participants by event, view team names, and inspect all team member details.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={toggleTheme}
              style={S.themeToggleBtn}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <FaSun size={17} style={{ color: '#fbbf24' }} /> : <FaMoon size={16} style={{ color: '#6366f1' }} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '1.15rem',
                border: '2px solid #ffffff',
                boxShadow: '0 3px 10px rgba(37, 99, 235, 0.35)',
                userSelect: 'none',
                flexShrink: 0
              }}>
                {(user?.username || 'Coordinator').charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '700', fontSize: '0.88rem', color: isDark ? '#f8fafc' : '#0f172a', lineHeight: '1.2' }}>
                  {user?.username || 'Coordinator'}
                </span>
                <span style={{ fontSize: '0.7rem', color: isDark ? '#6ee7b7' : '#059669', fontWeight: '700', marginTop: '1px' }}>
                  Registration Coordinator
                </span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="admin-mobile-logout"
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.75rem',
                background: isDark ? '#451a1a' : '#fef2f2',
                color: '#ef4444',
                border: isDark ? '1px solid #7f1d1d' : '1px solid #fee2e2',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Log Out"
            >
              <FaSignOutAlt />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        <div style={S.contentWrapper} className="admin-content-wrapper">
          {/* ==================== 1. DASHBOARD TAB ==================== */}
          {activeTab === 'dashboard' && (
            <div style={S.viewContainer}>
              {/* Analytics Breakdown Grid (Interactive / Touch-Friendly Cards) */}
              <div style={S.statsGrid} className="admin-stats-grid">
                {/* Total Card */}
                <div 
                  style={statFilter === 'all' ? { ...S.statCard, ...S.statCardActive } : S.statCard}
                  onClick={() => setStatFilter('all')}
                  title="Touch to view all registrations"
                >
                  <div style={S.statHeader}>
                    <span style={S.statLabel}>Total Registrations</span>
                    <FaChartBar color="#3b82f6" size={18} />
                  </div>
                  <div style={S.statValue}>{registrationsList.length}</div>
                  <div style={S.statRevenueBadge}>₹{totalRevenue} Total Collected</div>
                </div>

                {/* Online Card */}
                <div 
                  style={statFilter === 'online' ? { ...S.statCard, ...S.statCardActive } : S.statCard}
                  onClick={() => setStatFilter('online')}
                  title="Touch to filter by Online Registrations"
                >
                  <div style={S.statHeader}>
                    <span style={S.statLabel}>Online Registrations</span>
                    <FaGlobe color="#10b981" size={18} />
                  </div>
                  <div style={S.statValue}>{onlineRegs.length}</div>
                  <div style={S.statRevenueBadge}>₹{onlineRevenue} Online Revenue</div>
                </div>

                {/* Offline (On-Site Desk) Card */}
                <div 
                  style={statFilter === 'offline' ? { ...S.statCard, ...S.statCardActive } : S.statCard}
                  onClick={() => setStatFilter('offline')}
                  title="Touch to filter by Offline Desk Registrations"
                >
                  <div style={S.statHeader}>
                    <span style={S.statLabel}>Offline Desk Registrations</span>
                    <FaBuilding color="#f59e0b" size={18} />
                  </div>
                  <div style={S.statValue}>{offlineRegs.length}</div>
                  <div style={S.statRevenueBadge}>₹{offlineRevenue} Offline Revenue</div>
                </div>

                {/* Technical Events Card */}
                <div 
                  style={statFilter === 'technical' ? { ...S.statCard, ...S.statCardActive } : S.statCard}
                  onClick={() => setStatFilter('technical')}
                  title="Touch to filter by Technical Events"
                >
                  <div style={S.statHeader}>
                    <span style={S.statLabel}>Technical Events</span>
                    <FaBolt color="#6366f1" size={18} />
                  </div>
                  <div style={S.statValue}>{techRegs.length}</div>
                  <div style={S.statRevenueBadge}>₹{techRevenue} Tech Revenue</div>
                </div>

                {/* Non-Technical Events Card */}
                <div 
                  style={statFilter === 'non-technical' ? { ...S.statCard, ...S.statCardActive } : S.statCard}
                  onClick={() => setStatFilter('non-technical')}
                  title="Touch to filter by Non-Technical Events"
                >
                  <div style={S.statHeader}>
                    <span style={S.statLabel}>Non-Technical Events</span>
                    <FaGamepad color="#ec4899" size={18} />
                  </div>
                  <div style={S.statValue}>{nonTechRegs.length}</div>
                  <div style={S.statRevenueBadge}>₹{nonTechRevenue} Non-Tech Revenue</div>
                </div>
              </div>

              {/* Interactive Dashboard Breakdown Table */}
              <div style={S.card}>
                <div style={S.cardHeaderFlex}>
                  <div>
                    <h3 style={S.cardTitle}>
                      {statFilter === 'all' && 'All Registration Records'}
                      {statFilter === 'online' && 'Online Registrations Breakdown'}
                      {statFilter === 'offline' && 'Offline On-Site Desk Breakdown'}
                      {statFilter === 'technical' && 'Technical Events Breakdown'}
                      {statFilter === 'non-technical' && 'Non-Technical Events Breakdown'}
                      {' '}({dashboardFilteredRegs.length})
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: isDark ? '#9ca3af' : '#64748b' }}>
                      Touch any stat card above to filter this live table breakdown.
                    </span>
                  </div>
                  <div style={S.filterGroup}>
                    <button
                      onClick={() => setStatFilter('all')}
                      style={statFilter === 'all' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatFilter('online')}
                      style={statFilter === 'online' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      Online ({onlineRegs.length})
                    </button>
                    <button
                      onClick={() => setStatFilter('offline')}
                      style={statFilter === 'offline' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      Offline ({offlineRegs.length})
                    </button>
                    <button
                      onClick={() => setStatFilter('technical')}
                      style={statFilter === 'technical' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      <FaBolt size={11} /> Tech ({techRegs.length})
                    </button>
                    <button
                      onClick={() => setStatFilter('non-technical')}
                      style={statFilter === 'non-technical' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      <FaGamepad size={11} /> Non-Tech ({nonTechRegs.length})
                    </button>
                  </div>
                </div>

                <div style={{ padding: '1rem 1.75rem', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0' }}>
                  <input
                    type="text"
                    placeholder="Search registrations in current view..."
                    value={dashSearch}
                    onChange={(e) => setDashSearch(e.target.value)}
                    style={S.searchInput}
                  />
                </div>

                <div style={S.tableResponsive}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Ticket Code</th>
                        <th style={S.th}>Participant</th>
                        <th style={S.th}>College & Dept</th>
                        <th style={S.th}>Event</th>
                        <th style={S.th}>Fee Collected</th>
                        <th style={S.th}>Channel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardFilteredRegs.map((reg, i) => {
                        const ticketCode = reg.ticket_code || reg.registrationId || reg.id || `#${i + 1}`;
                        const name = reg.full_name || reg.fullName || 'Anonymous';
                        const evtName = reg.eventName || eventsList.find(e => e.id === reg.event_id)?.name || reg.event_id || 'Event';
                        const isOnline = isOnlineRecord(reg);
                        const fee = getFee(reg);

                        return (
                          <tr key={i} style={S.tr}>
                            <td style={S.td}><span style={S.idBadge}>{ticketCode}</span></td>
                            <td style={S.td}>
                              <div>
                                <span style={S.strongText}>{name}</span>
                                <div style={S.tableSubText}>{reg.phone} • {reg.email}</div>
                              </div>
                            </td>
                            <td style={S.td}>
                              <div>
                                {reg.college || 'CAHCET'}
                                <div style={S.tableSubText}>{reg.department} ({reg.year})</div>
                              </div>
                            </td>
                            <td style={S.td}>
                              <div>
                                <span style={S.strongText}>{evtName}</span>
                                <div style={S.tableSubText}>[{getEventCategory(reg).toUpperCase()}]</div>
                              </div>
                            </td>
                            <td style={S.td}><span style={S.feeHighlight}>₹{fee}</span></td>
                            <td style={S.td}>
                              <span style={isOnline ? S.badgeTech : S.badgeNonTech}>
                                {isOnline ? 'Online' : 'Offline Desk'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {dashboardFilteredRegs.length === 0 && (
                        <tr><td colSpan="6" style={S.emptyState}>No matching records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SEARCH & VERIFY PARTICIPANT (QR SCANNER) ==================== */}
          {activeTab === 'search-participant' && (
            <ParticipantVerifier 
              token={token}
              user={user}
              isDark={isDark}
              registrations={registrationsList}
              events={eventsList}
              onRefreshRegistrations={fetchRegistrations}
              onPrintTicket={handlePrintTicket}
            />
          )}

          {/* ==================== 2. REGISTRATION FORM TAB ==================== */}
          {activeTab === 'registration' && (
            <div style={S.viewContainer}>
              <div style={{ ...S.card, padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <h3 style={{ ...S.cardTitle, marginBottom: '0.5rem', fontSize: '1.25rem' }}>
                  Participant On-Site Desk Registration
                </h3>
                <p style={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Register participants directly at the reception desk and generate ticket credentials.
                </p>

                <form onSubmit={handleOnSiteRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={S.modalInputGroup}>
                    <label style={S.label}>Select Event *</label>
                    <select
                      value={onSiteEventId}
                      onChange={(e) => setOnSiteEventId(e.target.value)}
                      style={S.select}
                      required
                    >
                      <option value="">-- Choose Symposium Event --</option>
                      {eventsList.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          [{evt.category.toUpperCase()}] {evt.name} — {evt.fee || `₹${evt.feePerHead || 50}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={S.modalInputGroup}>
                      <label style={S.label}>Participant Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Mohamed Ali"
                        value={onSiteFullName}
                        onChange={(e) => setOnSiteFullName(e.target.value)}
                        style={S.input}
                        required
                      />
                    </div>
                    <div style={S.modalInputGroup}>
                      <label style={S.label}>Phone Number (10 digits) *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={onSitePhone}
                        onChange={(e) => setOnSitePhone(e.target.value)}
                        style={S.input}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={S.modalInputGroup}>
                      <label style={S.label}>Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. student@gmail.com"
                        value={onSiteEmail}
                        onChange={(e) => setOnSiteEmail(e.target.value)}
                        style={S.input}
                        required
                      />
                    </div>
                    <div style={S.modalInputGroup}>
                      <label style={S.label}>College Name *</label>
                      <input
                        type="text"
                        placeholder="College Name"
                        value={onSiteCollege}
                        onChange={(e) => setOnSiteCollege(e.target.value)}
                        style={S.input}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={S.modalInputGroup}>
                      <label style={S.label}>Department *</label>
                      <input
                        type="text"
                        placeholder="e.g. CSE / IT / ECE"
                        value={onSiteDept}
                        onChange={(e) => setOnSiteDept(e.target.value)}
                        style={S.input}
                        required
                      />
                    </div>
                    <div style={S.modalInputGroup}>
                      <label style={S.label}>Year of Study *</label>
                      <select
                        value={onSiteYear}
                        onChange={(e) => setOnSiteYear(e.target.value)}
                        style={S.select}
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

                  {/* Team Event Support */}
                  {eventsList.find(e => e.id === onSiteEventId)?.isTeam && (
                    <div style={{ background: isDark ? '#1f2937' : '#f8fafc', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: isDark ? '1px solid #374151' : '1px solid #e2e8f0' }}>
                      <div style={S.modalInputGroup}>
                        <label style={S.label}>Team Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Cyber Squad"
                          value={onSiteTeamName}
                          onChange={(e) => setOnSiteTeamName(e.target.value)}
                          style={S.input}
                        />
                      </div>
                      <div style={S.modalInputGroup}>
                        <label style={S.label}>Additional Team Members</label>
                        {onSiteTeamMembers.map((m, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <input
                              type="text"
                              placeholder={`Member #${idx + 2} Full Name`}
                              value={m}
                              onChange={(e) => {
                                const copy = [...onSiteTeamMembers];
                                copy[idx] = e.target.value;
                                setOnSiteTeamMembers(copy);
                              }}
                              style={S.input}
                            />
                            {onSiteTeamMembers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setOnSiteTeamMembers(onSiteTeamMembers.filter((_, i) => i !== idx))}
                                style={S.actionBtnDelete}
                              >
                                <FaTrash size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setOnSiteTeamMembers([...onSiteTeamMembers, ''])}
                          style={{ ...S.filterBtn, alignSelf: 'flex-start', marginTop: '0.2rem' }}
                        >
                          <FaPlus size={10} /> Add Member
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isRegisteringOnSite}
                    style={{ ...S.primaryBtn, width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}
                  >
                    {isRegisteringOnSite ? 'Processing...' : 'Complete & Generate Ticket Code'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================== 3. REGISTER LIST TAB ==================== */}
          {activeTab === 'register-list' && (
            <div style={S.viewContainer}>
              <div style={S.viewHeader}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1, maxWidth: '650px' }}>
                  <input 
                    type="text" 
                    placeholder="Search by participant name, ticket code, phone, college..." 
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                    style={S.searchInput}
                  />
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHeaderFlex}>
                  <h3 style={S.cardTitle}>Complete Registered Participants ({registrationsList.length})</h3>
                </div>
                <div style={S.tableResponsive}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Ticket Code</th>
                        <th style={S.th}>Participant</th>
                        <th style={S.th}>College & Dept</th>
                        <th style={S.th}>Event</th>
                        <th style={S.th}>Fee</th>
                        <th style={S.th}>Channel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrationsList
                        .filter(r => {
                          const q = regSearch.toLowerCase().trim();
                          if (!q) return true;
                          const name = (r.full_name || r.fullName || '').toLowerCase();
                          const ticket = (r.ticket_code || r.registrationId || r.id || '').toString().toLowerCase();
                          const phone = (r.phone || '').toLowerCase();
                          const college = (r.college || '').toLowerCase();
                          return name.includes(q) || ticket.includes(q) || phone.includes(q) || college.includes(q);
                        })
                        .map((reg, i) => {
                          const ticketCode = reg.ticket_code || reg.registrationId || reg.id || `#${i + 1}`;
                          const name = reg.full_name || reg.fullName || 'Anonymous';
                          const evtName = reg.eventName || eventsList.find(e => e.id === reg.event_id)?.name || reg.event_id || 'Event';
                          const isOnline = isOnlineRecord(reg);

                          return (
                            <tr key={i} style={S.tr}>
                              <td style={S.td}><span style={S.idBadge}>{ticketCode}</span></td>
                              <td style={S.td}>
                                <div>
                                  <span style={S.strongText}>{name}</span>
                                  <div style={S.tableSubText}>{reg.phone} • {reg.email}</div>
                                </div>
                              </td>
                              <td style={S.td}>
                                <div>
                                  {reg.college || 'CAHCET'}
                                  <div style={S.tableSubText}>{reg.department} ({reg.year})</div>
                                </div>
                              </td>
                              <td style={S.td}><span style={S.strongText}>{evtName}</span></td>
                              <td style={S.td}><span style={S.feeHighlight}>₹{getFee(reg)}</span></td>
                              <td style={S.td}>
                                <span style={isOnline ? S.badgeTech : S.badgeNonTech}>
                                  {isOnline ? 'Online' : 'Offline Desk'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      {registrationsList.length === 0 && (
                        <tr><td colSpan="6" style={S.emptyState}>No registrations found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 4. ONLINE REGISTRATION LIST TAB ==================== */}
          {activeTab === 'online-register-list' && (
            <div style={S.viewContainer}>
              <div style={S.viewHeader}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1, maxWidth: '650px' }}>
                  <input 
                    type="text" 
                    placeholder="Search online registrations by name, ticket code, phone..." 
                    value={onlineRegSearch}
                    onChange={(e) => setOnlineRegSearch(e.target.value)}
                    style={S.searchInput}
                  />
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHeaderFlex}>
                  <h3 style={S.cardTitle}>Online Portal Registrations ({onlineRegs.length})</h3>
                </div>
                <div style={S.tableResponsive}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Ticket Code</th>
                        <th style={S.th}>Participant</th>
                        <th style={S.th}>College & Dept</th>
                        <th style={S.th}>Event</th>
                        <th style={S.th}>Amount</th>
                        <th style={S.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onlineRegs
                        .filter(r => {
                          const q = onlineRegSearch.toLowerCase().trim();
                          if (!q) return true;
                          const name = (r.full_name || r.fullName || '').toLowerCase();
                          const ticket = (r.ticket_code || r.registrationId || r.id || '').toString().toLowerCase();
                          const phone = (r.phone || '').toLowerCase();
                          return name.includes(q) || ticket.includes(q) || phone.includes(q);
                        })
                        .map((reg, i) => {
                          const ticketCode = reg.ticket_code || reg.registrationId || reg.id || `#${i + 1}`;
                          const name = reg.full_name || reg.fullName || 'Anonymous';
                          const evtName = reg.eventName || eventsList.find(e => e.id === reg.event_id)?.name || reg.event_id || 'Event';

                          return (
                            <tr key={i} style={S.tr}>
                              <td style={S.td}><span style={S.idBadge}>{ticketCode}</span></td>
                              <td style={S.td}>
                                <div>
                                  <span style={S.strongText}>{name}</span>
                                  <div style={S.tableSubText}>{reg.phone} • {reg.email}</div>
                                </div>
                              </td>
                              <td style={S.td}>
                                <div>
                                  {reg.college || 'College'}
                                  <div style={S.tableSubText}>{reg.department} ({reg.year})</div>
                                </div>
                              </td>
                              <td style={S.td}><span style={S.strongText}>{evtName}</span></td>
                              <td style={S.td}><span style={S.feeHighlight}>₹{getFee(reg)}</span></td>
                              <td style={S.td}>
                                <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.85rem' }}>
                                  Confirmed
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      {onlineRegs.length === 0 && (
                        <tr><td colSpan="6" style={S.emptyState}>No online registrations found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 5. EVENT-WISE PARTICIPANT & TEAM LIST TAB ==================== */}
          {activeTab === 'participant-list' && (
            <div style={S.viewContainer}>
              {/* Event Filter & View Mode Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: isDark ? '#111827' : '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setViewMode('cards')}
                      style={viewMode === 'cards' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      <FaThLarge size={12} /> Event Cards View
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      style={viewMode === 'table' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      <FaTable size={12} /> Detailed Table View
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPartCategoryFilter('all')}
                      style={partCategoryFilter === 'all' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      All ({eventsList.length})
                    </button>
                    <button
                      onClick={() => setPartCategoryFilter('technical')}
                      style={partCategoryFilter === 'technical' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      <FaBolt size={11} /> Tech ({eventsList.filter(e => e.category === 'technical').length})
                    </button>
                    <button
                      onClick={() => setPartCategoryFilter('non-technical')}
                      style={partCategoryFilter === 'non-technical' ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
                    >
                      <FaGamepad size={11} /> Non-Tech ({eventsList.filter(e => e.category === 'non-technical').length})
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                  <div style={S.modalInputGroup}>
                    <label style={S.label}>Select Event</label>
                    <select
                      value={partEventFilter}
                      onChange={(e) => setPartEventFilter(e.target.value)}
                      style={S.select}
                    >
                      <option value="all">-- All Symposium Events ({eventsList.length}) --</option>
                      {eventsList.map(evt => (
                        <option key={evt.id} value={evt.id}>
                          [{evt.category.toUpperCase()}] {evt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ ...S.modalInputGroup, gridColumn: 'span 2' }}>
                    <label style={S.label}>Search Participants / Teams</label>
                    <input
                      type="text"
                      placeholder="Search participant name, team name, team member, phone, ticket..."
                      value={partSearch}
                      onChange={(e) => setPartSearch(e.target.value)}
                      style={S.searchInput}
                    />
                  </div>
                </div>
              </div>

              {/* ================= 5A. EVENT CARDS VIEW ================= */}
              {viewMode === 'cards' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                  {eventsList
                    .filter(evt => partEventFilter === 'all' || evt.id === partEventFilter)
                    .filter(evt => partCategoryFilter === 'all' || evt.category === partCategoryFilter)
                    .map(evt => {
                      const evtRegs = registrationsList.filter(r => (r.event_id || r.eventId) === evt.id);
                      const isTech = evt.category === 'technical';
                      const teamsCount = evtRegs.filter(r => getTeamMembers(r).length > 0 || r.team_name || r.teamName).length;

                      return (
                        <div key={evt.id} style={{ ...S.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={S.cardHeaderFlex}>
                              <div>
                                <h3 style={S.cardTitle}>{evt.name}</h3>
                                <span style={isTech ? S.badgeTech : S.badgeNonTech}>
                                  {isTech ? 'Technical Event' : 'Non-Technical Event'}
                                </span>
                              </div>
                              <span style={S.idBadge}>
                                {evt.fee || `₹${evt.feePerHead || 50}`}
                              </span>
                            </div>

                            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {/* Event Stats Summary Bar */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', background: isDark ? '#1f2937' : '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: isDark ? '1px solid #374151' : '1px solid #e2e8f0' }}>
                                <div>
                                  <span style={{ fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#64748b', fontWeight: '600' }}>Registrations</span>
                                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: isDark ? '#f9fafb' : '#0f172a' }}>{evtRegs.length}</div>
                                </div>
                                <div>
                                  <span style={{ fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#64748b', fontWeight: '600' }}>Teams Count</span>
                                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981' }}>{teamsCount}</div>
                                </div>
                                <div>
                                  <span style={{ fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#64748b', fontWeight: '600' }}>Venue</span>
                                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: isDark ? '#93c5fd' : '#2563eb', marginTop: '4px' }}>{evt.venue || 'Main Lab'}</div>
                                </div>
                              </div>

                              {/* Participant & Team Member Preview */}
                              <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isDark ? '#cbd5e1' : '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Participants & Team Members ({evtRegs.length})
                                </span>
                                <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {evtRegs.map((reg, idx) => {
                                    const members = getTeamMembers(reg);
                                    const teamName = reg.team_name || reg.teamName;

                                    return (
                                      <div key={idx} style={{ background: isDark ? '#1f2937' : '#f1f5f9', padding: '0.65rem 0.85rem', borderRadius: '8px', border: isDark ? '1px solid #374151' : '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontWeight: '700', fontSize: '0.88rem', color: isDark ? '#f9fafb' : '#0f172a' }}>
                                            {reg.full_name || reg.fullName || 'Participant'}
                                          </span>
                                          {teamName && (
                                            <span style={{ background: isDark ? '#064e3b' : '#ecfdf5', color: isDark ? '#6ee7b7' : '#047857', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700' }}>
                                              {teamName}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: isDark ? '#9ca3af' : '#64748b', marginTop: '2px' }}>
                                          {reg.college} • {reg.department}
                                        </div>
                                        {members.length > 0 && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                            <span style={{ fontSize: '0.72rem', color: isDark ? '#93c5fd' : '#1d4ed8', fontWeight: '700' }}>
                                              Members ({members.length + 1}):
                                            </span>
                                            {members.map((m, i) => (
                                              <span key={i} style={{ background: isDark ? '#374151' : '#cbd5e1', color: isDark ? '#f9fafb' : '#0f172a', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                {m}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {evtRegs.length === 0 && (
                                    <div style={{ color: isDark ? '#6b7280' : '#94a3b8', fontSize: '0.82rem', padding: '0.75rem', textAlign: 'center' }}>
                                      No participants registered yet for this event.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: Export PDF & Send to Event Coordinator */}
                          <div style={{ padding: '1rem 1.25rem', borderTop: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', background: isDark ? '#1a2234' : '#f8fafc', display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleExportPDF(evt)}
                              style={{ ...S.filterBtn, flex: 1, justifyContent: 'center', background: isDark ? '#1e3a8a' : '#eff6ff', color: isDark ? '#93c5fd' : '#1d4ed8', borderColor: isDark ? '#1e40af' : '#bfdbfe' }}
                            >
                              <FaFilePdf size={13} /> Export PDF
                            </button>
                            <button
                              onClick={() => handleOpenSendModal(evt)}
                              style={{ ...S.primaryBtn, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.55rem 0.85rem' }}
                            >
                              <FaPaperPlane size={12} /> Send
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* ================= 5B. DETAILED TABLE VIEW ================= */}
              {viewMode === 'table' && (
                <div style={S.card}>
                  <div style={S.cardHeaderFlex}>
                    <h3 style={S.cardTitle}>
                      Participant & Team List ({participantFilteredRegs.length})
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: isDark ? '#9ca3af' : '#64748b' }}>
                      Showing participants for {partEventFilter === 'all' ? 'All Events' : (eventsList.find(e => e.id === partEventFilter)?.name || partEventFilter)}.
                    </span>
                  </div>

                  <div style={S.tableResponsive}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Ticket</th>
                          <th style={S.th}>Event</th>
                          <th style={S.th}>Team Name</th>
                          <th style={S.th}>Lead Participant</th>
                          <th style={S.th}>Team Members</th>
                          <th style={S.th}>College & Dept</th>
                          <th style={S.th}>Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantFilteredRegs.map((reg, i) => {
                          const ticketCode = reg.ticket_code || reg.registrationId || reg.id || `#${i + 1}`;
                          const name = reg.full_name || reg.fullName || 'Anonymous';
                          const evt = eventsList.find(e => e.id === (reg.event_id || reg.eventId));
                          const evtName = reg.eventName || evt?.name || reg.event_id || 'Event';
                          const members = getTeamMembers(reg);
                          const teamName = reg.team_name || reg.teamName || (members.length > 0 ? 'Team' : '-');
                          const isTech = getEventCategory(reg) === 'technical';

                          return (
                            <tr key={i} style={S.tr}>
                              <td style={S.td}><span style={S.idBadge}>{ticketCode}</span></td>
                              <td style={S.td}>
                                <div>
                                  <span style={S.strongText}>{evtName}</span>
                                  <div>
                                    <span style={isTech ? S.badgeTech : S.badgeNonTech}>
                                      {isTech ? 'Tech' : 'Non-Tech'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td style={S.td}>
                                {teamName !== '-' ? (
                                  <span style={{
                                    background: isDark ? '#064e3b' : '#ecfdf5',
                                    color: isDark ? '#6ee7b7' : '#047857',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    fontSize: '0.85rem'
                                  }}>
                                    {teamName}
                                  </span>
                                ) : (
                                  <span style={{ color: isDark ? '#6b7280' : '#94a3b8', fontSize: '0.85rem' }}>Individual</span>
                                )}
                              </td>
                              <td style={S.td}>
                                <div>
                                  <span style={S.strongText}>{name}</span>
                                  <div style={S.tableSubText}>{reg.phone} • {reg.email}</div>
                                </div>
                              </td>
                              <td style={S.td}>
                                {members.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.78rem', color: isDark ? '#93c5fd' : '#1d4ed8', fontWeight: '700' }}>
                                      {members.length + 1} Members Total
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                      <span style={{ background: isDark ? '#1f2937' : '#f1f5f9', color: isDark ? '#e2e8f0' : '#334155', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                        1. {name} (Lead)
                                      </span>
                                      {members.map((m, idx) => (
                                        <span key={idx} style={{ background: isDark ? '#374151' : '#e2e8f0', color: isDark ? '#f9fafb' : '#0f172a', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                          {idx + 2}. {m}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: isDark ? '#6b7280' : '#94a3b8' }}>N/A (Individual)</span>
                                )}
                              </td>
                              <td style={S.td}>
                                <div>
                                  {reg.college || 'CAHCET'}
                                  <div style={S.tableSubText}>{reg.department} ({reg.year})</div>
                                </div>
                              </td>
                              <td style={S.td}><span style={S.feeHighlight}>₹{getFee(reg)}</span></td>
                            </tr>
                          );
                        })}
                        {participantFilteredRegs.length === 0 && (
                          <tr><td colSpan="7" style={S.emptyState}>No participant records match the selected event and search query.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== SEND TO EVENT COORDINATOR MODAL ==================== */}
          {isSendModalOpen && sendTargetEvent && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}>
              <div style={{
                background: isDark ? '#111827' : '#ffffff',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '520px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
                border: isDark ? '1px solid #374151' : '1px solid #e2e8f0',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '1.5rem 1.75rem', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: isDark ? '#f9fafb' : '#0f172a' }}>
                      Send Participant List
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: isDark ? '#9ca3af' : '#64748b' }}>
                      Event: <strong>{sendTargetEvent.name}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => setIsSendModalOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: isDark ? '#9ca3af' : '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    <FaTimes />
                  </button>
                </div>

                <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={S.modalInputGroup}>
                    <label style={S.label}>Select Event Coordinator Account / Name *</label>
                    {coordinatorsList.length > 0 ? (
                      <select
                        value={selectedCoordName}
                        onChange={(e) => setSelectedCoordName(e.target.value)}
                        style={S.select}
                      >
                        {coordinatorsList.map((c, i) => (
                          <option key={c.id || i} value={c.name}>
                            {c.name} {c.assignedEvents?.length ? `(${c.assignedEvents.join(', ')})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Enter Event Coordinator Username / Name"
                        value={selectedCoordName}
                        onChange={(e) => setSelectedCoordName(e.target.value)}
                        style={S.input}
                        required
                      />
                    )}
                  </div>

                  <div style={{ background: isDark ? '#1f2937' : '#f8fafc', padding: '1rem', borderRadius: '10px', border: isDark ? '1px solid #374151' : '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.82rem', color: isDark ? '#cbd5e1' : '#475569', fontWeight: '600' }}>
                      Summary to Dispatch:
                    </span>
                    <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0, fontSize: '0.82rem', color: isDark ? '#9ca3af' : '#64748b' }}>
                      <li>Event: {sendTargetEvent.name} ({sendTargetEvent.category.toUpperCase()})</li>
                      <li>Total Registered Participants: {registrationsList.filter(r => (r.event_id || r.eventId) === sendTargetEvent.id).length}</li>
                      <li>Includes complete team member rosters & ticket codes.</li>
                    </ul>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsSendModalOpen(false)}
                      style={{ ...S.filterBtn, flex: 1, justifyContent: 'center', padding: '0.75rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSendingList}
                      onClick={handleConfirmSendList}
                      style={{ ...S.primaryBtn, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.75rem' }}
                    >
                      <FaPaperPlane size={12} /> {isSendingList ? 'Sending...' : 'Confirm & Send List'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
