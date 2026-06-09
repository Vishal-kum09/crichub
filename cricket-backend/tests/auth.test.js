// Auth tests — register/login JWT shape, approval gate, token expiry. The auth
// repository is mocked; bcrypt + jsonwebtoken run for real.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

jest.mock('../db', () => ({
  withTransaction: (cb) => cb({ query: async () => ({ rows: [{}] }) }),
  query: async () => ({ rows: [] }),
  pool: { query: async () => ({ rows: [] }), on: () => {} },
  testConnection: async () => {}
}));
jest.mock('../src/repositories/authRepository', () => ({
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  createClub: jest.fn(),
  updateLastLogin: jest.fn(async () => {}),
  createOtp: jest.fn(),
  findValidOtp: jest.fn(),
  markOtpVerified: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authRepo = require('../src/repositories/authRepository');
const authRoutes = require('../src/routes/authRoutes');
const scorerRoutes = require('../src/routes/scorerRoutes');
const { errorHandler } = require('../src/middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/scorer', scorerRoutes);
app.use(errorHandler);

const PASSWORD = 'Password123';
const userRow = {
  user_id: 'u-1', email: 'p@example.com', first_name: 'Pat', last_name: 'Player',
  display_name: 'Pat Player', password_hash: bcrypt.hashSync(PASSWORD, 4),
  account_role: 'Player', club_id: null, is_approved: true, is_active: true
};

describe('Auth', () => {
  test('Test 1 — register + login returns JWT with exactly { user_id, role, club_id, is_approved, iat, exp }', async () => {
    authRepo.createUser.mockResolvedValue({
      user_id: 'u-1', email: userRow.email, first_name: 'Pat', last_name: 'Player',
      display_name: 'Pat Player', account_role: 'Viewer', club_id: null, is_approved: false
    });
    const reg = await request(app).post('/api/auth/register').send({
      first_name: 'Pat', last_name: 'Player', email: userRow.email, password: PASSWORD
    });
    expect(reg.status).toBe(201);

    authRepo.findUserByEmail.mockResolvedValue(userRow);
    const login = await request(app).post('/api/auth/login').send({ email: userRow.email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');

    const decoded = jwt.verify(login.body.token, process.env.JWT_SECRET);
    expect(Object.keys(decoded).sort()).toEqual(['club_id', 'exp', 'iat', 'is_approved', 'role', 'user_id']);
    expect(decoded.user_id).toBe('u-1');
    expect(decoded.role).toBe('Player');
    expect(decoded.is_approved).toBe(true);
  });

  test('Test 2 — is_approved=false token hits scorer endpoint → 403', async () => {
    const token = jwt.sign(
      { user_id: 'u-2', role: 'Scorer', club_id: null, is_approved: false },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .get('/api/scorer/matches/assigned')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('Test 3 — expired token → 401', async () => {
    const token = jwt.sign(
      { user_id: 'u-3', role: 'Scorer', club_id: null, is_approved: true },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/scorer/matches/assigned')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
