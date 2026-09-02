const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

const usersFilePath = path.join(__dirname, '../data/users.json');
const rolesFilePath = path.join(__dirname, '../data/roles.json');
const eventsFilePath = path.join(__dirname, '../data/events.json');
const sponsorsFilePath = path.join(__dirname, '../data/sponsors.json');
const coordinatorsFilePath = path.join(__dirname, '../data/coordinators.json');
const registrationsFilePath = path.join(__dirname, '../data/registrations.json');
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ==================== DATA MAPPER HELPERS ====================
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

const sponsorToDb = (s) => ({
  id: s.id,
  name: s.name,
  company_name: s.companyName || s.company_name || '',
  logo: s.logo || '',
  description: s.description || '',
  website: s.website || '',
  contact_name: s.contactName || s.contact_name || '',
  contact_email: s.contactEmail || s.contact_email || '',
  contact_phone: s.contactPhone || s.contact_phone || '',
  category: s.category || 'Gold Sponsor',
  display_order: Number(s.displayOrder ?? s.display_order ?? 999),
  is_active: s.isActive !== false && s.is_active !== false,
  updated_at: new Date().toISOString()
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

const getRegistrationsData = () => {
  try {
    const data = fs.readFileSync(registrationsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
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

// ==================== DASHBOARD STATS ====================
exports.getDashboardData = async (req, res) => {
  try {
    let registrations = getRegistrationsData();
    let sponsors = getSponsorsData();
    let coordinators = getCoordinatorsData();
    let events = getEventsData();

    try {
      const [regRes, spRes, coRes, evRes] = await Promise.all([
        supabase.from('registrations').select('*'),
        supabase.from('sponsors').select('*'),
        supabase.from('coordinators').select('*'),
        supabase.from('events').select('*')
      ]);

      if (regRes.data && regRes.data.length > 0) registrations = regRes.data;
      if (spRes.data && spRes.data.length > 0) sponsors = spRes.data.map(dbToSponsor);
      if (coRes.data && coRes.data.length > 0) coordinators = coRes.data.map(dbToCoordinator);
      if (evRes.data && evRes.data.length > 0) events = evRes.data.map(dbToEvent);
    } catch (dbErr) {
      console.warn('Dashboard live metrics query error fallback:', dbErr.message);
    }

    const totalRevenue = registrations.reduce((sum, r) => sum + (Number(r.total_fee || r.totalAmount) || 0), 0);
    const activeSponsors = sponsors.filter(s => s.isActive !== false);
    const activeCoordinators = coordinators.filter(c => c.isActive !== false);

    const recentRegistrations = [...registrations]
      .reverse()
      .slice(0, 5)
      .map(r => ({
        id: r.ticket_code || r.registrationId || r.id,
        name: r.full_name || r.fullName || 'Anonymous',
        event: r.event_id || r.eventName || 'General Registration',
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : 'Recent'
      }));

    res.json({
      success: true,
      data: {
        stats: {
          totalRegistrations: registrations.length,
          revenue: totalRevenue,
          eventsActive: events.length || 12,
          totalSponsors: sponsors.length,
          activeSponsors: activeSponsors.length,
          totalCoordinators: coordinators.length,
          activeCoordinators: activeCoordinators.length
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

  const newRole = { id: Date.now(), name: normalizedName };

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
  try {
    const { data: dbEvents, error } = await supabase.from('events').select('*').order('id', { ascending: true });
    if (!error && Array.isArray(dbEvents) && dbEvents.length > 0) {
      return res.json({ success: true, data: dbEvents.map(dbToEvent) });
    }
  } catch (e) {
    console.warn('Supabase getEvents fallback:', e.message);
  }

  const events = getEventsData();
  res.json({ success: true, data: events });
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

  const parsedFeePerHead = feePerHead !== undefined && feePerHead !== '' ? Number(feePerHead) : (fee && fee.match(/\d+/) ? Number(fee.match(/\d+/)[0]) : 50);

  const newEvent = {
    id: eventId,
    number: String(events.length + 1).padStart(2, '0'),
    name: name.trim(),
    alias: alias ? alias.trim() : name.trim(),
    subtitle: subtitle ? subtitle.trim() : '',
    category: cat,
    teamSize: teamSize ? teamSize.trim() : 'Individual',
    minMembers: 1,
    maxMembers: teamSize && (teamSize.toLowerCase().includes('team') || teamSize.toLowerCase().includes('max')) ? 4 : 1,
    fee: fee ? fee.trim() : '₹50 per head',
    feePerHead: isNaN(parsedFeePerHead) ? 50 : parsedFeePerHead,
    feeType: feeType || 'per_head',
    isTeam: teamSize ? (teamSize.toLowerCase().includes('team') || teamSize.toLowerCase().includes('max')) : false,
    tag: tag ? tag.trim() : (cat === 'technical' ? 'Technical Presentation' : 'Non-Technical Event'),
    venue: venue ? venue.trim() : 'CSE Department',
    timing: timing ? timing.trim() : '10:00 AM – 01:00 PM',
    description: description ? description.trim() : '',
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
      timing: newEvent.timing,
      description: newEvent.description,
      image: newEvent.image,
      rules: newEvent.rules,
      rounds: newEvent.rounds,
      guidelines: newEvent.guidelines,
      highlights: newEvent.highlights,
      updated_at: new Date().toISOString()
    };
    const { error: dbErr } = await supabase.from('events').insert([dbPayload]);
    if (dbErr) console.error('Supabase createEvent error:', dbErr.message);
  } catch (e) {
    console.error('Supabase createEvent exception:', e.message);
  }

  events.push(newEvent);
  saveEventsData(events);

  res.json({
    success: true,
    message: 'Event created successfully',
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

  const updateFields = {
    updated_at: new Date().toISOString()
  };

  if (name) updateFields.name = name.trim();
  if (alias !== undefined) updateFields.alias = alias.trim();
  if (subtitle !== undefined) updateFields.subtitle = subtitle.trim();
  if (category !== undefined) updateFields.category = category;
  if (venue !== undefined) updateFields.venue = venue.trim();
  if (timing !== undefined) updateFields.timing = timing.trim();
  if (fee !== undefined) updateFields.fee = fee.trim();
  if (feePerHead !== undefined && feePerHead !== '') updateFields.fee_per_head = Number(feePerHead);
  if (feeType !== undefined) updateFields.fee_type = feeType;
  if (teamSize !== undefined) updateFields.team_size = teamSize.trim();
  if (tag !== undefined) updateFields.tag = tag.trim();
  if (description !== undefined) updateFields.description = description.trim();
  if (image !== undefined) updateFields.image = image.trim();
  if (rules !== undefined && Array.isArray(rules)) updateFields.rules = rules;
  if (rounds !== undefined && Array.isArray(rounds)) updateFields.rounds = rounds;
  if (guidelines !== undefined && Array.isArray(guidelines)) updateFields.guidelines = guidelines;
  if (highlights !== undefined && Array.isArray(highlights)) updateFields.highlights = highlights;

  try {
    const { error: dbErr } = await supabase.from('events').update(updateFields).eq('id', id);
    if (dbErr) console.error('Supabase updateEvent error:', dbErr.message);
  } catch (e) {
    console.error('Supabase updateEvent exception:', e.message);
  }

  if (eventIndex !== -1) {
    if (name) events[eventIndex].name = name.trim();
    if (venue !== undefined) events[eventIndex].venue = venue.trim();
    if (timing !== undefined) events[eventIndex].timing = timing.trim();
    if (fee !== undefined) events[eventIndex].fee = fee.trim();
    if (feePerHead !== undefined) events[eventIndex].feePerHead = Number(feePerHead);
    if (feeType !== undefined) events[eventIndex].feeType = feeType;
    if (teamSize !== undefined) events[eventIndex].teamSize = teamSize.trim();
    if (subtitle !== undefined) events[eventIndex].subtitle = subtitle.trim();
    if (tag !== undefined) events[eventIndex].tag = tag.trim();
    if (description !== undefined) events[eventIndex].description = description.trim();
    if (image !== undefined) events[eventIndex].image = image.trim();
    if (rules !== undefined && Array.isArray(rules)) events[eventIndex].rules = rules;
    if (rounds !== undefined && Array.isArray(rounds)) events[eventIndex].rounds = rounds;
    if (guidelines !== undefined && Array.isArray(guidelines)) events[eventIndex].guidelines = guidelines;
    if (highlights !== undefined && Array.isArray(highlights)) events[eventIndex].highlights = highlights;
    saveEventsData(events);
  }

  res.json({ 
    success: true, 
    message: 'Event updated successfully in live database', 
    data: { id, ...req.body } 
  });
};

exports.deleteEvent = async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { id } = req.params;
  const events = getEventsData();
  const eventIndex = events.findIndex(e => e.id === id);

  if (eventIndex !== -1) {
    events.splice(eventIndex, 1);
    saveEventsData(events);
  }

  try {
    const { error: dbErr } = await supabase.from('events').delete().eq('id', id);
    if (dbErr) console.error('Supabase deleteEvent error:', dbErr.message);
  } catch (e) {
    console.error('Supabase deleteEvent exception:', e.message);
  }

  res.json({ success: true, message: 'Event deleted successfully from live database' });
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
    if (dbErr) console.error('Supabase createSponsor error:', dbErr.message);
  } catch (e) {
    console.error('Supabase createSponsor exception:', e.message);
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
    if (dbErr) console.error('Supabase updateSponsor error:', dbErr.message);
  } catch (e) {
    console.error('Supabase updateSponsor exception:', e.message);
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
  if (sponsor) {
    sponsor.isActive = !sponsor.isActive;
    sponsor.updatedAt = new Date().toISOString();
    newStatus = sponsor.isActive;
    saveSponsorsData(sponsors);
  }

  try {
    const { data: dbSponsor } = await supabase.from('sponsors').select('is_active').eq('id', id).single();
    if (dbSponsor) {
      newStatus = !dbSponsor.is_active;
    }
    const { error: dbErr } = await supabase.from('sponsors').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (dbErr) console.error('Supabase toggleSponsorStatus error:', dbErr.message);
  } catch (e) {
    console.error('Supabase toggleSponsorStatus exception:', e.message);
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

  if (index !== -1) {
    sponsors.splice(index, 1);
    saveSponsorsData(sponsors);
  }

  try {
    const { error: dbErr } = await supabase.from('sponsors').delete().eq('id', id);
    if (dbErr) console.error('Supabase deleteSponsor error:', dbErr.message);
  } catch (e) {
    console.error('Supabase deleteSponsor exception:', e.message);
  }

  res.json({ success: true, message: 'Sponsor deleted successfully from live database' });
};

// ==================== LOGO UPLOAD ====================
exports.uploadLogo = (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid base64 image data' });
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];

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

    const ext = allowedMime[mimeType];
    const safeName = `sponsor-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const publicUrl = `/uploads/${safeName}`;
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      url: publicUrl,
      fileName: safeName
    });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to process logo upload' });
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
    if (dbErr) console.error('Supabase createCoordinator error:', dbErr.message);
  } catch (e) {
    console.error('Supabase createCoordinator exception:', e.message);
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

  const cleanPhone = phone.trim().replace(/\s+/g, '');
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
    if (dbErr) console.error('Supabase updateCoordinator error:', dbErr.message);
  } catch (e) {
    console.error('Supabase updateCoordinator exception:', e.message);
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
  if (coordinator) {
    coordinator.isActive = !coordinator.isActive;
    coordinator.updatedAt = new Date().toISOString();
    newStatus = coordinator.isActive;
    saveCoordinatorsData(coordinators);
  }

  try {
    const { data: dbCoord } = await supabase.from('coordinators').select('is_active').eq('id', id).single();
    if (dbCoord) {
      newStatus = !dbCoord.is_active;
    }
    const { error: dbErr } = await supabase.from('coordinators').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (dbErr) console.error('Supabase toggleCoordinatorStatus error:', dbErr.message);
  } catch (e) {
    console.error('Supabase toggleCoordinatorStatus exception:', e.message);
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

  if (index !== -1) {
    coordinators.splice(index, 1);
    saveCoordinatorsData(coordinators);
  }

  try {
    const { error: dbErr } = await supabase.from('coordinators').delete().eq('id', id);
    if (dbErr) console.error('Supabase deleteCoordinator error:', dbErr.message);
  } catch (e) {
    console.error('Supabase deleteCoordinator exception:', e.message);
  }

  res.json({ success: true, message: 'Coordinator deleted successfully from live database' });
};
