const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const { broadcastRegistrationUpdate } = require('../utils/websocket');

const usersFilePath = path.join(__dirname, '../data/users.json');
const rolesFilePath = path.join(__dirname, '../data/roles.json');
const eventsFilePath = path.join(__dirname, '../data/events.json');
const sponsorsFilePath = path.join(__dirname, '../data/sponsors.json');
const coordinatorsFilePath = path.join(__dirname, '../data/coordinators.json');
const homepageCoordinatorsFilePath = path.join(__dirname, '../data/homepage_coordinators.json');
const frontendStudentCoordinatorsFilePath = path.join(__dirname, '../../frontend/src/data/studentCoordinators.json');
const registrationsFilePath = path.join(__dirname, '../data/registrations.json');
const settingsFilePath = path.join(__dirname, '../data/settings.json');

function getSettingsData() {
  try {
    if (!fs.existsSync(settingsFilePath)) {
      const defaultSettings = {
        isRegistrationClosed: false,
        closedReason: 'Registrations for ELOQUENCE 2026 are officially closed. Thank you for your overwhelming interest!',
        closedAt: null,
        closedBy: null,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
      return defaultSettings;
    }
    const raw = fs.readFileSync(settingsFilePath, 'utf-8');
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

function saveSettingsData(data) {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}


// ==================== DATA MAPPER HELPERS ====================
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

const sponsorToDb = (s) => {
  const website = s.website || '';
  const locationUrl = s.locationUrl || s.location_url || '';
  let dbWebsite = website;
  if (website && locationUrl) {
    dbWebsite = `${website}::loc::${locationUrl}`;
  } else if (!website && locationUrl) {
    dbWebsite = locationUrl;
  }

  return {
    id: s.id,
    name: s.name,
    company_name: s.companyName || s.company_name || '',
    logo: s.logo || '',
    description: s.description || '',
    website: dbWebsite,
    contact_name: s.contactName || s.contact_name || '',
    contact_email: s.contactEmail || s.contact_email || '',
    contact_phone: s.contactPhone || s.contact_phone || '',
    category: s.category || 'Elite',
    display_order: Number(s.displayOrder ?? s.display_order ?? 999),
    is_active: s.isActive !== false && s.is_active !== false,
    updated_at: new Date().toISOString()
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

const coordinatorToDb = (c) => ({
  id: c.id,
  name: c.name,
  phone: c.phone || '',
  whatsapp: c.whatsapp || '',
  email: c.email || '',
  department: c.department || '',
  year: c.year || '',
  role: c.role || 'Lead Coordinator',
  assigned_events: Array.isArray(c.assignedEvents) ? c.assignedEvents : (Array.isArray(c.assigned_events) ? c.assigned_events : []),
  display_order: Number(c.displayOrder ?? c.display_order ?? 999),
  is_active: c.isActive !== false && c.is_active !== false,
  updated_at: new Date().toISOString()
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

const homepageTeamToDb = (t) => {
  return {
    id: t.id,
    role: t.role,
    tag: t.tag || 'TEAM',
    icon_name: t.iconName || 'Users',
    tier: t.tier || 'emerald',
    description: t.desc || '',
    members: t.members || [],
    display_order: Number(t.displayOrder ?? 999),
    is_active: t.isActive !== false,
    updated_at: new Date().toISOString()
  };
};

// ==================== LOCAL JSON FALLBACK HELPERS ====================
const getUsersData = () => {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveUsersData = (users) => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing users.json:', err);
  }
};

const getRolesData = () => {
  try {
    const data = fs.readFileSync(rolesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveRolesData = (roles) => {
  try {
    fs.writeFileSync(rolesFilePath, JSON.stringify(roles, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing roles.json:', err);
  }
};

const getEventsData = () => {
  try {
    const data = fs.readFileSync(eventsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveEventsData = (events) => {
  try {
    fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing events.json:', err);
  }
};

const getSponsorsData = () => {
  try {
    const data = fs.readFileSync(sponsorsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
};

const saveSponsorsData = (sponsors) => {
  try {
    fs.writeFileSync(sponsorsFilePath, JSON.stringify(sponsors, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing sponsors.json:', err);
    return false;
  }
};

const getCoordinatorsData = () => {
  try {
    const data = fs.readFileSync(coordinatorsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
};

const saveCoordinatorsData = (coordinators) => {
  try {
    fs.writeFileSync(coordinatorsFilePath, JSON.stringify(coordinators, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing coordinators.json:', err);
    return false;
  }
};

const getHomepageCoordinatorsData = () => {
  try {
    const data = fs.readFileSync(homepageCoordinatorsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
};

const saveHomepageCoordinatorsData = (teams) => {
  try {
    fs.writeFileSync(homepageCoordinatorsFilePath, JSON.stringify(teams, null, 2), 'utf8');
    if (fs.existsSync(frontendStudentCoordinatorsFilePath)) {
      try {
        const activeTeamsForFrontend = teams
          .filter(t => t.isActive !== false)
          .map(t => ({
            id: t.id,
            role: t.role,
            tag: t.tag,
            iconName: t.iconName,
            tier: t.tier,
            desc: t.desc,
            names: (t.members || []).map(m => typeof m === 'string' ? m : m.name),
            members: t.members || []
          }));
        fs.writeFileSync(frontendStudentCoordinatorsFilePath, JSON.stringify(activeTeamsForFrontend, null, 2), 'utf8');
      } catch (fErr) {
        console.warn('Sync to frontend studentCoordinators.json skipped:', fErr.message);
      }
    }
    return true;
  } catch (err) {
    console.error('Error writing homepage_coordinators.json:', err);
    return false;
  }
};

const getRegistrationsData = () => {
  try {
    const data = fs.readFileSync(registrationsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
};

const saveRegistrationsData = (registrations) => {
  try {
    fs.writeFileSync(registrationsFilePath, JSON.stringify(registrations, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing registrations.json:', err);
    return false;
  }
};

// ==================== AUTH & TOKEN ====================
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (!error && dbUser) {
      const token = jwt.sign(
        { id: dbUser.id, username: dbUser.username, role: dbUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      return res.json({ success: true, token, user: { username: dbUser.username, role: dbUser.role } });
    }
  } catch (e) {
    console.warn('Supabase auth fallback:', e.message);
  }

  const users = getUsersData();
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ success: true, token, user: { username: user.username, role: user.role } });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
};

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.requireWriteAccess = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role.includes('lead') || role === 'lead coordinator' || role === 'lead_coordinator') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Lead Coordinator accounts have read-only view access. Add, edit, and delete actions are not allowed.'
    });
  }
  next();
};

exports.requireAdminOrSuperadmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Superadmin and Admin accounts can manage registration portal status.'
    });
  }
  next();
};

// ==================== DASHBOARD STATS ====================
exports.getDashboardData = async (req, res) => {
  try {
    let registrations = getRegistrationsData();
    let sponsors = getSponsorsData();
    let coordinators = getCoordinatorsData();
    let homepageTeams = getHomepageCoordinatorsData();
    let events = getEventsData();

    try {
      const [regRes, spRes, coRes, evRes, hpRes] = await Promise.all([
        supabase.from('registrations').select('*'),
        supabase.from('sponsors').select('*'),
        supabase.from('coordinators').select('*'),
        supabase.from('events').select('*'),
        supabase.from('homepage_coordinators').select('*')
      ]);

      let dbRegs = [];
      if (regRes.data && regRes.data.length > 0) {
        dbRegs = regRes.data.map(r => {
          const copy = { ...r };
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
            } catch (e) {}
          }
          return copy;
        });
      }

      const localRegs = getRegistrationsData();
      const mergedMap = new Map();

      for (const r of dbRegs) {
        const k = (r.ticket_code || r.ticketCode || r.id || '').toUpperCase();
        if (k) mergedMap.set(k, r);
      }

      for (const loc of localRegs) {
        const k = (loc.ticketCode || loc.ticket_code || loc.registrationId || loc.id || '').toUpperCase();
        if (!k) continue;
        if (mergedMap.has(k)) {
          const existing = mergedMap.get(k);
          mergedMap.set(k, {
            ...loc,
            ...existing,
            payment_method: existing.payment_method || loc.payment_method || loc.paymentMethod || 'ONLINE',
            paymentMethod: existing.paymentMethod || loc.paymentMethod || loc.payment_method || 'ONLINE',
            razorpay_payment_id: existing.razorpay_payment_id || loc.razorpay_payment_id || loc.razorpayPaymentId,
            razorpayPaymentId: existing.razorpayPaymentId || loc.razorpayPaymentId || loc.razorpay_payment_id,
            razorpay_order_id: existing.razorpay_order_id || loc.razorpay_order_id || loc.razorpayOrderId,
            razorpayOrderId: existing.razorpayOrderId || loc.razorpayOrderId || loc.razorpay_order_id
          });
        } else {
          mergedMap.set(k, loc);
        }
      }

      registrations = Array.from(mergedMap.values());
      if (spRes.data && spRes.data.length > 0) sponsors = spRes.data.map(dbToSponsor);
      if (coRes.data && coRes.data.length > 0) coordinators = coRes.data.map(dbToCoordinator);
      if (evRes.data && evRes.data.length > 0) events = evRes.data.map(dbToEvent);
      if (hpRes.data && hpRes.data.length > 0) homepageTeams = hpRes.data.map(dbToHomepageTeam);
    } catch (dbErr) {
      console.warn('Dashboard live metrics query error fallback:', dbErr.message);
    }

    const isOnlineRecord = (r) => (r.payment_method || r.paymentMethod || '').toUpperCase() !== 'ON_SITE_DESK';
    const onlineRegs = registrations.filter(isOnlineRecord);
    const offlineRegs = registrations.filter(r => !isOnlineRecord(r));

    const totalRevenue = registrations.reduce((sum, r) => sum + (Number(r.total_fee || r.totalAmount || r.total_amount) || 0), 0);
    const onlineRevenue = onlineRegs.reduce((sum, r) => sum + (Number(r.total_fee || r.totalAmount || r.total_amount) || 0), 0);
    const offlineRevenue = offlineRegs.reduce((sum, r) => sum + (Number(r.total_fee || r.totalAmount || r.total_amount) || 0), 0);
    const activeSponsors = sponsors.filter(s => s.isActive !== false);
    const activeCoordinators = coordinators.filter(c => c.isActive !== false);
    const activeHomepageTeams = homepageTeams.filter(t => t.isActive !== false);

    const recentRegistrations = [...registrations]
      .reverse()
      .slice(0, 8)
      .map(r => ({
        id: r.ticket_code || r.ticketCode || r.registrationId || r.id,
        name: r.full_name || r.fullName || 'Anonymous',
        event: r.event_id || r.eventName || 'General Registration',
        mode: isOnlineRecord(r) ? 'Online' : 'Offline Desk',
        paymentMethod: r.payment_method || r.paymentMethod || (isOnlineRecord(r) ? 'ONLINE' : 'ON_SITE_DESK'),
        paymentStatus: r.payment_status || r.paymentStatus || 'PAID',
        razorpayPaymentId: r.razorpay_payment_id || r.razorpayPaymentId || '',
        fee: Number(r.total_fee || r.totalAmount || r.total_amount) || 0,
        phone: r.phone || '',
        college: r.college || '',
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : (r.createdAtFormatted || 'Recent')
      }));

    res.json({
      success: true,
      data: {
        stats: {
          totalRegistrations: registrations.length,
          revenue: totalRevenue,
          onlineRegistrations: onlineRegs.length,
          onlineRevenue: onlineRevenue,
          offlineRegistrations: offlineRegs.length,
          offlineRevenue: offlineRevenue,
          eventsActive: events.length || 12,
          totalSponsors: sponsors.length,
          activeSponsors: activeSponsors.length,
          totalCoordinators: coordinators.length,
          activeCoordinators: activeCoordinators.length,
          totalHomepageTeams: homepageTeams.length,
          activeHomepageTeams: activeHomepageTeams.length
        },
        recentRegistrations
      }
    });
  } catch (err) {
    console.error('Error in getDashboardData:', err);
    res.status(500).json({ success: false, message: 'Failed to compute dashboard metrics' });
  }
};

// ==================== USER MANAGEMENT ====================
exports.getUsers = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const { data: dbUsers, error } = await supabase.from('users').select('id, username, role').order('id', { ascending: true });
    if (!error && Array.isArray(dbUsers) && dbUsers.length > 0) {
      return res.json({ success: true, data: dbUsers });
    }
  } catch (e) {
    console.warn('Supabase getUsers fallback:', e.message);
  }

  const users = getUsersData().map(u => ({ id: u.id, username: u.username, role: u.role }));
  res.json({ success: true, data: users });
};

exports.createUser = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  const users = getUsersData();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ success: false, message: 'Username already exists' });
  }

  const newUser = { id: Date.now(), username, password, role };

  try {
    const { error: dbError } = await supabase.from('users').insert([newUser]);
    if (dbError) console.error('Supabase createUser error:', dbError.message);
  } catch (dbErr) {
    console.error('Supabase createUser exception:', dbErr.message);
  }

  users.push(newUser);
  saveUsersData(users);

  res.json({ success: true, message: 'User created successfully', data: { id: newUser.id, username: newUser.username, role: newUser.role } });
};

exports.updateUser = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  const { username, password, role } = req.body;
  const userId = parseInt(id, 10);
  
  if (!username || !role) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  const users = getUsersData();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex !== -1 && users[userIndex].role === 'superadmin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Cannot modify a superadmin' });
  }

  const updateFields = { username, role, updated_at: new Date().toISOString() };
  if (password) updateFields.password = password;

  try {
    const { error: dbErr } = await supabase.from('users').update(updateFields).eq('id', userId);
    if (dbErr) console.error('Supabase updateUser error:', dbErr.message);
  } catch (e) {
    console.error('Supabase updateUser exception:', e.message);
  }

  if (userIndex !== -1) {
    users[userIndex].username = username;
    users[userIndex].role = role;
    if (password) users[userIndex].password = password;
    saveUsersData(users);
  }

  res.json({ success: true, message: 'User updated successfully', data: { id: userId, username, role } });
};

exports.deleteUser = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  const userId = parseInt(id, 10);
  const users = getUsersData();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex !== -1) {
    if (users[userIndex].username === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete the primary admin account' });
    }
    if (users[userIndex].role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot delete a superadmin' });
    }
    if (users[userIndex].id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    users.splice(userIndex, 1);
    saveUsersData(users);
  }

  try {
    const { error: dbErr } = await supabase.from('users').delete().eq('id', userId);
    if (dbErr) console.error('Supabase deleteUser error:', dbErr.message);
  } catch (e) {
    console.error('Supabase deleteUser exception:', e.message);
  }

  res.json({ success: true, message: 'User deleted successfully' });
};

// ==================== ROLE MANAGEMENT ====================
exports.getRoles = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const { data: dbRoles, error } = await supabase.from('roles').select('*').order('id', { ascending: true });
    if (!error && Array.isArray(dbRoles) && dbRoles.length > 0) {
      return res.json({ success: true, data: dbRoles });
    }
  } catch (e) {
    console.warn('Supabase getRoles fallback:', e.message);
  }

  const roles = getRolesData();
  res.json({ success: true, data: roles });
};

exports.createRole = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Role name required' });
  }

  const normalizedName = name.toLowerCase().trim();
  const roles = getRolesData();

  if (roles.find(r => r.name === normalizedName)) {
    return res.status(400).json({ success: false, message: 'Role already exists' });
  }

  const newRole = { id: Math.floor(Math.random() * 900000) + 100, name: normalizedName };

  try {
    const { error: dbErr } = await supabase.from('roles').insert([newRole]);
    if (dbErr) console.error('Supabase createRole error:', dbErr.message);
  } catch (e) {
    console.error('Supabase createRole exception:', e.message);
  }

  roles.push(newRole);
  saveRolesData(roles);

  res.json({ success: true, message: 'Role created successfully', data: newRole });
};

