const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// HELMET — adds security headers to every response
app.use(helmet());

// CORS — allow requests from both frontend apps
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4201'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// RATE LIMITING — limit each IP to 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});

// STRICT RATE LIMITING — limit login attempts to 10 per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again later.' }
});

// Apply general limiter to all routes
app.use(generalLimiter);

const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');
const patientRoutes = require('./routes/patients');
const systemRoutes = require('./routes/systems');

// Apply strict limiter to login route only
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/systems', systemRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Audit Log System API is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});