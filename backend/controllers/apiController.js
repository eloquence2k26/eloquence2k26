const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const supabase = require('../config/supabase');

let razorpayClient = null;
function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return razorpayClient;
}

// Persistent Data Storage Path
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'registrations.json');
const SPONSORS_FILE = path.join(DATA_DIR, 'sponsors.json');
const COORDINATORS_FILE = path.join(DATA_DIR, 'coordinators.json');
const HOMEPAGE_COORDINATORS_FILE = path.join(DATA_DIR, 'homepage_coordinators.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    isRegistrationClosed: false,
    closedReason: 'Registrations for ELOQUENCE 2026 are officially closed. Thank you for your overwhelming interest!',
    closedAt: null,
    closedBy: null,
    updatedAt: new Date().toISOString()
  }, null, 2), 'utf-8');
}

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return {
        isRegistrationClosed: false,
        closedReason: 'Registrations for ELOQUENCE 2026 are officially closed. Thank you for your overwhelming interest!',
        closedAt: null,
        closedBy: null
      };
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    return {
      isRegistrationClosed: false,
      closedReason: 'Registrations for ELOQUENCE 2026 are officially closed. Thank you for your overwhelming interest!',
      closedAt: null,
      closedBy: null
    };
  }
}

function writeSettings(data) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing settings file:', err);
    return false;
  }
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

function readHomepageCoordinators() {
  try {
    const raw = fs.readFileSync(HOMEPAGE_COORDINATORS_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}

const dbToSponsor = (s) => {
  let website = s.website || '';
  let locationUrl = s.location_url || s.locationUrl || '';

  if (website.includes('::loc::')) {
    const parts = website.split('::loc::');
    website = parts[0] || '';
    locationUrl = parts[1] || '';
  } else if (!locationUrl && (/maps|goo\.gl/i.test(website) || /google\.com\/maps/i.test(website))) {
    locationUrl = website;
    website = '';
  }

  return {
    id: s.id,
    name: s.name,
    companyName: s.company_name || s.companyName || '',
    logo: s.logo || '',
    description: s.description || '',
    website,
    locationUrl,
    contactName: s.contact_name || s.contactName || '',
    
    contactEmail: s.contact_email || s.contactEmail || '',
    contactPhone: s.contact_phone || s.contactPhone || '',
    category: s.category || 'Elite',
    displayOrder: Number(s.display_order ?? s.displayOrder ?? 999),
    isActive: s.is_active !== false && s.isActive !== false,
    createdAt: s.created_at || s.createdAt,
    updatedAt: s.updated_at || s.updatedAt
  };
};

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

const dbToHomepageTeam = (t) => {
  let members = [];
  if (Array.isArray(t.members)) {
    members = t.members;
  } else if (typeof t.members === 'string') {
    try {
      members = JSON.parse(t.members);
    } catch (e) {
      members = [];
    }
  } else if (Array.isArray(t.names)) {
    members = t.names.map(n => typeof n === 'string' ? { name: n, role: '', glow: false } : n);
  }

  const normalizedMembers = (members || []).map(m => {
    if (typeof m === 'string') return { name: m, role: '', glow: false };
    return {
      name: m.name || '',
      role: m.role || '',
      glow: m.glow || false
    };
  });

  return {
    id: t.id,
    role: t.role || '',
    tag: t.tag || 'TEAM',
    iconName: t.icon_name || t.iconName || 'Users',
    tier: t.tier || 'emerald',
    desc: t.description || t.desc || '',
    members: normalizedMembers,
    names: normalizedMembers.map(m => m.name),
    displayOrder: Number(t.display_order ?? t.displayOrder ?? 999),
    isActive: t.is_active !== false && t.isActive !== false,
    createdAt: t.created_at || t.createdAt,
    updatedAt: t.updated_at || t.updatedAt
  };
};

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
  venueImage: e.venue_image || e.venueImage || '',
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

exports.getRegistrationStatus = (req, res) => {
  try {
    const settings = readSettings();
    res.json({
      success: true,
      data: settings,
      isRegistrationClosed: Boolean(settings.isRegistrationClosed),
      closedReason: settings.closedReason || 'Registrations for ELOQUENCE 2026 are officially closed. Thank you for your overwhelming interest!',
      closedAt: settings.closedAt || null
    });
  } catch (err) {
    console.error('Error reading registration status:', err);
    res.status(500).json({ success: false, message: 'Failed to read registration status' });
  }
};

// ── Razorpay Payment Gateway Integration ──────────────────────────────────────

exports.createPaymentOrder = async (req, res) => {
  try {
    const settings = readSettings();
    if (settings.isRegistrationClosed) {
      return res.status(403).json({
        success: false,
        message: settings.closedReason || 'Registrations for ELOQUENCE 2026 are officially closed. No new registrations are accepted.'
      });
    }

    const { currentEvent, fields, totalFee, game } = req.body;

    if (!currentEvent || !fields) {
      return res.status(400).json({
        success: false,
        message: 'Missing event details or participant registration form fields.'
      });
    }

    const amountInRupees = Number(totalFee);
    if (isNaN(amountInRupees) || amountInRupees <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration fee amount.'
      });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay keys are not configured on the backend server.'
      });
    }

    const amountInPaise = Math.round(amountInRupees * 100);
    const shortReceipt = `rcpt_${Date.now().toString().slice(-8)}_${Math.floor(100 + Math.random() * 900)}`;

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: shortReceipt,
      notes: {
        eventId: currentEvent.id || '',
        eventName: currentEvent.name || '',
        fullName: fields.fullName || '',
        email: fields.email || '',
        phone: fields.phone || '',
        game: game || ''
      }
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('[Razorpay createPaymentOrder Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay payment order',
      errorDetails: err.message || err.toString()
    });
  }
};