exports.updateRole = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  const { name } = req.body;
  const roleId = parseInt(id, 10) || id;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Role name required' });
  }

  const roles = getRolesData();
  const roleIndex = roles.findIndex(r => r.id === roleId);

  const normalizedName = name.toLowerCase().trim();

  try {
    const { error: dbErr } = await supabase.from('roles').update({ name: normalizedName }).eq('id', roleId);
    if (dbErr) console.error('Supabase updateRole error:', dbErr.message);
  } catch (e) {
    console.error('Supabase updateRole exception:', e.message);
  }

  if (roleIndex !== -1) {
    const oldRoleName = roles[roleIndex].name;
    roles[roleIndex].name = normalizedName;
    saveRolesData(roles);

    if (oldRoleName !== normalizedName) {
      const users = getUsersData();
      let updated = false;
      users.forEach(u => {
        if (u.role === oldRoleName) {
          u.role = normalizedName;
          updated = true;
        }
      });
      if (updated) saveUsersData(users);
    }
  }

  res.json({ success: true, message: 'Role updated successfully', data: { id: roleId, name: normalizedName } });
};

exports.deleteRole = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  const roleId = parseInt(id, 10) || id;
  const roles = getRolesData();
  const roleIndex = roles.findIndex(r => r.id === roleId);

  if (roleIndex !== -1) {
    const roleName = roles[roleIndex].name;
    if (roleName === 'superadmin' || roleName === 'admin') {
      return res.status(400).json({ success: false, message: `Cannot delete primary system role '${roleName}'` });
    }
    roles.splice(roleIndex, 1);
    saveRolesData(roles);
  }

  try {
    const { error: dbErr } = await supabase.from('roles').delete().eq('id', roleId);
    if (dbErr) console.error('Supabase deleteRole error:', dbErr.message);
  } catch (e) {
    console.error('Supabase deleteRole exception:', e.message);
  }

  res.json({ success: true, message: 'Role deleted successfully' });
};

