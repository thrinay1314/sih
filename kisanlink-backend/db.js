// db.js — Railway MySQL database

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// ---------------- USERS ----------------

async function getUsers() {
  return await query('SELECT * FROM users');
}

async function findUser(mobile, role) {
  const rows = await query(
    'SELECT * FROM users WHERE mobile = ? AND role = ?',
    [mobile, role]
  );

  return rows[0];
}

async function addUser(user) {
  const {
    name,
    mobile,
    role,
    passwordHash,
    village,
    company
  } = user;

  const result = await query(
    `INSERT INTO users
    (name, mobile, role, passwordHash, village, company, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      name,
      mobile,
      role,
      passwordHash,
      village,
      company
    ]
  );

  user.id = result.insertId;

  return user;
}

// ---------------- BUYERS ----------------

async function getBuyers() {
  return await query('SELECT * FROM buyers');
}

async function addBuyer(buyer) {
  const {
    name,
    type,
    contactPerson,
    mobile,
    location,
    distBase,
    priceMult,
    commission,
    verified,
    rating,
    deals,
    acceptedCrops,
    description
  } = buyer;

  const result = await query(
    `INSERT INTO buyers
    (name, type, contactPerson, mobile, location, distBase,
     priceMult, commission, verified, rating, deals,
     acceptedCrops, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      type,
      contactPerson,
      mobile,
      location,
      distBase,
      priceMult,
      commission,
      verified,
      rating,
      deals,
      JSON.stringify(acceptedCrops || []),
      description
    ]
  );

  buyer.id = result.insertId;

  return buyer;
}

// ---------------- CROPS ----------------

async function getCrops() {
  return await query('SELECT * FROM crops');
}

async function addCrop(crop) {
  const {
    farmerId,
    farmerName,
    farmerMobile,
    village,
    crop: cropName,
    variety,
    qty,
    unit,
    askPrice,
    quality,
    harvestDate,
    status,
    icon,
    notes,
    createdAt
  } = crop;

  const result = await query(
    `INSERT INTO crops
    (farmerId, farmerName, farmerMobile, village, crop,
     variety, qty, unit, askPrice, quality, harvestDate,
     status, icon, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      farmerId,
      farmerName,
      farmerMobile,
      village,
      cropName,
      variety,
      qty,
      unit,
      askPrice,
      quality,
      harvestDate,
      status,
      icon,
      notes,
      createdAt
    ]
  );

  crop.id = result.insertId;

  return crop;
}

async function updateCropStatus(id, status) {
  await query(
    'UPDATE crops SET status = ? WHERE id = ?',
    [status, id]
  );

  const rows = await query(
    'SELECT * FROM crops WHERE id = ?',
    [id]
  );

  return rows[0] || null;
}

async function removeCrop(id, farmerId) {
  if (farmerId) {
    await query(
      'DELETE FROM crops WHERE id = ? AND farmerId = ?',
      [id, farmerId]
    );
  } else {
    await query(
      'DELETE FROM crops WHERE id = ?',
      [id]
    );
  }

  return true;
}

// ---------------- DEALS ----------------

async function getDeals() {
  return await query('SELECT * FROM deals');
}

async function addDeal(deal) {
  const {
    farmerId,
    farmerName,
    farmerMobile,
    buyerId,
    buyerName,
    buyerContact,
    crop,
    qty,
    unit,
    pricePerKg,
    totalAmount,
    stageIndex,
    stageName,
    status,
    notes,
    createdAt
  } = deal;

  const result = await query(
    `INSERT INTO deals
    (farmerId, farmerName, farmerMobile, buyerId,
     buyerName, buyerContact, crop, qty, unit,
     pricePerKg, totalAmount, stageIndex, stageName,
     status, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      farmerId,
      farmerName,
      farmerMobile,
      buyerId,
      buyerName,
      buyerContact,
      crop,
      qty,
      unit,
      pricePerKg,
      totalAmount,
      stageIndex,
      stageName,
      status,
      notes,
      createdAt
    ]
  );

  deal.id = `DEAL-${result.insertId}`;

  return deal;
}

async function advanceDealStage(id, userRole, userId) {
  const rows = await query(
    'SELECT * FROM deals WHERE id = ?',
    [id]
  );

  const deal = rows[0];

  if (!deal) {
    return null;
  }

  const stages = [
    "Offer sent",
    "Buyer accepts",
    "Deal confirmed",
    "Dispatch",
    "Delivery",
    "Payment",
    "Rate buyer"
  ];

  if (deal.stageIndex < stages.length - 1) {
    deal.stageIndex += 1;
    deal.stageName = stages[deal.stageIndex];

    if (deal.stageIndex === stages.length - 1) {
      deal.status = "completed";
    }
  } else {
    deal.status = "completed";
  }

  await query(
    `UPDATE deals
     SET stageIndex = ?,
         stageName = ?,
         status = ?,
         updatedAt = NOW()
     WHERE id = ?`,
    [
      deal.stageIndex,
      deal.stageName,
      deal.status,
      id
    ]
  );

  return deal;
}

// ---------------- LISTINGS ----------------

async function getListings() {
  return await query('SELECT * FROM listings');
}

async function updateListingStatus(id, status) {
  await query(
    'UPDATE listings SET status = ? WHERE id = ?',
    [status, id]
  );

  const rows = await query(
    'SELECT * FROM listings WHERE id = ?',
    [id]
  );

  return rows[0] || null;
}

async function removeListing(id) {
  await query(
    'DELETE FROM listings WHERE id = ?',
    [id]
  );

  return true;
}

// ---------------- EXPORT ----------------

module.exports = {
  getUsers,
  findUser,
  addUser,

  getBuyers,
  addBuyer,

  getCrops,
  addCrop,
  updateCropStatus,
  removeCrop,

  getDeals,
  addDeal,
  advanceDealStage,

  getListings,
  updateListingStatus,
  removeListing
};