const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const express = require('express');
const cors = require('cors');

let morgan;
try {
  morgan = require('morgan');
} catch (e) {}

let supabase;
try {
  supabase = require('./config/supabase');
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Middleware
if (morgan) {
  app.use(morgan('dev'));
}
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Frontend static build serving (Unified deployment on Render)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  
  // SPA Catch-all middleware for client routing (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
} else {
  // Standalone API Mode fallback
  app.get('/', (req, res) => {
    res.json({
      name: "ELOQUENCE '26 Backend API",
      status: "Running",
      healthCheck: "/api/health"
    });
  });
}

// 404 handler for unmatched API requests or invalid paths
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint or resource not found' });
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`[ELOQUENCE'26 Backend] Server running on http://${HOST}:${PORT}`);
});

module.exports = app;