// ==================== EVENT MANAGEMENT ====================
exports.getEvents = async (req, res) => {
  const localEvents = getEventsData();
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
    console.warn('Supabase getEvents fallback:', e.message);
  }

  res.json({ success: true, data: localEvents });
};

const saveBase64ImageIfPresent = (imageStr, prefix = 'event') => {
  if (!imageStr || typeof imageStr !== 'string') return imageStr || '';
  const trimmed = imageStr.trim();
  if (!trimmed.startsWith('data:image/')) return trimmed;

  try {
    const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return trimmed;
    const mimeType = matches[1].toLowerCase();
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : (mimeType.includes('webp') ? 'webp' : (mimeType.includes('svg') ? 'svg' : 'png'));
    const safeName = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
    const imageBuffer = Buffer.from(matches[2], 'base64');

    const frontendPublicEventsDir = path.join(__dirname, '../../frontend/public/events');
    const localUploadsDir = path.join(__dirname, '../uploads');

    if (!fs.existsSync(frontendPublicEventsDir)) {
      try { fs.mkdirSync(frontendPublicEventsDir, { recursive: true }); } catch (e) {}
    }
    if (fs.existsSync(frontendPublicEventsDir)) {
      fs.writeFileSync(path.join(frontendPublicEventsDir, safeName), imageBuffer);
    }
    if (!fs.existsSync(localUploadsDir)) {
      try { fs.mkdirSync(localUploadsDir, { recursive: true }); } catch (e) {}
    }
    if (fs.existsSync(localUploadsDir)) {
      fs.writeFileSync(path.join(localUploadsDir, safeName), imageBuffer);
    }
    return `/events/${safeName}`;
  } catch (e) {
    console.error('Error saving base64 image:', e);
    return trimmed;
  }
};