exports.verifyPaymentAndRegister = async (req, res) => {
  const settings = readSettings();
  if (settings.isRegistrationClosed) {
    return res.status(403).json({
      success: false,
      message: settings.closedReason || 'Registrations for ELOQUENCE 2026 are officially closed. No new registrations are accepted.'
    });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    currentEvent,
    fields,
    totalFee,
    game,
    paymentMethod
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing Razorpay payment verification credentials (order ID, payment ID, or signature).'
    });
  }

  if (!currentEvent || !fields) {
    return res.status(400).json({
      success: false,
      message: 'Missing registration details for payment verification.'
    });
  }

  // 1. Verify Razorpay HMAC SHA256 Signature
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({
      success: false,
      message: 'Server missing Razorpay secret key for verification.'
    });
  }

  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature !== razorpay_signature) {
    console.error('[Razorpay Signature Mismatch]', {
      generated: generatedSignature,
      received: razorpay_signature
    });
    return res.status(400).json({
      success: false,
      message: 'Payment verification failed: Invalid transaction signature.'
    });
  }

  // 2. Generate unique Ticket Code
  const eventCat = currentEvent.category === 'technical' ? 'TCH' : 'NT';
  const ticketCode = `ELQ26-${eventCat}-${Math.floor(10000 + Math.random() * 90000)}`;

  try {
    // Ensure event exists in Supabase events table
    try {
      const { data: existingEv } = await supabase
        .from('events')
        .select('id')
        .eq('id', currentEvent.id)
        .maybeSingle();

      if (!existingEv) {
        await supabase.from('events').insert([{
          id: currentEvent.id,
          number: '99',
          name: currentEvent.name,
          category: currentEvent.category,
          team_size: currentEvent.teamSize || 'Individual',
          min_members: currentEvent.minMembers || 1,
          max_members: currentEvent.maxMembers || 1,
          fee_type: currentEvent.feeType || 'per_head',
          fee_per_head: currentEvent.feePerHead || 50
        }]);
      }
    } catch (eEv) {
      console.warn('Supabase event auto-sync warning:', eEv.message);
    }

    const validTeamMembers = (fields.teamMembers || [])
      .filter(m => (typeof m === 'string' ? m.trim().length > 0 : (m?.name && m.name.trim().length > 0)));

    // 3. Insert into Supabase registrations table
    const paymentMeta = {
      venue: currentEvent.venue || 'CSE Department Labs',
      payment_method: paymentMethod || 'RAZORPAY',
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    };
    const venueSnapshotStr = JSON.stringify(paymentMeta);

    // Supabase requires registration_status: 'active' and non-null college/dept/year
    const regPayload = {
      event_id: currentEvent.id,
      ticket_code: ticketCode,
      team_name: fields.teamName || null,
      full_name: fields.fullName,
      email: fields.email,
      phone: fields.phone,
      college: fields.college || 'C. Abdul Hakeem College of Engg & Tech',
      department: fields.department || 'CSE',
      year: fields.year || '3rd Year',
      members_count: 1 + validTeamMembers.length,
      total_fee: totalFee,
      payment_status: 'paid',
      registration_status: 'active',
      venue_snapshot: venueSnapshotStr,
      timing_snapshot: currentEvent.timing || '10:00 AM – 1:00 PM'
    };

    try {
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .insert([regPayload])
        .select('id');

      if (regError) {
        console.warn('Supabase registration insert warning:', regError.message);
      } else {
        registrationId = regData && regData[0] ? regData[0].id : null;
      }
    } catch (dbErr) {
      console.error('Supabase registration insert exception:', dbErr.message);
    }

    // Insert team members if any
    if (registrationId && validTeamMembers.length > 0) {
      try {
        const membersToInsert = validTeamMembers.map((member, idx) => ({
          registration_id: registrationId,
          member_number: idx + 2,
          member_name: (typeof member === 'string' ? member : (member.name || '')).trim()
        }));

        await supabase.from('registration_members').insert(membersToInsert);
      } catch (memErr) {
        console.warn('Registration members insert warning:', memErr.message);
      }
    }

    // Build structured ticket data for frontend
    const ticketData = {
      ticketCode,
      registrationId: ticketCode,
      eventId: currentEvent.id,
      event_id: currentEvent.id,
      eventName: currentEvent.name,
      category: currentEvent.category,
      eventCategory: currentEvent.category,
      leadName: fields.fullName,
      fullName: fields.fullName,
      college: fields.college,
      department: fields.department,
      email: fields.email,
      phone: fields.phone,
      year: fields.year,
      teamName: fields.teamName || null,
      isTeam: Boolean(currentEvent.isTeam),
      membersCount: 1 + validTeamMembers.length,
      participantCount: 1 + validTeamMembers.length,
      teamMembersList: validTeamMembers.map(m => typeof m === 'string' ? m : m.name),
      totalFee,
      totalAmount: totalFee,
      paymentStatus: 'PAID',
      payment_status: 'paid',
      registrationStatus: 'ACTIVE',
      registration_status: 'active',
      paymentMethod: paymentMethod === 'RAZORPAY_UPI' ? 'RAZORPAY_UPI' : (paymentMethod || 'RAZORPAY'),
      payment_method: paymentMethod === 'RAZORPAY_UPI' ? 'RAZORPAY_UPI' : (paymentMethod || 'RAZORPAY'),
      razorpayPaymentId: razorpay_payment_id,
      razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpay_order_id,
      venue: currentEvent.venue || 'CSE Department Labs',
      timing: currentEvent.timing || '10:00 AM – 1:00 PM',
      game: game || null,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      createdAt: new Date().toISOString()
    };

    // Save backup to local JSON
    try {
      const localRegs = readRegistrations();
      localRegs.push({
        ...ticketData,
        id: registrationId || ticketCode
      });
      writeRegistrations(localRegs);
    } catch (localErr) {
      console.warn('Local backup registration write error:', localErr);
    }

    return res.json({
      success: true,
      message: 'Payment verified and registration successfully confirmed',
      ticketData
    });
  } catch (err) {
    console.error('Registration processing error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error processing registration after payment',
      errorDetails: err.message || err.toString()
    });
  }
};

