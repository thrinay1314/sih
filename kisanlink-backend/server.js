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
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '25kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Slow down brute-force guessing on auth routes specifically.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
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

function getCropIcon(cropName) {
  const map = {
    tomato: '🍅',
    onion: '🧅',
    soybean: '🌱',
    cotton: '🌾',
    wheat: '🌿',
    rice: '🍚',
    chili: '🌶️',
    maize: '🌽',
    potato: '🥔'
  };
  return map[(cropName || '').toLowerCase()] || '🌾';
}

// ---------------- Auth routes ----------------

// Create a real account with a securely hashed password.
app.post('/api/register', async (req, res) => {
  const { name, mobile, password, role, village, company } = req.body || {};
  const err = validateRegisterInput({ name, mobile, password, role });
  if (err) return res.status(400).json({ error: err });

  if (db.findUser(mobile, role)) {
    return res.status(409).json({ error: 'An account with this ID already exists for this role. Try logging in instead.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: Date.now(),
    name: name.trim(),
    mobile: mobile.trim(),
    role,
    passwordHash,
    createdAt: new Date().toISOString(),
    village: village ? village.trim() : (role === 'farmer' ? 'Warangal' : undefined),
    company: company ? company.trim() : (role === 'buyer' ? `${name.trim()} Trading` : undefined)
  };
  await db.addUser(user);

  if (role === 'buyer') {
    const buyerEntry = {
      id: user.id,
      name: user.company || user.name,
      type: 'private',
      contactPerson: user.name,
      mobile: user.mobile,
      location: user.village || 'Warangal',
      distBase: 15,
      priceMult: 1.05,
      commission: 0.04,
      verified: true,
      rating: 5.0,
      deals: 0,
      acceptedCrops: ['All Produce'],

      description: 'Registered buyer on KisanLink.'
    };
    await db.addBuyer(buyerEntry);
  }

  const token = signToken(user);
  res.status(201).json({
    token,
    expiresInMinutes: SESSION_MINUTES,
    user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role, village: user.village, company: user.company }
  });
});

// Log in with an existing account.
app.post('/api/login', async (req, res) => {
  const { mobile, password, role } = req.body || {};
  if (!mobile || !password || !role) {
    return res.status(400).json({ error: 'Please fill in all fields.' });
  }

  const user = db.findUser(mobile.trim(), role);
  const genericError = { error: 'Invalid credentials. Check your ID, role and password.' };
  if (!user) return res.status(401).json(genericError);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json(genericError);

  const token = signToken(user);
  res.json({
    token,
    expiresInMinutes: SESSION_MINUTES,
    user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role, village: user.village, company: user.company }
  });
});

// Confirm current session is valid
app.get('/api/me', requireAuth, (req, res) => {
  const fullUser = db.getUsers().find(u => u.id === req.user.id) || req.user;
  res.json({
    user: {
      id: fullUser.id,
      name: fullUser.name,
      mobile: fullUser.mobile,
      role: fullUser.role,
      village: fullUser.village,
      company: fullUser.company
    }
  });
});

// ---------------- CROPS MANAGEMENT (Farmer) ----------------

// Farmer adds crop data
app.post('/api/crops', requireAuth, async (req, res) => {
  if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only farmers can add crop listings.' });
  }

  const { crop, variety, qty, unit, askPrice, quality, village, harvestDate, notes } = req.body || {};
  if (!crop || !qty || !askPrice) {
    return res.status(400).json({ error: 'Please specify crop, quantity, and asking price.' });
  }

  const newCrop = {
    id: Date.now(),
    farmerId: req.user.id,
    farmerName: req.user.name,
    farmerMobile: req.user.mobile,
    village: (village || req.user.village || 'Warangal Rural').trim(),
    crop: crop.trim(),
    variety: (variety || 'Standard').trim(),
    qty: Number(qty),
    unit: unit || 'kg',
    askPrice: Number(askPrice),
    quality: quality || 'Grade A',
    harvestDate: harvestDate || new Date().toISOString().slice(0, 10),
    status: 'available',
    icon: getCropIcon(crop),
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  await db.addCrop(newCrop);
  res.status(201).json({ crop: newCrop });
});

// Query crops with optional filters
app.get('/api/crops', (req, res) => {
  const { farmerId, search, crop, status } = req.query;
  let crops = db.getCrops();

  if (farmerId) {
    crops = crops.filter(c => String(c.farmerId) === String(farmerId));
  }
  if (status) {
    crops = crops.filter(c => c.status === status);
  }
  if (crop) {
    crops = crops.filter(c => c.crop.toLowerCase() === crop.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    crops = crops.filter(c =>
      c.crop.toLowerCase().includes(q) ||
      (c.variety && c.variety.toLowerCase().includes(q)) ||
      (c.village && c.village.toLowerCase().includes(q)) ||
      (c.farmerName && c.farmerName.toLowerCase().includes(q))
    );
  }

  res.json({ crops });
});

// Update crop status (available / sold / negotiating)
app.patch('/api/crops/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Status is required.' });

  const updated = await db.updateCropStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Crop listing not found.' });
  res.json({ crop: updated });
});

