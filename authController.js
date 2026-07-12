const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const mailer = require('../utils/mailer');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, department_id: user.department_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password, department_id } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const emailReady = mailer.isConfigured();

    // If email sending is configured, require a verification code before the
    // account is usable. Otherwise, skip straight to an active account.
    const isVerified = emailReady ? 0 : 1;
    const verificationCode = emailReady ? generateCode() : null;
    const verificationExpires = emailReady ? new Date(Date.now() + 15 * 60 * 1000) : null;

    // All self-signups become Employee. There is only ever one Admin account
    // (created by the seed script) — nobody can sign themselves up as Admin.
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department_id, is_verified, verification_code, verification_expires)
       VALUES (?, ?, ?, 'Employee', ?, ?, ?, ?)`,
      [name, email, password_hash, department_id || null, isVerified, verificationCode, verificationExpires]
    );

    if (emailReady) {
      await mailer.sendMail({
        to: email,
        subject: 'Verify your AssetFlow account',
        html: `<p>Hi ${name},</p><p>Your AssetFlow verification code is:</p><h2>${verificationCode}</h2><p>This code expires in 15 minutes.</p>`,
      });
      return res.status(201).json({
        message: 'Account created. Check your email for a 6-digit verification code.',
        requiresVerification: true,
        email,
      });
    }

    // No email service configured — activate immediately, and best-effort
    // log a "welcome" message (sendMail no-ops safely if unconfigured).
    await mailer.sendMail({
      to: email,
      subject: 'Welcome to AssetFlow',
      html: `<p>Hi ${name}, welcome to AssetFlow! Your account is ready to use.</p>`,
    });

    const [rows] = await pool.query(
      'SELECT id, name, email, role, department_id FROM users WHERE id = ?',
      [result.insertId]
    );
    const user = rows[0];
    const token = signToken(user);
    res.status(201).json({ message: 'Account created successfully.', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required.' });
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'Email not registered.' });
    const user = rows[0];

    if (user.is_verified) {
      return res.status(400).json({ message: 'This account is already verified.' });
    }
    if (!user.verification_code || user.verification_code !== code) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }
    if (new Date(user.verification_expires) < new Date()) {
      return res.status(400).json({ message: 'Verification code expired. Please sign up again.' });
    }

    await pool.query(
      'UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?',
      [user.id]
    );

    await mailer.sendMail({
      to: user.email,
      subject: 'Welcome to AssetFlow',
      html: `<p>Hi ${user.name}, your email is verified. Welcome to AssetFlow!</p>`,
    });

    delete user.password_hash;
    user.is_verified = 1;
    const token = signToken(user);
    res.json({ message: 'Email verified. Welcome to AssetFlow!', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during verification.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Email not registered.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }
    if (!user.is_verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
    }
    const token = signToken(user);
    delete user.password_hash;
    res.json({ message: 'Login successful.', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

exports.me = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, department_id, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
  res.json(rows[0]);
};