exports.registerEvent = async (req, res) => {
  const settings = readSettings();
  if (settings.isRegistrationClosed) {
    return res.status(403).json({
      success: false,
      message: settings.closedReason || 'Registrations for ELOQUENCE 2026 are officially closed. No new registrations are accepted.'
    });
  }

  const { currentEvent, fields, totalFee } = req.body;
  
  if (!currentEvent || !fields) {
    return res.status(400).json({ success: false, message: 'Missing required data' });
  }

  // Generate a mock ticket code
  const ticketCode = `ELQ26-${currentEvent.category === 'technical' ? 'TCH' : 'NT'}-${Math.floor(10000 + Math.random() * 90000)}`;

  try {
    // 0. Ensure event exists in database before registration foreign key constraint
    const { data: existingEv } = await supabase.from('events').select('id').eq('id', currentEvent.id).maybeSingle();
    if (!existingEv) {
      await supabase.from('events').insert([{
        id: currentEvent.id,
        number: '99',
        name: currentEvent.name,
        category: currentEvent.category,
        team_size: currentEvent.teamSize || 'Individual',
        min_members: currentEvent.minMembers || 1,
        max_members: currentEvent.maxMembers || 1,
        fee_type: currentEvent.feeType || 'per_head',
        fee_per_head: currentEvent.feePerHead || 50
      }]);
    }

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
  let localEvents = [];
  try {
    const eventsFile = path.join(DATA_DIR, 'events.json');
    if (fs.existsSync(eventsFile)) {
      localEvents = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
    }
  } catch (e) {}

  try {
    const { data: dbEvents, error } = await supabase.from('events').select('*').order('id', { ascending: true });
    if (!error && Array.isArray(dbEvents) && dbEvents.length > 0) {
      const merged = dbEvents.map(dbToEvent).map(e => {
        const local = localEvents.find(l => l.id === e.id);
        return {
          ...e,
          venueImage: e.venueImage || (local ? (local.venueImage || local.venue_image) : '') || ''
        };
      });
      return res.json({ success: true, data: merged });
    }
  } catch (e) {
    console.warn('Supabase getPublicEvents fallback:', e.message);
  }

  res.json({ success: true, data: localEvents });
};

// Helper to enrich a database registration with parsed venue_snapshot metadata (Razorpay info)
const enrichRegistrationRecord = (r) => {
  if (!r) return r;
  const copy = { ...r };

  // Harmonize camelCase and snake_case defaults
  copy.fullName = copy.full_name || copy.fullName;
  copy.ticketCode = copy.ticket_code || copy.ticketCode || copy.registrationId || copy.id;
  copy.registrationId = copy.ticketCode;
  copy.eventId = copy.event_id || copy.eventId;
  copy.teamName = copy.team_name || copy.teamName;
  copy.totalAmount = Number(copy.total_fee || copy.totalAmount || copy.total_fee || 0);
  copy.totalFee = copy.totalAmount;
  copy.paymentStatus = (copy.payment_status || copy.paymentStatus || 'PENDING').toUpperCase();
  copy.registrationStatus = (copy.registration_status || copy.registrationStatus || 'ACTIVE').toUpperCase();
  copy.paymentMethod = copy.payment_method || copy.paymentMethod || 'ONLINE';

  if (copy.venue_snapshot && typeof copy.venue_snapshot === 'string' && copy.venue_snapshot.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(copy.venue_snapshot);
      if (parsed.payment_method) {
        copy.payment_method = parsed.payment_method;
        copy.paymentMethod = parsed.payment_method;
      }
      if (parsed.razorpay_payment_id) {
        copy.razorpay_payment_id = parsed.razorpay_payment_id;
        copy.razorpayPaymentId = parsed.razorpay_payment_id;
      }
      if (parsed.razorpay_order_id) {
        copy.razorpay_order_id = parsed.razorpay_order_id;
        copy.razorpayOrderId = parsed.razorpay_order_id;
      }
      if (parsed.venue) {
        copy.venue = parsed.venue;
      }
    } catch (e) {
      // Not JSON or parse error, keep venue_snapshot as venue string
    }
  }

  return copy;
};