exports.createEvent = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const {
    id,
    name,
    alias,
    subtitle,
    category,
    venue,
    venueImage,
    timing,
    fee,
    feePerHead,
    feeType,
    teamSize,
    tag,
    description,
    image,
    rules,
    rounds,
    guidelines,
    highlights
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Event name is required' });
  }

  const events = getEventsData();
  const cat = (category || 'technical').toLowerCase();
  const catPrefix = cat === 'technical' ? 'tech' : 'nontech';

  let eventId = id && id.trim() ? id.trim().toLowerCase().replace(/\s+/g, '-') : null;
  if (!eventId) {
    const existingCatEvents = events.filter(e => e.id.startsWith(catPrefix));
    const nextNum = String(existingCatEvents.length + 1).padStart(2, '0');
    eventId = `${catPrefix}-${nextNum}`;
  }

  const parsedFeePerHead = feePerHead !== undefined && feePerHead !== '' 
    ? Number(feePerHead) 
    : (fee && fee.match(/\d+/) ? Number(fee.match(/\d+/)[0]) : 50);

  const newEvent = {
    id: eventId,
    number: String(events.length + 1).padStart(2, '0'),
    name: name.trim(),
    alias: alias ? alias.trim() : name.trim(),
    subtitle: subtitle ? subtitle.trim() : '',
    category: cat,
    teamSize: teamSize ? teamSize.trim() : 'Individual',
    minMembers: 1,
    maxMembers: teamSize && (teamSize.toLowerCase().includes('team') || teamSize.toLowerCase().includes('max') || teamSize.toLowerCase().includes('squad')) ? 4 : 1,
    fee: fee ? fee.trim() : '₹50 per head',
    feePerHead: isNaN(parsedFeePerHead) ? 50 : parsedFeePerHead,
    feeType: feeType || 'per_head',
    isTeam: teamSize ? (teamSize.toLowerCase().includes('team') || teamSize.toLowerCase().includes('max') || teamSize.toLowerCase().includes('squad')) : false,
    tag: tag ? tag.trim() : (cat === 'technical' ? 'Technical Presentation' : 'Non-Technical Event'),
    venue: venue ? venue.trim() : 'CSE Department',
    venueImage: venueImage ? venueImage.trim() : '',
    timing: timing ? timing.trim() : '10:00 AM – 01:00 PM',
    description: description ? description.trim() : '',
    image: image ? image.trim() : '',
    rules: Array.isArray(rules) && rules.length > 0 ? rules : [],
    rounds: Array.isArray(rounds) && rounds.length > 0 ? rounds : [],
    guidelines: Array.isArray(guidelines) && guidelines.length > 0 ? guidelines : [],
    highlights: Array.isArray(highlights) && highlights.length > 0 ? highlights : []
  };

  try {
    const dbPayload = {
      id: newEvent.id,
      number: newEvent.number,
      name: newEvent.name,
      alias: newEvent.alias,
      subtitle: newEvent.subtitle,
      category: newEvent.category,
      team_size: newEvent.teamSize,
      min_members: newEvent.minMembers,
      max_members: newEvent.maxMembers,
      fee: newEvent.fee,
      fee_per_head: newEvent.feePerHead,
      fee_type: newEvent.feeType,
      is_team: newEvent.isTeam,
      tag: newEvent.tag,
      venue: newEvent.venue,
      venue_image: newEvent.venueImage,
      timing: newEvent.timing,
      description: newEvent.description,
      image: newEvent.image,
      rules: newEvent.rules,
      rounds: newEvent.rounds,
      guidelines: newEvent.guidelines,
      highlights: newEvent.highlights,
      updated_at: new Date().toISOString()
    };
    let { error: dbErr } = await supabase.from('events').upsert([dbPayload], { onConflict: 'id' });
    if (dbErr && dbErr.code === 'PGRST204') {
      delete dbPayload.venue_image;
      const retryRes = await supabase.from('events').upsert([dbPayload], { onConflict: 'id' });
      dbErr = retryRes.error;
    }
    if (dbErr) {
      console.warn('Supabase createEvent warning:', dbErr.message);
    }
  } catch (e) {
    console.warn('Supabase createEvent exception:', e.message);
  }

  const existingIdx = events.findIndex(e => e.id === newEvent.id);
  if (existingIdx !== -1) {
    events[existingIdx] = newEvent;
  } else {
    events.push(newEvent);
  }
  saveEventsData(events);

  res.json({
    success: true,
    message: 'Event created successfully in live database and storage',
    data: newEvent
  });
};

exports.updateEvent = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  const {
    name,
    alias,
    subtitle,
    category,
    venue,
    venueImage,
    timing,
    fee,
    feePerHead,
    feeType,
    teamSize,
    tag,
    description,
    image,
    rules,
    rounds,
    guidelines,
    highlights
  } = req.body;

  const events = getEventsData();
  const eventIndex = events.findIndex(e => e.id === id);

  const parsedFeePerHead = feePerHead !== undefined && feePerHead !== '' 
    ? Number(feePerHead) 
    : (fee && fee.match(/\d+/) ? Number(fee.match(/\d+/)[0]) : undefined);

  const updateFields = {
    updated_at: new Date().toISOString()
  };

  if (name) updateFields.name = name.trim();
  if (alias !== undefined) updateFields.alias = alias.trim();
  if (subtitle !== undefined) updateFields.subtitle = subtitle.trim();
  if (category !== undefined) updateFields.category = category.trim().toLowerCase();
  if (venue !== undefined) updateFields.venue = venue.trim();
  if (venueImage !== undefined) updateFields.venue_image = venueImage ? venueImage.trim() : '';
  if (timing !== undefined) updateFields.timing = timing.trim();
  if (fee !== undefined) updateFields.fee = fee.trim();
  if (parsedFeePerHead !== undefined) updateFields.fee_per_head = parsedFeePerHead;
  if (feeType !== undefined) updateFields.fee_type = feeType;
  if (teamSize !== undefined) {
    updateFields.team_size = teamSize.trim();
    updateFields.is_team = (teamSize.toLowerCase().includes('team') || teamSize.toLowerCase().includes('max') || teamSize.toLowerCase().includes('squad'));
  }
  if (tag !== undefined) updateFields.tag = tag.trim();
  if (description !== undefined) updateFields.description = description.trim();
  if (image !== undefined) updateFields.image = image ? image.trim() : '';
  if (rules !== undefined && Array.isArray(rules)) updateFields.rules = rules;
  if (rounds !== undefined && Array.isArray(rounds)) updateFields.rounds = rounds;
  if (guidelines !== undefined && Array.isArray(guidelines)) updateFields.guidelines = guidelines;
  if (highlights !== undefined && Array.isArray(highlights)) updateFields.highlights = highlights;

  try {
    const { data: existingDbEvent } = await supabase.from('events').select('*').eq('id', id).single();
    const dbPayload = {
      id,
      number: (existingDbEvent && existingDbEvent.number) ? existingDbEvent.number : (events[eventIndex]?.number || '01'),
      ...(existingDbEvent || {}),
      ...updateFields
    };
    let { error: dbErr } = await supabase.from('events').upsert(dbPayload);
    if (dbErr && dbErr.code === 'PGRST204') {
      delete dbPayload.venue_image;
      const retryRes = await supabase.from('events').upsert(dbPayload);
      dbErr = retryRes.error;
    }
    if (dbErr) {
      console.warn('Supabase updateEvent warning:', dbErr.message);
    }
  } catch (e) {
    console.warn('Supabase updateEvent exception:', e.message);
  }

  if (eventIndex !== -1) {
    if (name) events[eventIndex].name = name.trim();
    if (alias !== undefined) events[eventIndex].alias = alias.trim();
    if (subtitle !== undefined) events[eventIndex].subtitle = subtitle.trim();
    if (category !== undefined) events[eventIndex].category = category.trim().toLowerCase();
    if (venue !== undefined) events[eventIndex].venue = venue.trim();
    if (venueImage !== undefined) events[eventIndex].venueImage = venueImage ? venueImage.trim() : '';
    if (timing !== undefined) events[eventIndex].timing = timing.trim();
    if (fee !== undefined) events[eventIndex].fee = fee.trim();
    if (parsedFeePerHead !== undefined) events[eventIndex].feePerHead = parsedFeePerHead;
    if (feeType !== undefined) events[eventIndex].feeType = feeType;
    if (teamSize !== undefined) {
      events[eventIndex].teamSize = teamSize.trim();
      events[eventIndex].isTeam = (teamSize.toLowerCase().includes('team') || teamSize.toLowerCase().includes('max') || teamSize.toLowerCase().includes('squad'));
    }
    if (tag !== undefined) events[eventIndex].tag = tag.trim();
    if (description !== undefined) events[eventIndex].description = description.trim();
    if (image !== undefined) events[eventIndex].image = image ? image.trim() : '';
    if (rules !== undefined && Array.isArray(rules)) events[eventIndex].rules = rules;
    if (rounds !== undefined && Array.isArray(rounds)) events[eventIndex].rounds = rounds;
    if (guidelines !== undefined && Array.isArray(guidelines)) events[eventIndex].guidelines = guidelines;
    if (highlights !== undefined && Array.isArray(highlights)) events[eventIndex].highlights = highlights;
    saveEventsData(events);
  } else {
    // If not in events.json, append it
    const constructed = {
      id,
      number: String(events.length + 1).padStart(2, '0'),
      name: name || id,
      alias: alias || name || id,
      subtitle: subtitle || '',
      category: category ? category.trim().toLowerCase() : 'technical',
      teamSize: teamSize || 'Individual',
      minMembers: 1,
      maxMembers: 1,
      fee: fee || '₹50 per head',
      feePerHead: parsedFeePerHead || 50,
      feeType: feeType || 'per_head',
      isTeam: false,
      tag: tag || 'Technical Presentation',
      venue: venue || 'CSE Department',
      timing: timing || '10:00 AM – 01:00 PM',
      description: description || '',
      image: cleanImage || '',
      rules: Array.isArray(rules) ? rules : [],
      rounds: Array.isArray(rounds) ? rounds : [],
      guidelines: Array.isArray(guidelines) ? guidelines : [],
      highlights: Array.isArray(highlights) ? highlights : []
    };
    events.push(constructed);
    saveEventsData(events);
  }

  const updatedResult = eventIndex !== -1 ? events[eventIndex] : { id, ...req.body, image: cleanImage };

  res.json({ 
    success: true, 
    message: 'Event updated successfully in live database and storage', 
    data: updatedResult
  });
};

