const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const morgan = require('morgan');
const winston = require('winston');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cookieParser());

// ✅ Setup CORS
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

// ✅ Setup Logging (Terminal + File)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console(), // Logs to Terminal
    new winston.transports.File({ filename: 'logs/app.log' }), // Logs to File
  ],
});

// ✅ Log API Requests in Terminal & File
// app.use(
//   morgan('combined', {
//     stream: { write: (message) => logger.info(message.trim()) },
//   })
// );
app.use(
  morgan((tokens, req, res) => {
    const logMessage = [
      tokens.method(req, res), // HTTP Method (GET, POST, etc.)
      tokens.url(req, res), // Request URL
      `Status: ${tokens.status(req, res)}`, // Response Status Code
      `Origin: ${req.get('origin') || 'Unknown'}`, // ✅ Incoming Request Origin
      `IP: ${tokens['remote-addr'](req, res)}`, // Client IP Address
      `User-Agent: ${tokens['user-agent'](req, res)}`, // User-Agent Header
    ].join(' | ');

    logger.info(logMessage); // Log to Terminal & File
    return logMessage;
  })
);

const USERS_FILE = 'users1.json';
const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey';

// 📌 Read Users from File
const readUsers = () => {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (err) {
    logger.error(`Error reading users file: ${err.message}`);
    return [];
  }
};

// 📌 Write Users to File
const writeUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    logger.info('User data updated successfully');
  } catch (err) {
    logger.error(`Error writing users file: ${err.message}`);
  }
};

// 🔹 Signup Route
app.post('/api/signup', (req, res) => {
  const { email, password, role } = req.body;
  let users = readUsers();

  if (!email || !password || !role) {
    logger.warn('Signup failed: Missing fields');
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (users.find((u) => u.email === email)) {
    logger.warn(`Signup failed: User ${email} already exists`);
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  users.push({
    email,
    password: hashedPassword,
    role,
    createdAt: new Date().getFullYear(), // Store only the Year
  });
  writeUsers(users);

  const token = jwt.sign({ email, role }, SECRET_KEY, { expiresIn: '1h' });

  // res.cookie('token', token, {
  //   httpOnly: true,
  //   sameSite: 'Strict',
  //   secure: process.env.NODE_ENV === 'production',
  // });

  res.cookie('token', token, {
    httpOnly: true, // ✅ Prevents JavaScript access (more secure)
    sameSite: 'Lax', // ✅ Allows cross-site requests if initiated by the same site
    secure: false, // ❌ Set to true in production with HTTPS
    maxAge: 60 * 60 * 1000, // ✅ 1 hour expiry (milliseconds)
  });

  logger.info(`New user signed up: ${email} as ${role}`);
  res.json({
    message: 'User registered & logged in successfully',
    role,
    email,
    token,
    allUsers: users,
  });
});

// 🔹 Login Route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find((u) => u.email === email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    logger.warn(`Login failed for ${email}: Invalid credentials`);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ email: user.email, role: user.role }, SECRET_KEY, {
    expiresIn: '1h',
  });

  res.cookie('token', token, {
    httpOnly: true, // ✅ Prevents JavaScript access (more secure)
    sameSite: 'Lax', // ✅ Allows cross-site requests if initiated by the same site
    secure: false, // ❌ Set to true in production with HTTPS
    maxAge: 60 * 60 * 1000, // ✅ 1 hour expiry (milliseconds)
  });

  logger.info(`User logged in: ${email}`);
  res.json({
    message: 'Login successful',
    role: user.role,
    user: user.email,
    createdAt: user.createdAt,
  });
});

// 🔹 Logout Route
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  logger.info(`User logged out`);
  res.json({ message: 'Logged out successfully' });
});

// 🔹 Middleware: Authenticate Token
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    logger.warn('Unauthorized access attempt');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      logger.error('Invalid token used');
      return res.status(401).json({ message: 'Invalid Token' });
    }
    req.user = decoded;
    next();
  });
};

// 🔹 Protected Route
app.get('/api/protected', authenticateToken, (req, res) => {
  logger.info(`Protected route accessed by ${req.user.email}`);
  res.json({ message: `Welcome ${req.user.role}!`, user: req.user });
});

// 🔹 Public Test Route
app.get('/api/test', (req, res) => {
  logger.info('Test API accessed');
  res.json({ message: 'API working Fine!' });
});

// 🔹 Fetch User Profile Route
app.get('/api/profile', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.email === req.user.email);

  if (!user) {
    logger.warn(`Profile fetch failed: User ${req.user.email} not found`);
    return res.status(404).json({ message: 'User not found' });
  }

  // Exclude password before sending response
  const { password, ...userDetails } = user;

  logger.info(`Profile accessed: ${req.user.email}`);
  res.json(userDetails);
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'Lax',
    secure: false, // Change to `true` in production with HTTPS
  });
  logger.info(`User logged out`);
  res.json({ message: 'Logged out successfully' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
