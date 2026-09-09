// db.js — minimal file-backed data store.
//
// This uses JSON files instead of a real database so the whole project runs
// with zero native build tools (works out of the box on any judge's laptop).
// For real production scale, swap readAll/writeAll below for a Postgres/MySQL
// client — the rest of the app (routes, auth, hashing) does not need to change.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function ensureFile(file, seedValue) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(seedValue, null, 2));
  }
}

ensureFile(USERS_FILE, []);
ensureFile(LISTINGS_FILE, []);

// A tiny write queue so two near-simultaneous requests can't corrupt a file
// by writing at the same time (naive but sufficient for a demo/prototype).
let writeChain = Promise.resolve();
function safeWrite(file, data) {
  writeChain = writeChain.then(() => fs.promises.writeFile(file, JSON.stringify(data, null, 2)));
  return writeChain;
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
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

// ---------------- Listings ----------------
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

module.exports = {
  getUsers, saveUsers, findUser, addUser,
  getListings, saveListings, updateListingStatus, removeListing
};