exports.deleteEvent = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  const events = getEventsData();
  const eventIndex = events.findIndex(e => e.id === id);

  try {
    const { error: dbErr } = await supabase.from('events').delete().eq('id', id);
    if (dbErr) {
      console.error('Supabase deleteEvent error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase deleteEvent exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  if (eventIndex !== -1) {
    events.splice(eventIndex, 1);
    saveEventsData(events);
  }

  res.json({ success: true, message: 'Event deleted successfully from live database and storage' });
};

// ==================== SPONSOR MANAGEMENT ====================
exports.getSponsors = async (req, res) => {
  try {
    const { data: dbSponsors, error } = await supabase.from('sponsors').select('*').order('display_order', { ascending: true });
    if (!error && Array.isArray(dbSponsors) && dbSponsors.length > 0) {
      return res.json({ success: true, data: dbSponsors.map(dbToSponsor) });
    }
  } catch (e) {
    console.warn('Supabase getSponsors fallback:', e.message);
  }

  const sponsors = getSponsorsData();
  sponsors.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
  res.json({ success: true, data: sponsors });
};

exports.getSponsorById = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: dbSponsor, error } = await supabase.from('sponsors').select('*').eq('id', id).single();
    if (!error && dbSponsor) {
      return res.json({ success: true, data: dbToSponsor(dbSponsor) });
    }
  } catch (e) {
    console.warn('Supabase getSponsorById fallback:', e.message);
  }

  const sponsors = getSponsorsData();
  const sponsor = sponsors.find(s => s.id === id);
  if (!sponsor) {
    return res.status(404).json({ success: false, message: 'Sponsor not found' });
  }
  res.json({ success: true, data: sponsor });
};