// Remove crop listing
app.delete('/api/crops/:id', requireAuth, async (req, res) => {
  const farmerId = req.user.role === 'admin' ? null : req.user.id;
  const removed = await db.removeCrop(req.params.id, farmerId);
  if (!removed) return res.status(404).json({ error: 'Crop listing not found or not owned by you.' });
  res.json({ removed });
});

// ---------------- SEARCH: Specific Buyers & Farmers ----------------

// Farmer searches for specific buyers / mandis
app.get('/api/buyers/search', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  const type = (req.query.type || '').trim().toLowerCase();
  let buyers = [...db.getBuyers()];

  // Also include registered buyers from users store if not already present
  const registeredBuyers = db.getUsers().filter(u => u.role === 'buyer');
  registeredBuyers.forEach(rb => {
    if (!buyers.some(b => String(b.id) === String(rb.id) || b.mobile === rb.mobile)) {
      buyers.push({
        id: rb.id,
        name: rb.company || rb.name,
        type: 'private',
        contactPerson: rb.name,
        mobile: rb.mobile,
        location: rb.village || 'Warangal',
        distBase: 15,
        priceMult: 1.05,
        commission: 0.04,
        verified: true,
        rating: 5.0,
        deals: 0,
        acceptedCrops: ['All Produce'],
        description: 'Registered buyer on KisanLink.'
      });
    }
  });

  if (type && type !== 'all') {
    buyers = buyers.filter(b => b.type.toLowerCase() === type);
  }
  if (query) {
    buyers = buyers.filter(b =>
      b.name.toLowerCase().includes(query) ||
      b.location.toLowerCase().includes(query) ||
      (b.contactPerson && b.contactPerson.toLowerCase().includes(query)) ||
      (b.acceptedCrops && b.acceptedCrops.some(c => c.toLowerCase().includes(query)))
    );
  }

  res.json({ buyers });
});

// Buyer searches for specific farmers & produce
app.get('/api/farmers/search', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  const cropFilter = (req.query.crop || '').trim().toLowerCase();
  const users = db.getUsers().filter(u => u.role === 'farmer');
  const allCrops = db.getCrops();

  // Combine farmer profile with their produce
  let results = users.map(f => {
    const farmerCrops = allCrops.filter(c => String(c.farmerId) === String(f.id));
    return {
      id: f.id,
      name: f.name,
      mobile: f.mobile,
      village: f.village || 'Warangal Region',
      registeredAt: f.createdAt,
      crops: farmerCrops,
      totalListings: farmerCrops.length,
      availableQtySummary: farmerCrops.filter(c => c.status === 'available').map(c => `${c.crop} (${c.qty} ${c.unit})`).join(', ') || 'No active crops'
    };
  });

  if (cropFilter && cropFilter !== 'all') {
    results = results.filter(f => f.crops.some(c => c.crop.toLowerCase() === cropFilter));
  }
  if (query) {
    results = results.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.village.toLowerCase().includes(query) ||
      f.mobile.includes(query) ||
      f.crops.some(c => c.crop.toLowerCase().includes(query) || (c.variety && c.variety.toLowerCase().includes(query)))
    );
  }

  res.json({ farmers: results });
});

// ---------------- DEALS & TRANSACTION HISTORY ----------------

