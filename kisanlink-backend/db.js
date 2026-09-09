// db.js — minimal file-backed data store with empty seeds (except platform admin).
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const CROPS_FILE = path.join(DATA_DIR, 'crops.json');
const BUYERS_FILE = path.join(DATA_DIR, 'buyers.json');
const DEALS_FILE = path.join(DATA_DIR, 'deals.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function ensureFile(file, seedValue) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf-8').trim() === '') {
    fs.writeFileSync(file, JSON.stringify(seedValue, null, 2));
  }
}

// Seed Users: Keep ONLY the platform administrator so user can register all new farmers and buyers
const seedUsers = [
  {
    id: 9001,
    name: "Platform Administrator",
    mobile: "admin",
    role: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10),
    createdAt: new Date().toISOString()
  }
];

// Clean empty stores for user to add new buyers, farmers, crops, and deals
const seedBuyers = [];
const seedCrops = [];
const seedDeals = [];
const seedListings = [];

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

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    return [];
  }
}

// ---------------- Users ----------------
function getUsers() {
  return readJSON(USERS_FILE);
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

// ---------------- Listings (Admin moderation) ----------------
function getListings() {
  return readJSON(LISTINGS_FILE);
}
function saveListings(listings) {
  return safeWrite(LISTINGS_FILE, listings);
}
function updateListingStatus(id, status) {
  const listings = getListings();
  const item = listings.find(l => l.id === Number(id));
  if (!item) return null;
  item.status = status;
  return saveListings(listings).then(() => item);
}
function removeListing(id) {
  const listings = getListings();
  const idx = listings.findIndex(l => l.id === Number(id));
  if (idx === -1) return null;
  const [removed] = listings.splice(idx, 1);
  return saveListings(listings).then(() => removed);
}

// ---------------- Crops (Farmer produce listings) ----------------
function getCrops() {
  return readJSON(CROPS_FILE);
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
  const item = crops.find(c => c.id === Number(id) || c.id === id);
  if (!item) return null;
  item.status = status;
  item.updatedAt = new Date().toISOString();
  return saveCrops(crops).then(() => item);
}
function removeCrop(id, farmerId) {
  const crops = getCrops();
  const idx = crops.findIndex(c => (c.id === Number(id) || c.id === id) && (farmerId ? c.farmerId === Number(farmerId) : true));
  if (idx === -1) return null;
  const [removed] = crops.splice(idx, 1);
  return saveCrops(crops).then(() => removed);
}

// ---------------- Buyers Directory ----------------
function getBuyers() {
  return readJSON(BUYERS_FILE);
}
function saveBuyers(buyers) {
  return safeWrite(BUYERS_FILE, buyers);
}
function addBuyer(buyer) {
  const buyers = getBuyers();
  buyers.unshift(buyer);
  return saveBuyers(buyers).then(() => buyer);
}

// ---------------- Deals & History ----------------
function getDeals() {
  return readJSON(DEALS_FILE);
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
  const DEAL_STAGES = ["Offer sent", "Buyer accepts", "Deal confirmed", "Dispatch", "Delivery", "Payment", "Rate buyer"];
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

module.exports = {
  getUsers, saveUsers, findUser, addUser,
  getListings, saveListings, updateListingStatus, removeListing,
  getCrops, saveCrops, addCrop, updateCropStatus, removeCrop,
  getBuyers, saveBuyers, addBuyer,
  getDeals, saveDeals, addDeal, advanceDealStage
};