exports.createSponsor = async (req, res) => {
  const {
    name,
    companyName,
    logo,
    description,
    website,
    locationUrl,
    contactName,
    contactEmail,
    contactPhone,
    category,
    displayOrder,
    isActive
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Sponsor name is required' });
  }

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
    return res.status(400).json({ success: false, message: 'Valid contact email address is required' });
  }

  const sponsors = getSponsorsData();
  const now = new Date().toISOString();
  const newSponsor = {
    id: `sponsor-${Date.now()}`,
    name: name.trim(),
    companyName: companyName ? companyName.trim() : '',
    logo: logo ? logo.trim() : '',
    description: description ? description.trim() : '',
    website: website ? website.trim() : '',
    locationUrl: locationUrl ? locationUrl.trim() : '',
    contactName: contactName ? contactName.trim() : '',
    contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : '',
    contactPhone: contactPhone ? contactPhone.trim() : '',
    category: category || 'Gold Sponsor',
    displayOrder: displayOrder !== undefined && displayOrder !== '' ? Number(displayOrder) : sponsors.length + 1,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    createdAt: now,
    updatedAt: now
  };

  try {
    const dbPayload = sponsorToDb(newSponsor);
    const { error: dbErr } = await supabase.from('sponsors').insert([dbPayload]);
    if (dbErr) {
      console.error('Supabase createSponsor error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase createSponsor exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  sponsors.push(newSponsor);
  saveSponsorsData(sponsors);

  res.status(201).json({ success: true, message: 'Sponsor created successfully in live database', data: newSponsor });
};

exports.updateSponsor = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    companyName,
    logo,
    description,
    website,
    locationUrl,
    contactName,
    contactEmail,
    contactPhone,
    category,
    displayOrder,
    isActive
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Sponsor name is required' });
  }

  const sponsors = getSponsorsData();
  const index = sponsors.findIndex(s => s.id === id);

  const updatedSponsor = {
    id,
    name: name.trim(),
    companyName: companyName !== undefined ? companyName.trim() : (sponsors[index]?.companyName || ''),
    logo: logo !== undefined ? logo.trim() : (sponsors[index]?.logo || ''),
    description: description !== undefined ? description.trim() : (sponsors[index]?.description || ''),
    website: website !== undefined ? website.trim() : (sponsors[index]?.website || ''),
    locationUrl: locationUrl !== undefined ? locationUrl.trim() : (sponsors[index]?.locationUrl || ''),
    contactName: contactName !== undefined ? contactName.trim() : (sponsors[index]?.contactName || ''),
    contactEmail: contactEmail !== undefined ? contactEmail.trim().toLowerCase() : (sponsors[index]?.contactEmail || ''),
    contactPhone: contactPhone !== undefined ? contactPhone.trim() : (sponsors[index]?.contactPhone || ''),
    category: category || (sponsors[index]?.category || 'Gold Sponsor'),
    displayOrder: displayOrder !== undefined && displayOrder !== '' ? Number(displayOrder) : (sponsors[index]?.displayOrder || 1),
    isActive: isActive !== undefined ? Boolean(isActive) : (sponsors[index]?.isActive !== false),
    updatedAt: new Date().toISOString()
  };

  try {
    const dbPayload = sponsorToDb(updatedSponsor);
    const { error: dbErr } = await supabase.from('sponsors').upsert([dbPayload], { onConflict: 'id' });
    if (dbErr) {
      console.error('Supabase updateSponsor error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase updateSponsor exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  if (index !== -1) {
    sponsors[index] = updatedSponsor;
    saveSponsorsData(sponsors);
  }

  res.json({ success: true, message: 'Sponsor updated successfully in live database', data: updatedSponsor });
};

exports.toggleSponsorStatus = async (req, res) => {
  const { id } = req.params;
  const sponsors = getSponsorsData();
  const sponsor = sponsors.find(s => s.id === id);

  let newStatus = true;
  try {
    const { data: dbSponsor } = await supabase.from('sponsors').select('is_active').eq('id', id).single();
    if (dbSponsor) {
      newStatus = !dbSponsor.is_active;
    } else if (sponsor) {
      newStatus = !sponsor.isActive;
    }
    const { error: dbErr } = await supabase.from('sponsors').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (dbErr) {
      console.error('Supabase toggleSponsorStatus error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase toggleSponsorStatus exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  if (sponsor) {
    sponsor.isActive = newStatus;
    sponsor.updatedAt = new Date().toISOString();
    saveSponsorsData(sponsors);
  }

  res.json({ 
    success: true, 
    message: `Sponsor marked as ${newStatus ? 'Active' : 'Inactive'} in live database`, 
    data: { id, isActive: newStatus } 
  });
};

exports.deleteSponsor = async (req, res) => {
  const { id } = req.params;
  const sponsors = getSponsorsData();
  const index = sponsors.findIndex(s => s.id === id);

  try {
    const { error: dbErr } = await supabase.from('sponsors').delete().eq('id', id);
    if (dbErr) {
      console.error('Supabase deleteSponsor error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase deleteSponsor exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  if (index !== -1) {
    sponsors.splice(index, 1);
    saveSponsorsData(sponsors);
  }

  res.json({ success: true, message: 'Sponsor deleted successfully from live database' });
};

// ==================== LOGO / EVENT IMAGE UPLOAD (DATABASE STORAGE ONLY) ====================
exports.uploadLogo = async (req, res) => {
  try {
    const { imageBase64, fileName } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
      return res.json({ success: true, url: imageBase64, fileName: fileName || 'external-image' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid base64 image data' });
    }

    const mimeType = matches[1].toLowerCase();
    const allowedMime = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/gif': 'gif'
    };

    if (!allowedMime[mimeType]) {
      return res.status(400).json({ success: false, message: 'Unsupported file type. Use PNG, JPG, WEBP, or SVG.' });
    }

    const safeName = fileName || `img-${Date.now()}.${allowedMime[mimeType]}`;

    // Return Base64 Data URL directly to be stored in Database (Zero local disk or file bucket storage!)
    return res.json({
      success: true,
      message: 'Image processed successfully for database storage',
      url: imageBase64,
      fileName: safeName
    });

  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to process image upload' });
  }
};

// ==================== COORDINATOR MANAGEMENT ====================
exports.getCoordinators = async (req, res) => {
  try {
    const { data: dbCoords, error } = await supabase.from('coordinators').select('*').order('display_order', { ascending: true });
    if (!error && Array.isArray(dbCoords) && dbCoords.length > 0) {
      return res.json({ success: true, data: dbCoords.map(dbToCoordinator) });
    }
  } catch (e) {
    console.warn('Supabase getCoordinators fallback:', e.message);
  }

  const coordinators = getCoordinatorsData();
  coordinators.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
  res.json({ success: true, data: coordinators });
};

exports.getCoordinatorById = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: dbCoord, error } = await supabase.from('coordinators').select('*').eq('id', id).single();
    if (!error && dbCoord) {
      return res.json({ success: true, data: dbToCoordinator(dbCoord) });
    }
  } catch (e) {
    console.warn('Supabase getCoordinatorById fallback:', e.message);
  }

  const coordinators = getCoordinatorsData();
  const coordinator = coordinators.find(c => c.id === id);
  if (!coordinator) {
    return res.status(404).json({ success: false, message: 'Coordinator not found' });
  }
  res.json({ success: true, data: coordinator });
};

exports.createCoordinator = async (req, res) => {
  const {
    name,
    phone,
    whatsapp,
    email,
    department,
    year,
    role,
    assignedEvents,
    displayOrder,
    isActive
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Full name is required' });
  }

  if (!phone || !phone.trim() || !/^[6-9]\d{9}$/.test(phone.trim().replace(/\s+/g, ''))) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit Indian phone number is required (e.g. 9876543210)' });
  }

  if (!Array.isArray(assignedEvents) || assignedEvents.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one assigned event is required' });
  }

  const coordinators = getCoordinatorsData();
  const now = new Date().toISOString();
  const cleanPhone = phone.trim().replace(/\s+/g, '');

  const newCoordinator = {
    id: `coord-${Date.now()}`,
    name: name.trim(),
    phone: cleanPhone,
    whatsapp: whatsapp ? whatsapp.trim().replace(/\s+/g, '') : cleanPhone,
    email: email ? email.trim().toLowerCase() : '',
    department: department ? department.trim() : 'CSE',
    year: year ? year.trim() : '3rd Year',
    role: role || 'Lead Coordinator',
    assignedEvents: assignedEvents.filter(e => e && e.trim()),
    displayOrder: displayOrder !== undefined && displayOrder !== '' ? Number(displayOrder) : coordinators.length + 1,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    createdAt: now,
    updatedAt: now
  };

  try {
    const dbPayload = coordinatorToDb(newCoordinator);
    const { error: dbErr } = await supabase.from('coordinators').insert([dbPayload]);
    if (dbErr) {
      console.error('Supabase createCoordinator error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase createCoordinator exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  coordinators.push(newCoordinator);
  saveCoordinatorsData(coordinators);

  res.status(201).json({ success: true, message: 'Student coordinator created successfully in live database', data: newCoordinator });
};

exports.updateCoordinator = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    phone,
    whatsapp,
    email,
    department,
    year,
    role,
    assignedEvents,
    displayOrder,
    isActive
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Full name is required' });
  }

  const coordinators = getCoordinatorsData();
  const index = coordinators.findIndex(c => c.id === id);

  const cleanPhone = phone ? phone.trim().replace(/\s+/g, '') : (coordinators[index]?.phone || '');
  const updatedCoordinator = {
    id,
    name: name.trim(),
    phone: cleanPhone,
    whatsapp: whatsapp !== undefined ? whatsapp.trim().replace(/\s+/g, '') : (coordinators[index]?.whatsapp || cleanPhone),
    email: email !== undefined ? email.trim().toLowerCase() : (coordinators[index]?.email || ''),
    department: department !== undefined ? department.trim() : (coordinators[index]?.department || 'CSE'),
    year: year !== undefined ? year.trim() : (coordinators[index]?.year || '3rd Year'),
    role: role || (coordinators[index]?.role || 'Lead Coordinator'),
    assignedEvents: Array.isArray(assignedEvents) ? assignedEvents.filter(e => e && e.trim()) : (coordinators[index]?.assignedEvents || []),
    displayOrder: displayOrder !== undefined && displayOrder !== '' ? Number(displayOrder) : (coordinators[index]?.displayOrder || 1),
    isActive: isActive !== undefined ? Boolean(isActive) : (coordinators[index]?.isActive !== false),
    updatedAt: new Date().toISOString()
  };

  try {
    const dbPayload = coordinatorToDb(updatedCoordinator);
    const { error: dbErr } = await supabase.from('coordinators').upsert([dbPayload], { onConflict: 'id' });
    if (dbErr) {
      console.error('Supabase updateCoordinator error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase updateCoordinator exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  if (index !== -1) {
    coordinators[index] = updatedCoordinator;
    saveCoordinatorsData(coordinators);
  }

  res.json({ success: true, message: 'Coordinator updated successfully in live database', data: updatedCoordinator });
};

exports.toggleCoordinatorStatus = async (req, res) => {
  const { id } = req.params;
  const coordinators = getCoordinatorsData();
  const coordinator = coordinators.find(c => c.id === id);

  let newStatus = true;
  try {
    const { data: dbCoord } = await supabase.from('coordinators').select('is_active').eq('id', id).single();
    if (dbCoord) {
      newStatus = !dbCoord.is_active;
    } else if (coordinator) {
      newStatus = !coordinator.isActive;
    }
    const { error: dbErr } = await supabase.from('coordinators').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (dbErr) {
      console.error('Supabase toggleCoordinatorStatus error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase toggleCoordinatorStatus exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  if (coordinator) {
    coordinator.isActive = newStatus;
    coordinator.updatedAt = new Date().toISOString();
    saveCoordinatorsData(coordinators);
  }

  res.json({ 
    success: true, 
    message: `Coordinator marked as ${newStatus ? 'Active' : 'Inactive'} in live database`, 
    data: { id, isActive: newStatus } 
  });
};

exports.deleteCoordinator = async (req, res) => {
  const { id } = req.params;
  const coordinators = getCoordinatorsData();
  const index = coordinators.findIndex(c => c.id === id);

  try {
    const { error: dbErr } = await supabase.from('coordinators').delete().eq('id', id);
    if (dbErr) {
      console.error('Supabase deleteCoordinator error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Supabase database error: ' + dbErr.message });
    }
  } catch (e) {
    console.error('Supabase deleteCoordinator exception:', e.message);
    return res.status(500).json({ success: false, message: 'Database exception: ' + e.message });
  }

  if (index !== -1) {
    coordinators.splice(index, 1);
    saveCoordinatorsData(coordinators);
  }

  res.json({ success: true, message: 'Coordinator deleted successfully from live database' });
};

// ==================== REGISTRATION MANAGEMENT ====================
exports.deleteRegistration = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  const { id } = req.params;
  try {
    // Delete from Supabase if present
    try {
      await supabase.from('registration_members').delete().eq('registration_id', id);
      await supabase.from('registrations').delete().or(`id.eq.${id},ticket_code.eq.${id}`);
    } catch (e) {
      console.warn('Supabase deleteRegistration fallback:', e.message);
    }

    // Delete from local file
    let registrations = getRegistrationsData();
    const initialLen = registrations.length;
    registrations = registrations.filter(r => (
      r.id !== id && 
      r.registrationId !== id && 
      r.ticket_code !== id
    ));
    if (registrations.length !== initialLen) {
      saveRegistrationsData(registrations);
    }

    // Broadcast real-time deletion event
    try {
      broadcastRegistrationUpdate('DELETE', { id, ticket_code: id });
    } catch (wsErr) {
      console.warn('WS Broadcast delete error:', wsErr.message);
    }

    return res.json({ success: true, message: 'Registration deleted successfully' });
  } catch (err) {
    console.error('Error in deleteRegistration:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete registration' });
  }
};

// ==================== PARTICIPANT VERIFICATION ====================
exports.verifyRegistration = async (req, res) => {
  const { id } = req.params;
  const { isVerified = true } = req.body;
  const verifiedBy = req.user?.username || req.user?.role || 'Coordinator';
  const verifiedAt = isVerified ? new Date().toISOString() : null;

  try {
    // 1. Update in Supabase if present
    try {
      await supabase
        .from('registrations')
        .update({
          is_verified: Boolean(isVerified),
          verified_at: verifiedAt,
          verified_by: isVerified ? verifiedBy : null
        })
        .or(`id.eq.${id},ticket_code.eq.${id}`);
    } catch (e) {
      console.warn('Supabase verifyRegistration fallback:', e.message);
    }

    // 2. Update in local file
    let registrations = getRegistrationsData();
    let updatedRecord = null;
    registrations = registrations.map(r => {
      const match = (
        r.id === id || 
        r.registrationId === id || 
        r.ticket_code === id ||
        r.ticketCode === id
      );
      if (match) {
        updatedRecord = {
          ...r,
          is_verified: Boolean(isVerified),
          isVerified: Boolean(isVerified),
          verified_at: verifiedAt,
          verified_at: verifiedAt,
          verified_by: isVerified ? verifiedBy : null,
          verifiedBy: isVerified ? verifiedBy : null
        };
        return updatedRecord;
      }
      return r;
    });

    const broadcastPayload = updatedRecord || {
      id,
      ticket_code: id,
      is_verified: Boolean(isVerified),
      isVerified: Boolean(isVerified),
      verified_at: verifiedAt,
      verified_by: isVerified ? verifiedBy : null
    };

    // Broadcast real-time verification event
    try {
      broadcastRegistrationUpdate('VERIFY', broadcastPayload);
    } catch (wsErr) {
      console.warn('WS Broadcast verify error:', wsErr.message);
    }

    if (updatedRecord) {
      saveRegistrationsData(registrations);
      return res.json({
        success: true,
        message: isVerified ? 'Participant verified and confirmed successfully!' : 'Participant verification reset',
        data: updatedRecord
      });
    }

    // Fallback if record was in Supabase
    return res.json({
      success: true,
      message: isVerified ? 'Participant verified and confirmed successfully!' : 'Participant verification reset',
      data: broadcastPayload
    });
  } catch (err) {
    console.error('Error in verifyRegistration:', err);
    return res.status(500).json({ success: false, message: 'Failed to update verification status' });
  }
};

// ==================== HOMEPAGE STUDENT COORDINATOR TEAMS ============================
exports.getHomepageCoordinators = async (req, res) => {
  try {
    try {
      const { data: dbTeams, error } = await supabase.from('homepage_coordinators').select('*').order('display_order', { ascending: true });
      if (!error && Array.isArray(dbTeams) && dbTeams.length > 0) {
        return res.json({ success: true, data: dbTeams.map(dbToHomepageTeam) });
      }
    } catch (e) {
      console.warn('Supabase getHomepageCoordinators fallback:', e.message);
    }
    const teams = getHomepageCoordinatorsData();
    teams.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
    res.json({ success: true, data: teams });
  } catch (err) {
    console.error('Error in getHomepageCoordinators:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch homepage coordinator teams' });
  }
};

exports.getHomepageCoordinatorById = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const { data: dbTeam, error } = await supabase.from('homepage_coordinators').select('*').eq('id', id).single();
      if (!error && dbTeam) {
        return res.json({ success: true, data: dbToHomepageTeam(dbTeam) });
      }
    } catch (e) {
      console.warn('Supabase getHomepageCoordinatorById fallback:', e.message);
    }
    const teams = getHomepageCoordinatorsData();
    const team = teams.find(t => t.id === id);
    if (!team) return res.status(404).json({ success: false, message: 'Homepage team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    console.error('Error in getHomepageCoordinatorById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch team details' });
  }
};

exports.createHomepageCoordinator = async (req, res) => {
  try {
    const { role, tag, iconName, tier, desc, members, names, displayOrder, isActive } = req.body;
    if (!role || !role.trim()) {
      return res.status(400).json({ success: false, message: 'Team title / role is required' });
    }

    const teams = getHomepageCoordinatorsData();
    const id = req.body.id && req.body.id.trim()
      ? req.body.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
      : `team-${Date.now()}`;

    // Normalize members
    let normalizedMembers = [];
    if (Array.isArray(members) && members.length > 0) {
      normalizedMembers = members
        .map(m => typeof m === 'string' ? { name: m.trim() } : { name: m.name ? m.name.trim() : '' })
        .filter(m => m.name.length > 0);
    } else if (Array.isArray(names) && names.length > 0) {
      normalizedMembers = names
        .filter(n => typeof n === 'string' && n.trim().length > 0)
        .map(n => ({ name: n.trim() }));
    }

    const newTeam = {
      id,
      role: role.trim(),
      tag: (tag || 'TEAM').trim(),
      iconName: iconName || 'Users',
      tier: tier || 'emerald',
      desc: (desc || '').trim(),
      members: normalizedMembers,
      names: normalizedMembers.map(m => m.name),
      displayOrder: displayOrder !== undefined && displayOrder !== '' ? Number(displayOrder) : teams.length + 1,
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Supabase if available
    try {
      const dbPayload = homepageTeamToDb(newTeam);
      const { error: dbErr } = await supabase.from('homepage_coordinators').insert([dbPayload]);
      if (dbErr) console.error('Supabase createHomepageCoordinator error:', dbErr.message);
    } catch (e) {
      console.error('Supabase createHomepageCoordinator exception:', e.message);
    }

    // Save to local file & sync frontend
    teams.push(newTeam);
    saveHomepageCoordinatorsData(teams);

    res.status(201).json({ success: true, message: 'Homepage coordinator team created successfully', data: newTeam });
  } catch (err) {
    console.error('Error in createHomepageCoordinator:', err);
    res.status(500).json({ success: false, message: 'Failed to create homepage coordinator team' });
  }
};

exports.updateHomepageCoordinator = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, tag, iconName, tier, desc, members, names, displayOrder, isActive } = req.body;

    const teams = getHomepageCoordinatorsData();
    const index = teams.findIndex(t => t.id === id);

    let normalizedMembers = undefined;
    if (Array.isArray(members)) {
      normalizedMembers = members
        .map(m => typeof m === 'string' ? { name: m.trim() } : { name: m.name ? m.name.trim() : '' })
        .filter(m => m.name.length > 0);
    } else if (Array.isArray(names)) {
      normalizedMembers = names
        .filter(n => typeof n === 'string' && n.trim().length > 0)
        .map(n => ({ name: n.trim() }));
    }

    const existingTeam = index !== -1 ? teams[index] : {};
    const updatedTeam = {
      ...existingTeam,
      id,
      role: role !== undefined ? role.trim() : existingTeam.role,
      tag: tag !== undefined ? tag.trim() : (existingTeam.tag || 'TEAM'),
      iconName: iconName !== undefined ? iconName : (existingTeam.iconName || 'Users'),
      tier: tier !== undefined ? tier : (existingTeam.tier || 'emerald'),
      desc: desc !== undefined ? desc.trim() : (existingTeam.desc || ''),
      members: normalizedMembers !== undefined ? normalizedMembers : (existingTeam.members || []),
      names: normalizedMembers !== undefined ? normalizedMembers.map(m => m.name) : (existingTeam.names || []),
      displayOrder: displayOrder !== undefined && displayOrder !== '' ? Number(displayOrder) : (existingTeam.displayOrder || 999),
      isActive: isActive !== undefined ? Boolean(isActive) : (existingTeam.isActive !== false),
      updatedAt: new Date().toISOString()
    };

    // Update in Supabase
    try {
      const dbPayload = homepageTeamToDb(updatedTeam);
      const { error: dbErr } = await supabase.from('homepage_coordinators').upsert([dbPayload]);
      if (dbErr) console.error('Supabase updateHomepageCoordinator error:', dbErr.message);
    } catch (e) {
      console.error('Supabase updateHomepageCoordinator exception:', e.message);
    }

    // Update in local file
    if (index !== -1) {
      teams[index] = updatedTeam;
    } else {
      teams.push(updatedTeam);
    }
    saveHomepageCoordinatorsData(teams);

    res.json({ success: true, message: 'Homepage coordinator team updated successfully', data: updatedTeam });
  } catch (err) {
    console.error('Error in updateHomepageCoordinator:', err);
    res.status(500).json({ success: false, message: 'Failed to update homepage coordinator team' });
  }
};

exports.toggleHomepageCoordinatorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const teams = getHomepageCoordinatorsData();
    const index = teams.findIndex(t => t.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Homepage team not found' });
    }

    const newStatus = teams[index].isActive === false ? true : false;
    teams[index].isActive = newStatus;
    teams[index].updatedAt = new Date().toISOString();

    try {
      await supabase.from('homepage_coordinators').update({ is_active: newStatus, updated_at: teams[index].updatedAt }).eq('id', id);
    } catch (e) {
      console.error('Supabase toggle status error:', e.message);
    }

    saveHomepageCoordinatorsData(teams);
    res.json({
      success: true,
      message: `Team "${teams[index].role}" is now ${newStatus ? 'visible on' : 'hidden from'} the homepage`,
      data: teams[index]
    });
  } catch (err) {
    console.error('Error in toggleHomepageCoordinatorStatus:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle homepage team status' });
  }
};

exports.deleteHomepageCoordinator = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await supabase.from('homepage_coordinators').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteHomepageCoordinator fallback:', e.message);
    }

    let teams = getHomepageCoordinatorsData();
    const initialLen = teams.length;
    teams = teams.filter(t => t.id !== id);
    if (teams.length !== initialLen) {
      saveHomepageCoordinatorsData(teams);
    }

    res.json({ success: true, message: 'Homepage coordinator team deleted successfully' });
  } catch (err) {
    console.error('Error in deleteHomepageCoordinator:', err);
    res.status(500).json({ success: false, message: 'Failed to delete homepage coordinator team' });
  }
};