// Initiate a deal (Offer sent by farmer OR purchase request by buyer)
app.post('/api/deals', requireAuth, async (req, res) => {
  const { farmerId, farmerName, farmerMobile, buyerId, buyerName, buyerContact, crop, qty, unit, pricePerKg, notes } = req.body || {};
  if (!crop || !qty || !pricePerKg) {
    return res.status(400).json({ error: 'Crop, quantity, and price are required to initiate a deal.' });
  }

  const numericQty = Number(qty);
  const numericPrice = Number(pricePerKg);
  const totalAmount = Math.round(numericQty * numericPrice);

  const newDeal = {
    id: `DEAL-${Date.now().toString().slice(-4)}`,
    farmerId: farmerId || req.user.id,
    farmerName: farmerName || (req.user.role === 'farmer' ? req.user.name : 'Registered Farmer'),
    farmerMobile: farmerMobile || (req.user.role === 'farmer' ? req.user.mobile : '9876543210'),
    buyerId: buyerId || (req.user.role === 'buyer' ? req.user.id : 1),
    buyerName: buyerName || (req.user.role === 'buyer' ? req.user.name : 'APMC Mandi / Verified Buyer'),
    buyerContact: buyerContact || (req.user.role === 'buyer' ? req.user.mobile : '0870-2456789'),
    crop: crop.trim(),
    qty: numericQty,
    unit: unit || 'kg',
    pricePerKg: numericPrice,
    totalAmount,
    stageIndex: 0,
    stageName: 'Offer sent',
    status: 'in_progress',
    notes: notes || 'Deal initiated on KisanLink platform.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.addDeal(newDeal);
  res.status(201).json({ deal: newDeal });
});

// Progress deal lifecycle stage
app.patch('/api/deals/:id/advance', requireAuth, async (req, res) => {
  const updated = await db.advanceDealStage(req.params.id, req.user.role, req.user.id);
  if (!updated) return res.status(404).json({ error: 'Deal not found.' });
  res.json({ deal: updated });
});

// Fetch deal history scoped to role
app.get('/api/deals/history', requireAuth, (req, res) => {
  const allDeals = db.getDeals();
  let userDeals = [];

  if (req.user.role === 'farmer') {
    userDeals = allDeals.filter(d =>
      String(d.farmerId) === String(req.user.id) ||
      d.farmerMobile === req.user.mobile ||
      d.farmerName.toLowerCase() === req.user.name.toLowerCase()
    );
  } else if (req.user.role === 'buyer') {
    userDeals = allDeals.filter(d =>
      String(d.buyerId) === String(req.user.id) ||
      (d.buyerContact && d.buyerContact.includes(req.user.mobile)) ||
      (d.buyerName && d.buyerName.toLowerCase().includes(req.user.name.toLowerCase()))
    );
  } else {
    // Admin sees all
    userDeals = allDeals;
  }

  res.json({ deals: userDeals });
});

// ---------------- ADMINISTRATOR DIRECTORIES & ALL HISTORY ----------------

// Admin: Users directory (List of all Farmers and Buyers)
app.get('/api/admin/users', requireAuth, requireRole('admin'), (req, res) => {
  const allUsers = db.getUsers();
  const allCrops = db.getCrops();
  const allDeals = db.getDeals();

  const farmers = allUsers.filter(u => u.role === 'farmer').map(f => {
    const crops = allCrops.filter(c => String(c.farmerId) === String(f.id));
    const deals = allDeals.filter(d => String(d.farmerId) === String(f.id));
    return {
      id: f.id,
      name: f.name,
      mobile: f.mobile,
      village: f.village || 'Warangal Rural',
      registeredAt: f.createdAt,
      totalCrops: crops.length,
      activeCrops: crops.filter(c => c.status === 'available').length,
      totalDeals: deals.length,
      completedDeals: deals.filter(d => d.status === 'completed').length,
      status: 'active'
    };
  });

  const buyers = allUsers.filter(u => u.role === 'buyer').map(b => {
    const deals = allDeals.filter(d =>
      String(d.buyerId) === String(b.id) ||
      (d.buyerContact && d.buyerContact.includes(b.mobile)) ||
      (d.buyerName && d.buyerName.toLowerCase().includes(b.name.toLowerCase()))
    );
    return {
      id: b.id,
      name: b.name,
      mobile: b.mobile,
      company: b.company || `${b.name} Wholesale`,
      registeredAt: b.createdAt,
      totalDeals: deals.length,
      completedDeals: deals.filter(d => d.status === 'completed').length,
      status: 'verified'
    };
  });

  res.json({ farmers, buyers });
});

// Admin: All platform transaction history
app.get('/api/admin/history', requireAuth, requireRole('admin'), (req, res) => {
  const deals = db.getDeals();
  const totalVolume = deals.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const completedDeals = deals.filter(d => d.status === 'completed');
  const inProgressDeals = deals.filter(d => d.status === 'in_progress');

  res.json({
    deals,
    stats: {
      totalTransactions: deals.length,
      totalVolumeINR: totalVolume,
      completedCount: completedDeals.length,
      inProgressCount: inProgressDeals.length
    }
  });
});

// Live counts for the admin dashboard
app.get('/api/admin/stats', requireAuth, requireRole('admin'), (req, res) => {
  const users = db.getUsers();
  const listings = db.getListings();
  const crops = db.getCrops();
  const deals = db.getDeals();

  res.json({
    farmers: users.filter(u => u.role === 'farmer').length,
    buyers: users.filter(u => u.role === 'buyer').length,
    cropsListed: crops.length,
    dealsTotal: deals.length,
    flagged: listings.filter(l => l.status === 'flag').length
  });
});

// Moderation listings
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

// Fallback to the SPA for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`KisanLink backend running at http://localhost:${PORT}`);
});
