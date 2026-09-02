const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

// Persistent Data Storage Path
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'registrations.json');
const SPONSORS_FILE = path.join(DATA_DIR, 'sponsors.json');
const COORDINATORS_FILE = path.join(DATA_DIR, 'coordinators.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
}

function readRegistrations() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading registrations file:', err);
    return [];
  }
}

function writeRegistrations(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing registrations file:', err);
    return false;
  }
}

function readSponsors() {
  try {
    const raw = fs.readFileSync(SPONSORS_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}

function readCoordinators() {
  try {
    const raw = fs.readFileSync(COORDINATORS_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}

const dbToSponsor = (s) => ({
  id: s.id,
  name: s.name,
  companyName: s.company_name || s.companyName || '',
  logo: s.logo || '',
  description: s.description || '',
  website: s.website || '',
  contactName: s.contact_name || s.contactName || '',
  contactEmail: s.contact_email || s.contactEmail || '',
  contactPhone: s.contact_phone || s.contactPhone || '',
  category: s.category || 'Gold Sponsor',
  displayOrder: Number(s.display_order ?? s.displayOrder ?? 999),
  isActive: s.is_active !== false && s.isActive !== false,
  createdAt: s.created_at || s.createdAt,
  updatedAt: s.updated_at || s.updatedAt
});

const dbToCoordinator = (c) => ({
  id: c.id,
  name: c.name,
  phone: c.phone || '',
  whatsapp: c.whatsapp || '',
  email: c.email || '',
  department: c.department || '',
  year: c.year || '',
  role: c.role || 'Lead Coordinator',
  assignedEvents: Array.isArray(c.assigned_events) ? c.assigned_events : (Array.isArray(c.assignedEvents) ? c.assignedEvents : []),
  displayOrder: Number(c.display_order ?? c.displayOrder ?? 999),
  isActive: c.is_active !== false && c.isActive !== false,
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

const dbToEvent = (e) => ({
  id: e.id,
  number: e.number,
  name: e.name,
  alias: e.alias,
  subtitle: e.subtitle,
  category: e.category,
  teamSize: e.team_size || e.teamSize,
  minMembers: e.min_members || e.minMembers || 1,
  maxMembers: e.max_members || e.maxMembers || 1,
  fee: e.fee,
  feePerHead: e.fee_per_head || e.feePerHead || 0,
  feeType: e.fee_type || e.feeType || 'per_head',
  isTeam: e.is_team !== false && e.isTeam !== false,
  tag: e.tag,
  venue: e.venue,
  timing: e.timing,
  description: e.description,
  image: e.image || '',
  rules: e.rules,
  rounds: e.rounds,
  guidelines: e.guidelines,
  highlights: e.highlights,
  createdAt: e.created_at || e.createdAt,
  updatedAt: e.updated_at || e.updatedAt
});

exports.getStatus = (req, res) => {
  res.json({
    success: true,
    message: 'API is working properly'
  });
};

exports.registerEvent = async (req, res) => {
  const { currentEvent, fields, totalFee } = req.body;
  
  if (!currentEvent || !fields) {
    return res.status(400).json({ success: false, message: 'Missing required data' });
  }

  // Generate a mock ticket code
  const ticketCode = `ELQ26-${currentEvent.category === 'technical' ? 'TCH' : 'NT'}-${Math.floor(10000 + Math.random() * 90000)}`;

  try {
    // 0. Auto-seed the event on the fly (This ensures the event exists in the database before registering!)
    await supabase.from('events').upsert([{
      id: currentEvent.id,
      name: currentEvent.name,
      category: currentEvent.category,
      team_size: currentEvent.teamSize || null,
      min_members: currentEvent.minMembers || 1,
      max_members: currentEvent.maxMembers || 1,
      fee_type: currentEvent.feeType || 'per_head',
      fee_per_head: currentEvent.feePerHead || 50
    }], { onConflict: 'id' });

    const validTeamMembers = (fields.teamMembers || [])
      .filter(m => (typeof m === 'string' ? m.trim().length > 0 : (m?.name && m.name.trim().length > 0)));

    // 1. Insert into registrations table
    const { data: regData, error: regError } = await supabase
      .from('registrations')
      .insert([{
        event_id: currentEvent.id,
        ticket_code: ticketCode,
        team_name: fields.teamName || null,
        full_name: fields.fullName,
        email: fields.email,
        phone: fields.phone,
        college: fields.college,
        department: fields.department,
        year: fields.year,
        members_count: 1 + validTeamMembers.length,
        total_fee: totalFee,
        payment_status: 'pending'
      }])
      .select('id');

    if (regError) throw regError;
    const registrationId = regData[0].id;

    // 2. Insert team members into registration_members table if any
    if (validTeamMembers.length > 0) {
      const membersToInsert = validTeamMembers.map((member, idx) => ({
        registration_id: registrationId,
        member_number: idx + 2,
        member_name: (typeof member === 'string' ? member : (member.name || '')).trim()
      }));

      const { error: membersError } = await supabase
        .from('registration_members')
        .insert(membersToInsert);

      if (membersError) {
        console.error('Registration members insert error:', membersError);
        throw membersError;
      }
    }

    // Prepare response data for the ticket PDF
    const ticketData = {
      ticketCode,
      eventName: currentEvent.name,
      category: currentEvent.category,
      leadName: fields.fullName,
      college: fields.college,
      department: fields.department,
      email: fields.email,
      phone: fields.phone,
      year: fields.year,
      teamName: fields.teamName || null,
      membersCount: 1 + validTeamMembers.length,
      teamMembersList: validTeamMembers.map(m => typeof m === 'string' ? m : m.name),
      totalFee,
      venue: currentEvent.venue,
      timing: currentEvent.timing,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    // Save backup to local JSON as well
    try {
      const localRegs = readRegistrations();
      localRegs.push({
        registrationId: ticketCode,
        id: registrationId,
        fullName: fields.fullName,
        email: fields.email,
        phone: fields.phone,
        college: fields.college,
        department: fields.department,
        year: fields.year,
        eventId: currentEvent.id,
        eventName: currentEvent.name,
        isTeam: Boolean(currentEvent.isTeam),
        teamName: fields.teamName || null,
        totalAmount: Number(totalFee) || 0,
        createdAt: new Date().toISOString()
      });
      writeRegistrations(localRegs);
    } catch (localErr) {
      console.warn('Local backup registration write error:', localErr);
    }

    res.json({
      success: true,
      message: 'Registration successful',
      ticketData
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Database error during registration',
      errorDetails: err.message || JSON.stringify(err)
    });
  }
};

exports.getHealth = (req, res) => {
  res.json({
    status: 'OK',
    service: "ELOQUENCE'26 Registration API",
    timestamp: new Date().toISOString()
  });
};

exports.getPublicEvents = async (req, res) => {
  try {
    const { data: dbEvents, error } = await supabase.from('events').select('*').order('id', { ascending: true });
    if (!error && Array.isArray(dbEvents) && dbEvents.length > 0) {
      return res.json({ success: true, data: dbEvents.map(dbToEvent) });
    }
  } catch (e) {
    console.warn('Supabase getPublicEvents fallback:', e.message);
  }

  try {
    const eventsFile = path.join(DATA_DIR, 'events.json');
    if (fs.existsSync(eventsFile)) {
      const data = fs.readFileSync(eventsFile, 'utf-8');
      return res.json({ success: true, data: JSON.parse(data) });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    console.error('Error reading events:', err);
    res.status(500).json({ success: false, message: 'Could not load events' });
  }
};

exports.getRegistrations = async (req, res) => {
  try {
    const { eventId, category, status } = req.query;

    // Query Supabase live
    try {
      let query = supabase
        .from('registrations')
        .select('*, registration_members(*)')
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data: dbData, error: dbError } = await query;
      if (!dbError && Array.isArray(dbData) && dbData.length > 0) {
        return res.json({
          success: true,
          count: dbData.length,
          registrations: dbData
        });
      }
    } catch (dbErr) {
      console.warn('Supabase getRegistrations fallback:', dbErr.message);
    }

    // Fallback to local registrations.json
    const registrations = readRegistrations();
    let filtered = registrations;
    if (eventId) {
      filtered = filtered.filter((r) => r.eventId === eventId);
    }
    if (category) {
      filtered = filtered.filter((r) => r.eventCategory && r.eventCategory.toLowerCase() === category.toLowerCase());
    }
    if (status) {
      filtered = filtered.filter((r) => r.registrationStatus && r.registrationStatus.toLowerCase() === status.toLowerCase());
    }

    res.json({
      success: true,
      count: filtered.length,
      registrations: filtered
    });
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve registrations' });
  }
};

exports.getRegistrationById = async (req, res) => {
  try {
    const id = req.params.id;

    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, registration_members(*)')
        .or(`ticket_code.eq.${id},id.eq.${id}`);

      if (!error && data && data.length > 0) {
        return res.json(data[0]);
      }
    } catch (e) {
      console.warn('Supabase getRegistrationById fallback:', e.message);
    }

    // Fallback to local
    const registrations = readRegistrations();
    const record = registrations.find(
      (r) => (r.registrationId && r.registrationId.toUpperCase() === id.toUpperCase()) ||
             (r.ticketCode && r.ticketCode.toUpperCase() === id.toUpperCase())
    );
    if (!record) {
      return res.status(404).json({ success: false, error: 'Registration record not found' });
    }
    res.json(record);
  } catch (err) {
    console.error('Error fetching registration:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve registration' });
  }
};

// ==================== PUBLIC SPONSOR ENDPOINTS ====================
exports.getActiveSponsors = async (req, res) => {
  try {
    // Try Supabase first
    try {
      const { data: dbSponsors, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(dbSponsors) && dbSponsors.length > 0) {
        const active = dbSponsors.map(dbToSponsor);
        return res.json({ success: true, count: active.length, data: active });
      }
    } catch (e) {
      console.warn('Supabase getActiveSponsors fallback:', e.message);
    }

    const sponsors = readSponsors();
    const active = sponsors.filter(s => s.isActive !== false);
    active.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
    res.json({ success: true, count: active.length, data: active });
  } catch (err) {
    console.error('Error fetching active sponsors:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sponsors' });
  }
};

exports.getPublicSponsorById = async (req, res) => {
  try {
    try {
      const { data: dbSponsor, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', req.params.id)
        .eq('is_active', true)
        .single();

      if (!error && dbSponsor) {
        return res.json({ success: true, data: dbToSponsor(dbSponsor) });
      }
    } catch (e) {
      console.warn('Supabase getPublicSponsorById fallback:', e.message);
    }

    const sponsors = readSponsors();
    const sponsor = sponsors.find(s => s.id === req.params.id && s.isActive !== false);
    if (!sponsor) {
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }
    res.json({ success: true, data: sponsor });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching sponsor' });
  }
};

// ==================== PUBLIC COORDINATOR ENDPOINTS ====================
exports.getActiveCoordinators = async (req, res) => {
  try {
    try {
      const { data: dbCoords, error } = await supabase
        .from('coordinators')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(dbCoords) && dbCoords.length > 0) {
        const active = dbCoords.map(dbToCoordinator);
        return res.json({ success: true, count: active.length, data: active });
      }
    } catch (e) {
      console.warn('Supabase getActiveCoordinators fallback:', e.message);
    }

    const coordinators = readCoordinators();
    const active = coordinators.filter(c => c.isActive !== false);
    active.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
    res.json({ success: true, count: active.length, data: active });
  } catch (err) {
    console.error('Error fetching coordinators:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch coordinators' });
  }
};

exports.getCoordinatorsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    try {
      const { data: dbCoords, error } = await supabase
        .from('coordinators')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(dbCoords) && dbCoords.length > 0) {
        const matching = dbCoords
          .map(dbToCoordinator)
          .filter(c => Array.isArray(c.assignedEvents) && c.assignedEvents.map(e => e.toLowerCase()).includes(eventId.toLowerCase()));

        return res.json({
          success: true,
          eventId,
          count: matching.length,
          data: matching
        });
      }
    } catch (e) {
      console.warn('Supabase getCoordinatorsByEvent fallback:', e.message);
    }

    const coordinators = readCoordinators();
    const matching = coordinators.filter(c => 
      c.isActive !== false && 
      Array.isArray(c.assignedEvents) && 
      c.assignedEvents.map(e => e.toLowerCase()).includes(eventId.toLowerCase())
    );

    matching.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));

    res.json({
      success: true,
      eventId,
      count: matching.length,
      data: matching
    });
  } catch (err) {
    console.error('Error fetching event coordinators:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch coordinators for event' });
  }
};
