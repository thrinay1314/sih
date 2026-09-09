require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./db');
const { signToken, requireAuth, requireRole, SESSION_MINUTES } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Security middleware ----------------
app.use(helmet());                 // sets secure HTTP headers
app.use(cors());                   // same-origin by default in this setup; restrict via origin option in prod
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Slow down brute-force guessing on auth routes specifically.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15 minutes
  max: 20,                         // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
});
app.use('/api/register', authLimiter);
app.use('/api/login', authLimiter);

// ---------------- Validation helpers ----------------
const MOBILE_RE = /^\d{10}$/;

function validateRegisterInput({ name, mobile, password, role }) {
  if (!name || !name.trim()) return 'Please enter your full name.';
  if (!['farmer', 'buyer', 'admin'].includes(role)) return 'Invalid role.';
  if (role === 'admin') {
    if (!mobile || !mobile.trim()) return 'Please enter an Admin ID.';
  } else if (!MOBILE_RE.test(mobile || '')) {
    return 'Please enter a valid 10-digit mobile number.';
  }
  if (!password || password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

// ---------------- Auth routes ----------------

// Create a real account with a securely hashed password.
app.post('/api/register', async (req, res) => {
  const { name, mobile, password, role } = req.body || {};
  const err = validateRegisterInput({ name, mobile, password, role });
  if (err) return res.status(400).json({ error: err });

  if (db.findUser(mobile, role)) {
    return res.status(409).json({ error: 'An account with this ID already exists for this role. Try logging in instead.' });
  }

  const passwordHash = await bcrypt.hash(password, 12); // salted + hashed, never store plaintext
  const user = {
    id: Date.now(),
    name: name.trim(),
    mobile: mobile.trim(),
    role,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  await db.addUser(user);

  const token = signToken(user);
  res.status(201).json({
    token,
    expiresInMinutes: SESSION_MINUTES,
    user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role }
  });
});

// Log in with an existing account.
app.post('/api/login', async (req, res) => {
  const { mobile, password, role } = req.body || {};
  if (!mobile || !password || !role) {
    return res.status(400).json({ error: 'Please fill in all fields.' });
  }

  const user = db.findUser(mobile.trim(), role);
  // Same generic error whether the account doesn't exist or the password is
  // wrong — this stops an attacker from learning which mobile numbers are registered.
  const genericError = { error: 'Invalid credentials. Check your ID, role and password.' };
  if (!user) return res.status(401).json(genericError);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json(genericError);

  const token = signToken(user);
  res.json({
    token,
    expiresInMinutes: SESSION_MINUTES,
    user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role }
  });
});

// Confirm the current session is valid (used for session-timeout checks client-side).
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------------- Admin: listing moderation ----------------
// This is the part that fixes "Approve / Remove doesn't do anything" — these
// routes actually persist the change, and only an authenticated admin can call them.

// Live counts for the admin dashboard — replaces hardcoded sample numbers.
app.get('/api/admin/stats', requireAuth, requireRole('admin'), (req, res) => {
  const users = db.getUsers();
  const listings = db.getListings();
  res.json({
    farmers: users.filter(u => u.role === 'farmer').length,
    buyers: users.filter(u => u.role === 'buyer').length,
    flagged: listings.filter(l => l.status === 'flag').length
  });
});

app.get('/api/listings', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ listings: db.getListings() });
});

app.post('/api/listings/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const updated = await db.updateListingStatus(req.params.id, 'ok');
  if (!updated) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ listing: updated });
});

app.post('/api/listings/:id/remove', requireAuth, requireRole('admin'), async (req, res) => {
  const removed = await db.removeListing(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ removed });
});

// Fallback to the SPA for any other route.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`KisanLink backend running at http://localhost:${PORT}`);
});