exports.getRegistrations = async (req, res) => {
  try {
    const { eventId, category, status } = req.query;

    let dbRegistrations = [];
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
      if (!dbError && Array.isArray(dbData)) {
        dbRegistrations = dbData.map(enrichRegistrationRecord);
      }
    } catch (dbErr) {
      console.warn('Supabase getRegistrations fallback:', dbErr.message);
    }

    // Read local fallback registrations
    const localRegistrations = readRegistrations().map(enrichRegistrationRecord);

    // Merge Supabase and local registrations by unique ticket code
    const mergedMap = new Map();

    for (const r of dbRegistrations) {
      const key = (r.ticket_code || r.ticketCode || r.id || '').toUpperCase();
      if (key) mergedMap.set(key, r);
    }

    for (const loc of localRegistrations) {
      const key = (loc.ticketCode || loc.ticket_code || loc.registrationId || loc.id || '').toUpperCase();
      if (!key) continue;

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        mergedMap.set(key, {
          ...loc,
          ...existing,
          payment_method: existing.payment_method || loc.payment_method || loc.paymentMethod || 'ONLINE',
          paymentMethod: existing.paymentMethod || loc.paymentMethod || loc.payment_method || 'ONLINE',
          razorpay_payment_id: existing.razorpay_payment_id || loc.razorpay_payment_id || loc.razorpayPaymentId,
          razorpayPaymentId: existing.razorpayPaymentId || loc.razorpayPaymentId || loc.razorpay_payment_id,
          razorpay_order_id: existing.razorpay_order_id || loc.razorpay_order_id || loc.razorpayOrderId,
          razorpayOrderId: existing.razorpayOrderId || loc.razorpayOrderId || loc.razorpay_order_id,
          eventName: existing.eventName || loc.eventName,
          eventId: existing.event_id || existing.eventId || loc.eventId || loc.event_id,
          event_id: existing.event_id || existing.eventId || loc.eventId || loc.event_id
        });
      } else {
        mergedMap.set(key, loc);
      }
    }

    let allRegistrations = Array.from(mergedMap.values());

    // Sort descending by creation date
    allRegistrations.sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Apply optional query filters
    if (eventId) {
      allRegistrations = allRegistrations.filter(r => (r.event_id === eventId || r.eventId === eventId));
    }
    if (category) {
      allRegistrations = allRegistrations.filter(r => {
        const cat = r.eventCategory || r.category || '';
        return cat.toLowerCase() === category.toLowerCase();
      });
    }
    if (status) {
      allRegistrations = allRegistrations.filter(r => {
        const st = r.payment_status || r.paymentStatus || r.registration_status || r.registrationStatus || '';
        return st.toLowerCase() === status.toLowerCase();
      });
    }

    return res.json({
      success: true,
      count: allRegistrations.length,
      registrations: allRegistrations
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
        const enriched = enrichRegistrationRecord(data[0]);
        // Also check local for additional fields
        const local = readRegistrations().find(
          r => (r.ticketCode && r.ticketCode.toUpperCase() === id.toUpperCase()) ||
               (r.ticket_code && r.ticket_code.toUpperCase() === id.toUpperCase())
        );
        return res.json(local ? { ...local, ...enriched } : enriched);
      }
    } catch (e) {
      console.warn('Supabase getRegistrationById fallback:', e.message);
    }

    // Fallback to local
    const registrations = readRegistrations();
    const record = registrations.find(
      (r) => (r.registrationId && r.registrationId.toUpperCase() === id.toUpperCase()) ||
             (r.ticketCode && r.ticketCode.toUpperCase() === id.toUpperCase()) ||
             (r.ticket_code && r.ticket_code.toUpperCase() === id.toUpperCase()) ||
             (r.id && r.id.toUpperCase() === id.toUpperCase())
    );
    if (!record) {
      return res.status(404).json({ success: false, error: 'Registration record not found' });
    }
    res.json(enrichRegistrationRecord(record));
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

