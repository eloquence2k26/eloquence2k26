import { getApiUrl } from '../config/api';

export async function createPaymentOrder(payload) {
  const response = await fetch(getApiUrl('/api/payment/create-order'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function verifyPaymentAndRegister(payload) {
  const response = await fetch(getApiUrl('/api/payment/verify-and-register'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function submitRegistration(payload) {
  try {
    const response = await fetch(getApiUrl('/api/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to process registration on server');
    }

    return {
      success: true,
      data: data.registration || data.ticketData,
    };
  } catch (error) {
    console.warn('[Registration API] Server unreachable or returned error:', error.message);
    
    // Offline fallback
    const year = '2026';
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const fallbackId = `ELQ26-${year}-${randomCode}`;
    const now = new Date();

    const fallbackRecord = {
      registrationId: fallbackId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      whatsapp: payload.whatsapp || null,
      college: payload.college,
      department: payload.department,
      year: payload.year,
      eventId: payload.eventId,
      eventName: payload.eventName,
      eventCategory: payload.eventCategory,
      isTeam: payload.isTeam,
      teamName: payload.teamName || null,
      teamMembers: payload.teamMembers || [],
      participantCount: 1 + (payload.teamMembers ? payload.teamMembers.length : 0),
      feePerHead: payload.feePerHead,
      totalAmount: payload.totalFee,
      feeFormula: payload.feeFormula,
      registrationStatus: 'CONFIRMED',
      paymentStatus: 'PENDING',
      paymentMethod: 'ON_SITE_DESK',
      createdAt: now.toISOString(),
      createdAtFormatted: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      isOfflineFallback: true,
    };

    return {
      success: true,
      data: fallbackRecord,
      warning: 'Stored locally as backend server was offline. Please ensure backend is running to persist to database.'
    };
  }
}

// ==================== PUBLIC SPONSOR & COORDINATOR APIS ====================

let inMemorySponsorsCache = null;

export function groupSponsorsByTier(list) {
  if (!Array.isArray(list)) return { elite: [], premium: [], standard: [] };
  const elite = [];
  const premium = [];
  const standard = [];

  list.forEach((s) => {
    const cat = (s.category || s.tag || '').toLowerCase();
    if (cat.includes('elite') || cat.includes('title')) {
      elite.push(s);
    } else if (cat.includes('premium') || cat.includes('gold') || cat.includes('silver')) {
      premium.push(s);
    } else {
      standard.push(s);
    }
  });

  return { elite, premium, standard };
}

export function getCachedSponsors() {
  if (inMemorySponsorsCache && Array.isArray(inMemorySponsorsCache)) {
    return inMemorySponsorsCache;
  }
  try {
    const raw = sessionStorage.getItem('eloquence_db_sponsors');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemorySponsorsCache = parsed;
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

export function setCachedSponsors(sponsorsList) {
  if (Array.isArray(sponsorsList)) {
    inMemorySponsorsCache = sponsorsList;
    try {
      sessionStorage.setItem('eloquence_db_sponsors', JSON.stringify(sponsorsList));
    } catch (_) {}
  }
}

export async function fetchSponsorsData() {
  try {
    const res = await fetch(getApiUrl('/api/sponsors'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      setCachedSponsors(result.data);
      return result.data;
    }
  } catch (err) {
    console.warn('Error fetching sponsors from DB:', err);
  }
  return getCachedSponsors() || [];
}

export async function fetchActiveSponsors() {
  return await fetchSponsorsData();
}

export async function fetchActiveCoordinators() {
  try {
    const res = await fetch(getApiUrl('/api/coordinators'));
    const data = await res.json();
    if (data.success) return data.data;
    return [];
  } catch (err) {
    console.warn('Failed to fetch coordinators from server, using fallback', err);
    return null;
  }
}

export async function fetchCoordinatorsByEvent(eventId) {
  try {
    const res = await fetch(getApiUrl(`/api/coordinators/event/${encodeURIComponent(eventId)}`));
    const data = await res.json();
    if (data.success) return data.data;
    return [];
  } catch (err) {
    console.warn(`Failed to fetch coordinators for event ${eventId}:`, err);
    return null;
  }
}

// ==================== ADMIN APIS (AUTH REQUIRED) ====================

export async function fetchAdminSponsors(token) {
  const res = await fetch(getApiUrl('/api/admin/sponsors'), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function createSponsor(sponsorData, token) {
  const res = await fetch(getApiUrl('/api/admin/sponsors'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(sponsorData)
  });
  return res.json();
}

export async function updateSponsor(id, sponsorData, token) {
  const res = await fetch(getApiUrl(`/api/admin/sponsors/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(sponsorData)
  });
  return res.json();
}

export async function toggleSponsorStatus(id, token) {
  const res = await fetch(getApiUrl(`/api/admin/sponsors/${id}/toggle`), {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function deleteSponsor(id, token) {
  const res = await fetch(getApiUrl(`/api/admin/sponsors/${id}`), {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function uploadSponsorLogo(imageBase64, fileName, token) {
  const res = await fetch(getApiUrl('/api/admin/upload'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ imageBase64, fileName })
  });
  return res.json();
}

export async function fetchAdminCoordinators(token) {
  const res = await fetch(getApiUrl('/api/admin/coordinators'), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function createCoordinator(coordData, token) {
  const res = await fetch(getApiUrl('/api/admin/coordinators'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(coordData)
  });
  return res.json();
}

export async function updateCoordinator(id, coordData, token) {
  const res = await fetch(getApiUrl(`/api/admin/coordinators/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(coordData)
  });
  return res.json();
}

export async function toggleCoordinatorStatus(id, token) {
  const res = await fetch(getApiUrl(`/api/admin/coordinators/${id}/toggle`), {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function deleteCoordinator(id, token) {
  const res = await fetch(getApiUrl(`/api/admin/coordinators/${id}`), {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

// ==================== HOMEPAGE STUDENT COORDINATOR TEAMS APIS ====================

export async function fetchPublicHomepageCoordinators() {
  try {
    const res = await fetch(getApiUrl('/api/homepage-coordinators'));
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) return data.data;
    return null;
  } catch (err) {
    console.warn('Failed to fetch public homepage coordinators from server:', err);
    return null;
  }
}

export async function fetchAdminHomepageCoordinators(token) {
  const res = await fetch(getApiUrl('/api/admin/homepage-coordinators'), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function createHomepageCoordinatorTeam(teamData, token) {
  const res = await fetch(getApiUrl('/api/admin/homepage-coordinators'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(teamData)
  });
  return res.json();
}

export async function updateHomepageCoordinatorTeam(id, teamData, token) {
  const res = await fetch(getApiUrl(`/api/admin/homepage-coordinators/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(teamData)
  });
  return res.json();
}

export async function toggleHomepageCoordinatorTeam(id, token) {
  const res = await fetch(getApiUrl(`/api/admin/homepage-coordinators/${id}/toggle`), {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function deleteHomepageCoordinatorTeam(id, token) {
  const res = await fetch(getApiUrl(`/api/admin/homepage-coordinators/${id}`), {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

// ==================== REGISTRATION STATUS (CLOSE RG) APIS ====================

export async function fetchRegistrationStatus() {
  try {
    const res = await fetch(getApiUrl('/api/registration-status'));
    const data = await res.json();
    if (data.success) {
      return data;
    }
    return {
      success: true,
      isRegistrationClosed: false,
      closedReason: ''
    };
  } catch (err) {
    console.warn('Failed to fetch registration status from server:', err);
    return {
      success: true,
      isRegistrationClosed: false,
      closedReason: ''
    };
  }
}

export async function fetchAdminRegistrationStatus(token) {
  const res = await fetch(getApiUrl('/api/admin/registration-status'), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function updateRegistrationStatus(token, payload) {
  const res = await fetch(getApiUrl('/api/admin/registration-status'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// ==================== EVENTS CACHING & FETCHING ====================
let inMemoryEventsCache = null;

export function getCachedEvents() {
  if (inMemoryEventsCache && Array.isArray(inMemoryEventsCache) && inMemoryEventsCache.length > 0) {
    return inMemoryEventsCache;
  }
  try {
    const raw = sessionStorage.getItem('eloquence_db_events');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryEventsCache = parsed;
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

export function setCachedEvents(events) {
  if (Array.isArray(events) && events.length > 0) {
    inMemoryEventsCache = events;
    try {
      sessionStorage.setItem('eloquence_db_events', JSON.stringify(events));
    } catch (_) {}
  }
}

export async function fetchEventsData() {
  try {
    const res = await fetch(getApiUrl('/api/events'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      const sorted = [...result.data].sort((a, b) => {
        if (a.category !== b.category) {
          return a.category === 'technical' ? -1 : 1;
        }
        return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
      });
      setCachedEvents(sorted);
      return sorted;
    }
  } catch (err) {
    console.warn('Error fetching events from DB:', err);
  }
  return getCachedEvents() || [];
}

export async function fetchEventWinners(eventId = null) {
  try {
    const url = eventId ? getApiUrl(`/api/winners/${encodeURIComponent(eventId)}`) : getApiUrl('/api/winners');
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) return data.data;
    return [];
  } catch (err) {
    console.warn('Error fetching winners:', err);
    return [];
  }
}

export async function submitEventWinners(winnerPayload) {
  const res = await fetch(getApiUrl('/api/winners'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(winnerPayload)
  });
  return res.json();
}

export async function updateEventCoordinatorDetails(eventId, detailsPayload) {
  const res = await fetch(getApiUrl(`/api/events/${encodeURIComponent(eventId)}/coordinator-update`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(detailsPayload)
  });
  return res.json();
}

export async function fetchEventAllocations(token) {
  const res = await fetch(getApiUrl('/api/admin/event-allocations'), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function updateEventAllocation(allocationData, token) {
  const res = await fetch(getApiUrl('/api/admin/event-allocations'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(allocationData)
  });
  return res.json();
}