// ==================== REGISTRATION ACCESS CONTROL (CLOSE RG) ====================
exports.getAdminRegistrationStatus = async (req, res) => {
  try {
    const settings = getSettingsData();
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    console.error('Error in getAdminRegistrationStatus:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch registration status' });
  }
};

exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { isRegistrationClosed, closedReason } = req.body;
    const current = getSettingsData();
    const shouldClose = Boolean(isRegistrationClosed);

    const updated = {
      ...current,
      isRegistrationClosed: shouldClose,
      closedReason: typeof closedReason === 'string' && closedReason.trim() ? closedReason.trim() : current.closedReason,
      closedAt: shouldClose ? (current.isRegistrationClosed ? current.closedAt : new Date().toISOString()) : null,
      closedBy: shouldClose ? (req.user?.username || 'admin') : null,
      updatedAt: new Date().toISOString()
    };

    saveSettingsData(updated);

    // Broadcast real-time update via WebSocket to all connected clients
    try {
      broadcastRegistrationUpdate('REGISTRATION_STATUS_UPDATED', updated);
    } catch (wsErr) {
      console.warn('WS Broadcast error:', wsErr.message);
    }

    res.json({
      success: true,
      message: updated.isRegistrationClosed 
        ? 'Registrations have been closed across all symposium events.' 
        : 'Registrations have been re-opened successfully.',
      data: updated
    });
  } catch (err) {
    console.error('Error in updateRegistrationStatus:', err);
    res.status(500).json({ success: false, message: 'Failed to update registration status' });
  }
};