// ==================== PUBLIC STUDENT COORDINATORS (LEADERSHIP) ====================
exports.getStudentCoordinators = async (req, res) => {
  try {
    const { data: dbCoords, error } = await supabase
      .from('coordinators')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && Array.isArray(dbCoords) && dbCoords.length > 0) {
      const webTeamCoords = dbCoords.filter(c => 
        (Array.isArray(c.assigned_events) && c.assigned_events.includes('web-team')) ||
        (c.role && c.role.toLowerCase().includes('website'))
      );
      const mainTeamCoords = dbCoords.filter(c => 
        (Array.isArray(c.assigned_events) && c.assigned_events.includes('main-coordinators')) ||
        (c.role && c.role.toLowerCase().includes('main coordinator'))
      );

      const result = [
        {
          id: 'web-team',
          role: 'WEBSITE DEVELOPMENT TEAM',
          tag: 'WEB & TECH CREW',
          iconName: 'Code',
          tier: 'cyan',
          desc: 'Architecting the official Eloquence 2026 digital platform, registration engine, and interactive cyber experience.',
          names: webTeamCoords.length > 0 ? webTeamCoords.map(c => c.name) : [
            "SYED MUSTHAFA S", "MOHAMMED AYAZ A", "SHAWOOR SAQIB SK", "FAAZIL AMMAR", "SHAHID AHAMED VS", "MOHAMMED SAAD V"
          ]
        },
        {
          id: 'main-coordinators',
          role: 'MAIN COORDINATOR TEAM',
          tag: 'STUDENT LEADERSHIP',
          iconName: 'Users',
          tier: 'emerald',
          desc: 'Leading symposium logistics, operations, participant management, and orchestrating Eloquence 2026.',
          names: mainTeamCoords.length > 0 ? mainTeamCoords.map(c => c.name) : [
            "SAMNESH S", "HARISH KUMAR RG", "SHARMILA Y", "MADHUMITHA R"
          ]
        }
      ];
      return res.json({ success: true, data: result });
    }
  } catch (e) {
    console.warn('Supabase getStudentCoordinators fallback:', e.message);
  }

  // Fallback to static data
  try {
    const fallbackPath = path.join(DATA_DIR, 'studentCoordinators.json');
    if (fs.existsSync(fallbackPath)) {
      const raw = fs.readFileSync(fallbackPath, 'utf-8');
      return res.json({ success: true, data: JSON.parse(raw) });
    }
  } catch (err) {}

  res.json({ success: true, data: [] });
};

