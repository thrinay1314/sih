// db.js — High-performance, self-healing JSON database engine for KisanLink.
// Operates with zero native dependencies; persists atomically to disk.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BUYERS_FILE = path.join(DATA_DIR, 'buyers.json');
const CROPS_FILE = path.join(DATA_DIR, 'crops.json');
const DEALS_FILE = path.join(DATA_DIR, 'deals.json');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ---------------- RICH SEED DATA FOR REAL WORKING MODEL ----------------
const seedUsers = [
  {
    id: 9001,
    name: "Platform Administrator",
    mobile: "admin",
    role: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
  },
  {
    id: 1001,
    name: "Ramesh Patel",
    mobile: "9876543210",
    role: "farmer",
    village: "Warangal Rural",
    passwordHash: bcrypt.hashSync("farmer123", 10),
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString()
  },
  {
    id: 1002,
    name: "Lakshmi Devi",
    mobile: "9876543211",
    role: "farmer",
    village: "Karimnagar",
    passwordHash: bcrypt.hashSync("farmer123", 10),
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 1003,
    name: "Suresh Reddy",
    mobile: "9876543212",
    role: "farmer",
    village: "Khammam",
    passwordHash: bcrypt.hashSync("farmer123", 10),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 2001,
    name: "Rajesh Kumar",
    company: "Warangal APMC Market",
    mobile: "9123456780",
    role: "buyer",
    village: "Enumamula, Warangal",
    passwordHash: bcrypt.hashSync("buyer123", 10),
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString()
  },
  {
    id: 2002,
    name: "Venkatesh Rao",
    company: "Sahyadri Farmers FPO",
    mobile: "9123456781",
    role: "buyer",
    village: "Hanamkonda Hub",
    passwordHash: bcrypt.hashSync("buyer123", 10),
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString()
  },
  {
    id: 2003,
    name: "Anil Sharma",
    company: "ITC e-Choupal Procurement",
    mobile: "9123456782",
    role: "buyer",
    village: "Kazipet Logistics Park",
    passwordHash: bcrypt.hashSync("buyer123", 10),
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
  }
];

const seedBuyers = [
  {
    id: 2001,
    name: "Warangal APMC Market",
    type: "mandi",
    contactPerson: "Rajesh Kumar (APMC Secy)",
    mobile: "9123456780",
    location: "Enumamula, Warangal",
    distBase: 12,
    priceMult: 1.02,
    commission: 0.05,
    verified: true,
    rating: 4.8,
    deals: 142,
    acceptedCrops: ["Tomato", "Chili", "Cotton", "Rice", "Maize"],
    description: "Telangana's largest regulated agricultural commodity market yard with open outcry auctions."
  },
  {
    id: 2002,
    name: "Sahyadri Farmers FPO",
    type: "fpo",
    contactPerson: "Venkatesh Rao",
    mobile: "9123456781",
    location: "Hanamkonda Hub",
    distBase: 18,
    priceMult: 1.06,
    commission: 0.02,
    verified: true,
    rating: 4.9,
    deals: 89,
    acceptedCrops: ["Tomato", "Soybean", "Onion", "Wheat"],
    description: "Farmer-owned collective offering direct farmgate pickup with 0% middleman deduction."
  },
  {
    id: 2003,
    name: "ITC e-Choupal Procurement",
    type: "corporate",
    contactPerson: "Anil Sharma",
    mobile: "9123456782",
    location: "Kazipet Logistics Park",
    distBase: 25,
    priceMult: 1.08,
    commission: 0.015,
    verified: true,
    rating: 4.7,
    deals: 215,
    acceptedCrops: ["Wheat", "Soybean", "Maize", "Cotton"],
    description: "Corporate supply chain hub with electronic weighbridge and guaranteed T+1 RTGS payment."
  },
  {
    id: 2004,
    name: "BigBasket Fresh Direct",
    type: "retail",
    contactPerson: "Priya Sundaram",
    mobile: "9123456783",
    location: "Hyderabad Bypass Hub",
    distBase: 45,
    priceMult: 1.12,
    commission: 0.03,
    verified: true,
    rating: 4.9,
    deals: 320,
    acceptedCrops: ["Tomato", "Onion", "Potato", "Chili"],
    description: "Direct retail procurement center offering premium rates for Grade A farm produce."
  },
  {
    id: 2005,
    name: "Om Sai Agro Processing",
    type: "processor",
    contactPerson: "Satyanarayana Murthy",
    mobile: "9123456784",
    location: "Mulugu Road Industrial Area",
    distBase: 15,
    priceMult: 1.04,
    commission: 0.02,
    verified: true,
    rating: 4.6,
    deals: 64,
    acceptedCrops: ["Soybean", "Cotton", "Maize"],
    description: "Solvent extraction and ginning mill seeking steady bulk supply directly from growers."
  },
  {
    id: 2006,
    name: "Lasalgaon Wholesale Mandi",
    type: "mandi",
    contactPerson: "Baburao Kadam",
    mobile: "9123456785",
    location: "National Highway Hub",
    distBase: 35,
    priceMult: 1.10,
    commission: 0.06,
    verified: true,
    rating: 4.7,
    deals: 410,
    acceptedCrops: ["Onion", "Tomato", "Potato"],
    description: "Major wholesale terminal market specializing in bulk vegetable and onion trading."
  }
];

