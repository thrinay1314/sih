const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const SESSION_MINUTES = Number(process.env.SESSION_MINUTES || 30);

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, mobile: user.mobile, role: user.role },
    JWT_SECRET,
    { expiresIn: `${SESSION_MINUTES}m` }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole, SESSION_MINUTES, JWT_SECRET };