// ==================== PUBLIC HOMEPAGE STUDENT COORDINATORS ====================
exports.getPublicHomepageCoordinators = async (req, res) => {
  try {
    try {
      const { data: dbTeams, error } = await supabase
        .from('homepage_coordinators')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(dbTeams) && dbTeams.length > 0) {
        const active = dbTeams.map(dbToHomepageTeam);
        return res.json({ success: true, count: active.length, data: active });
      }
    } catch (e) {
      console.warn('Supabase getPublicHomepageCoordinators fallback:', e.message);
    }

    const teams = readHomepageCoordinators();
    const active = teams.filter(t => t.isActive !== false);
    active.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
    res.json({ success: true, count: active.length, data: active });
  } catch (err) {
    console.error('Error fetching homepage coordinator teams:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch homepage coordinator teams' });
  }
};

// ── Participant List Dispatch (Supabase Live) ──────────────────────────────────────────────────
const DISPATCHES_FILE = path.join(DATA_DIR, 'dispatches.json');

function readDispatches() {
  try {
    const raw = fs.readFileSync(DISPATCHES_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}

function writeDispatches(data) {
  try {
    fs.writeFileSync(DISPATCHES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

const dbToDispatch = (d) => ({
  id: d.id,
  eventId: d.event_id || d.eventId,
  eventName: d.event_name || d.eventName,
  coordinatorId: d.coordinator_id || d.coordinatorId || null,
  coordinatorName: d.coordinator_name || d.coordinatorName,
  dispatchedBy: d.dispatched_by || 'Admin',
  sentAt: d.sent_at || d.sentAt || d.created_at
});

exports.sendParticipantList = async (req, res) => {
  try {
    const { eventId, eventName, coordinatorId, coordinatorName } = req.body;
    if (!eventId || !coordinatorName) {
      return res.status(400).json({ success: false, message: 'Event ID and Coordinator Name are required' });
    }

    const dispatchId = Date.now().toString();
    const now = new Date().toISOString();
    const dbPayload = {
      id: dispatchId,
      event_id: eventId,
      event_name: eventName || eventId,
      coordinator_name: coordinatorName,
      sent_at: now
    };

    let dispatchData = null;
    try {
      const { data, error } = await supabase.from('dispatches').insert([dbPayload]).select();
      if (!error && data && data.length > 0) {
        dispatchData = dbToDispatch(data[0]);
      }
    } catch (dbErr) {
      console.warn('Supabase sendParticipantList fallback:', dbErr.message);
    }

    const formatted = dispatchData || dbToDispatch(dbPayload);

    // Sync to local file
    const dispatches = readDispatches();
    dispatches.push(formatted);
    writeDispatches(dispatches);

    res.json({
      success: true,
      message: `Participant list for "${eventName || eventId}" sent to ${coordinatorName} successfully in database!`,
      dispatch: formatted
    });
  } catch (err) {
    console.error('Error sending participant list:', err);
    res.status(500).json({ success: false, message: 'Failed to send participant list' });
  }
};

exports.getDispatches = async (req, res) => {
  try {
    try {
      const { data, error } = await supabase.from('dispatches').select('*').order('sent_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json({ success: true, data: data.map(dbToDispatch) });
      }
    } catch (e) {
      console.warn('Supabase getDispatches fallback:', e.message);
    }

    const dispatches = readDispatches();
    res.json({ success: true, data: dispatches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch dispatches' });
  }
};

exports.updateDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { coordinatorName, eventName } = req.body;
    const updatePayload = { updated_at: new Date().toISOString() };
    if (coordinatorName) updatePayload.coordinator_name = coordinatorName;
    if (eventName) updatePayload.event_name = eventName;

    try {
      await supabase.from('dispatches').update(updatePayload).eq('id', id);
    } catch (dbErr) {
      console.warn('Supabase updateDispatch fallback:', dbErr.message);
    }

    let dispatches = readDispatches();
    const index = dispatches.findIndex(d => d.id === id);
    if (index !== -1) {
      if (coordinatorName) dispatches[index].coordinatorName = coordinatorName;
      if (eventName) dispatches[index].eventName = eventName;
      dispatches[index].updatedAt = new Date().toISOString();
      writeDispatches(dispatches);
    }

    res.json({ success: true, message: 'Sent dispatch updated successfully in database', data: { id, ...updatePayload } });
  } catch (err) {
    console.error('Error updating dispatch:', err);
    res.status(500).json({ success: false, message: 'Failed to update dispatch' });
  }
};

exports.deleteDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await supabase.from('dispatches').delete().eq('id', id);
    } catch (dbErr) {
      console.warn('Supabase deleteDispatch fallback:', dbErr.message);
    }

    let dispatches = readDispatches();
    const filtered = dispatches.filter(d => d.id !== id);
    writeDispatches(filtered);

    res.json({ success: true, message: 'Sent dispatch deleted and revoked from database successfully' });
  } catch (err) {
    console.error('Error deleting dispatch:', err);
    res.status(500).json({ success: false, message: 'Failed to delete dispatch' });
  }
};