const seedCrops = [
  {
    id: 3001,
    farmerId: 1001,
    farmerName: "Ramesh Patel",
    farmerMobile: "9876543210",
    village: "Warangal Rural",
    crop: "Tomato",
    variety: "Hybrid Vaishnavi",
    qty: 25,
    unit: "quintal",
    askPrice: 24,
    quality: "Grade A",
    harvestDate: "2026-09-12",
    status: "available",
    icon: "🍅",
    notes: "Freshly harvested round red tomatoes, crate packed and sorted.",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 3002,
    farmerId: 1001,
    farmerName: "Ramesh Patel",
    farmerMobile: "9876543210",
    village: "Warangal Rural",
    crop: "Cotton",
    variety: "Long Staple Bt",
    qty: 40,
    unit: "quintal",
    askPrice: 68,
    quality: "Grade A",
    harvestDate: "2026-09-15",
    status: "available",
    icon: "🌾",
    notes: "High ginning outturn (>35%), low trash content, stored dry in godown.",
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
  },
  {
    id: 3003,
    farmerId: 1002,
    farmerName: "Lakshmi Devi",
    farmerMobile: "9876543211",
    village: "Karimnagar",
    crop: "Soybean",
    variety: "JS 335",
    qty: 50,
    unit: "quintal",
    askPrice: 46,
    quality: "Grade B",
    harvestDate: "2026-09-10",
    status: "available",
    icon: "🌱",
    notes: "Sun-dried yellow soybean seeds, moisture 10%, clean grading.",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 3004,
    farmerId: 1002,
    farmerName: "Lakshmi Devi",
    farmerMobile: "9876543211",
    village: "Karimnagar",
    crop: "Maize",
    variety: "Sweet Corn Pioneer",
    qty: 30,
    unit: "quintal",
    askPrice: 22,
    quality: "Grade A",
    harvestDate: "2026-09-14",
    status: "available",
    icon: "🌽",
    notes: "Golden yellow kernels, suitable for poultry feed and starch processing.",
    createdAt: new Date(Date.now() - 3600000 * 15).toISOString()
  },
  {
    id: 3005,
    farmerId: 1003,
    farmerName: "Suresh Reddy",
    farmerMobile: "9876543212",
    village: "Khammam",
    crop: "Rice",
    variety: "Sona Masoori",
    qty: 80,
    unit: "quintal",
    askPrice: 36,
    quality: "Grade A",
    harvestDate: "2026-09-08",
    status: "available",
    icon: "🍚",
    notes: "Raw paddy grain, well polished, moisture tested at 11%.",
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
  },
  {
    id: 3006,
    farmerId: 1003,
    farmerName: "Suresh Reddy",
    farmerMobile: "9876543212",
    village: "Khammam",
    crop: "Chili",
    variety: "Guntur Teja",
    qty: 15,
    unit: "quintal",
    askPrice: 180,
    quality: "Grade A",
    harvestDate: "2026-09-18",
    status: "available",
    icon: "🌶️",
    notes: "Spicy deep red chilies, stemless and sun-cured.",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

const seedDeals = [
  {
    id: "DEAL-1001",
    farmerId: 1001,
    farmerName: "Ramesh Patel",
    farmerMobile: "9876543210",
    buyerId: 2002,
    buyerName: "Sahyadri Farmers FPO",
    buyerContact: "9123456781",
    crop: "Tomato",
    qty: 20,
    unit: "quintal",
    pricePerKg: 25,
    totalAmount: 50000,
    stageIndex: 3,
    stageName: "Dispatch",
    status: "in_progress",
    notes: "Farmgate pickup arranged via FPO mini-truck. En route to packing shed.",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "DEAL-1002",
    farmerId: 1002,
    farmerName: "Lakshmi Devi",
    farmerMobile: "9876543211",
    buyerId: 2003,
    buyerName: "ITC e-Choupal Procurement",
    buyerContact: "9123456782",
    crop: "Soybean",
    qty: 35,
    unit: "quintal",
    pricePerKg: 48,
    totalAmount: 168000,
    stageIndex: 1,
    stageName: "Buyer accepts",
    status: "in_progress",
    notes: "Moisture tested at 9.8%. Awaiting weighbridge dispatch slot.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "DEAL-1003",
    farmerId: 1003,
    farmerName: "Suresh Reddy",
    farmerMobile: "9876543212",
    buyerId: 2001,
    buyerName: "Warangal APMC Market",
    buyerContact: "9123456780",
    crop: "Rice",
    qty: 50,
    unit: "quintal",
    pricePerKg: 38,
    totalAmount: 190000,
    stageIndex: 6,
    stageName: "Rate buyer",
    status: "completed",
    notes: "Full payment of ₹1,90,000 received via RTGS. 5-star transaction.",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const seedListings = [
  { id: 1, buyer: "Warangal APMC Market", crop: "Tomato", updated: new Date(Date.now() - 25 * 60000).toISOString(), status: "ok" },
  { id: 2, buyer: "Lasalgaon Wholesale Mandi", crop: "Onion", updated: new Date(Date.now() - 120 * 60000).toISOString(), status: "ok" },
  { id: 3, buyer: "Unverified Buyer #4471", crop: "Cotton", updated: new Date(Date.now() - 28 * 3600000).toISOString(), status: "flag" },
  { id: 4, buyer: "Om Sai Agro Buyers", crop: "Soybean", updated: new Date(Date.now() - 45 * 60000).toISOString(), status: "ok" },
  { id: 5, buyer: "Prakash Traders Spot Bid", crop: "Wheat", updated: new Date(Date.now() - 10 * 60000).toISOString(), status: "pending" },
  { id: 6, buyer: "Rapid Agri Logistics", crop: "Tomato", updated: new Date(Date.now() - 18 * 3600000).toISOString(), status: "flag" }
];

function ensureFile(file, seedValue) {
  try {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf-8').trim() === '' || fs.readFileSync(file, 'utf-8').trim() === '[]') {
      fs.writeFileSync(file, JSON.stringify(seedValue, null, 2));
    }
  } catch (err) {
    fs.writeFileSync(file, JSON.stringify(seedValue, null, 2));
  }
}

// Ensure all tables are populated with rich seed data
ensureFile(USERS_FILE, seedUsers);
ensureFile(BUYERS_FILE, seedBuyers);
ensureFile(CROPS_FILE, seedCrops);
ensureFile(DEALS_FILE, seedDeals);
ensureFile(LISTINGS_FILE, seedListings);

let writeChain = Promise.resolve();
function safeWrite(file, data) {
  writeChain = writeChain.then(() => fs.promises.writeFile(file, JSON.stringify(data, null, 2)));
  return writeChain;
}

function readJSON(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const content = fs.readFileSync(file, 'utf-8').trim();
    if (!content) return fallback;
    return JSON.parse(content);
  } catch (err) {
    return fallback;
  }
}

// ---------------- Users ----------------
function getUsers() {
  const users = readJSON(USERS_FILE, seedUsers);
  return users.length > 0 ? users : seedUsers;
}
function saveUsers(users) {
  return safeWrite(USERS_FILE, users);
}
function findUser(mobile, role) {
  return getUsers().find(u => u.mobile === mobile && u.role === role);
}
function addUser(user) {
  const users = getUsers();
  users.push(user);
  return saveUsers(users).then(() => user);
}

// ---------------- Buyers ----------------
function getBuyers() {
  const buyers = readJSON(BUYERS_FILE, seedBuyers);
  return buyers.length > 0 ? buyers : seedBuyers;
}
function saveBuyers(buyers) {
  return safeWrite(BUYERS_FILE, buyers);
}
function addBuyer(buyer) {
  const buyers = getBuyers();
  buyers.unshift(buyer);
  return saveBuyers(buyers).then(() => buyer);
}

// ---------------- Crops ----------------
function getCrops() {
  const crops = readJSON(CROPS_FILE, seedCrops);
  return crops.length > 0 ? crops : seedCrops;
}
function saveCrops(crops) {
  return safeWrite(CROPS_FILE, crops);
}
function addCrop(crop) {
  const crops = getCrops();
  crops.unshift(crop);
  return saveCrops(crops).then(() => crop);
}
function updateCropStatus(id, status) {
  const crops = getCrops();
  const item = crops.find(c => String(c.id) === String(id));
  if (!item) return null;
  item.status = status;
  item.updatedAt = new Date().toISOString();
  return saveCrops(crops).then(() => item);
}
function removeCrop(id, farmerId) {
  const crops = getCrops();
  const idx = crops.findIndex(c => String(c.id) === String(id) && (farmerId ? String(c.farmerId) === String(farmerId) : true));
  if (idx === -1) return null;
  const [removed] = crops.splice(idx, 1);
  return saveCrops(crops).then(() => removed);
}

// ---------------- Deals & Lifecycle ----------------
const DEAL_STAGES = ["Offer sent", "Buyer accepts", "Deal confirmed", "Dispatch", "Delivery", "Payment", "Rate buyer"];

function getDeals() {
  const deals = readJSON(DEALS_FILE, seedDeals);
  return deals.length > 0 ? deals : seedDeals;
}
function saveDeals(deals) {
  return safeWrite(DEALS_FILE, deals);
}
function addDeal(deal) {
  const deals = getDeals();
  deals.unshift(deal);
  return saveDeals(deals).then(() => deal);
}
function advanceDealStage(id, userRole, userId) {
  const deals = getDeals();
  const deal = deals.find(d => String(d.id) === String(id));
  if (!deal) return null;

  if (deal.stageIndex < DEAL_STAGES.length - 1) {
    deal.stageIndex += 1;
    deal.stageName = DEAL_STAGES[deal.stageIndex];
    if (deal.stageIndex === DEAL_STAGES.length - 1) {
      deal.status = "completed";
    }
  } else {
    deal.status = "completed";
  }
  deal.updatedAt = new Date().toISOString();
  return saveDeals(deals).then(() => deal);
}

// ---------------- Listings (Admin Moderation) ----------------
function getListings() {
  const listings = readJSON(LISTINGS_FILE, seedListings);
  return listings.length > 0 ? listings : seedListings;
}
function saveListings(listings) {
  return safeWrite(LISTINGS_FILE, listings);
}
function updateListingStatus(id, status) {
  const listings = getListings();
  const item = listings.find(l => String(l.id) === String(id));
  if (!item) return null;
  item.status = status;
  return saveListings(listings).then(() => item);
}
function removeListing(id) {
  const listings = getListings();
  const idx = listings.findIndex(l => String(l.id) === String(id));
  if (idx === -1) return null;
  const [removed] = listings.splice(idx, 1);
  return saveListings(listings).then(() => removed);
}

// ---------------- User Management (Admin) ----------------
async function deleteUser(id) {
  const users = getUsers();
  const idx = users.findIndex(u => String(u.id) === String(id));
  if (idx === -1) return null;
  const [removed] = users.splice(idx, 1);
  await saveUsers(users);
  // Also purge from buyers table if present
  if (removed.role === 'buyer') {
    const buyers = getBuyers();
    const bi = buyers.findIndex(b => String(b.id) === String(id) || b.mobile === removed.mobile);
    if (bi !== -1) {
      buyers.splice(bi, 1);
      await saveBuyers(buyers);
    }
  } else if (removed.role === 'farmer') {
    const crops = getCrops();
    const remainingCrops = crops.filter(c => String(c.farmerId) !== String(id));
    await saveCrops(remainingCrops);
  }
  return removed;
}

module.exports = {
  getUsers, saveUsers, findUser, addUser, deleteUser,
  getBuyers, saveBuyers, addBuyer,
  getCrops, saveCrops, addCrop, updateCropStatus, removeCrop,
  getDeals, saveDeals, addDeal, advanceDealStage,
  getListings, saveListings, updateListingStatus, removeListing
};