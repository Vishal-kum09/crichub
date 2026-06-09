// Admin tests — tenant isolation hard block + approval flips is_approved. The
// club-admin repository is mocked; the real service/middleware stack runs.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

jest.mock('../db', () => ({
  withTransaction: (cb) => cb({ query: async () => ({ rows: [{}] }) }),
  query: async () => ({ rows: [] }),
  pool: { query: async () => ({ rows: [] }), on: () => {} },
  testConnection: async () => {}
}));
jest.mock('../src/repositories/clubAdminRepository', () => ({
  getUserTenant: jest.fn(),
  approveUser: jest.fn(),
  rejectUser: jest.fn(),
  findPendingApprovals: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const repo = require('../src/repositories/clubAdminRepository');
const clubAdminRoutes = require('../src/routes/clubAdminRoutes');
const { errorHandler } = require('../src/middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/club-admin', clubAdminRoutes);
app.use(errorHandler);

const TARGET = '11111111-1111-4111-8111-111111111111';
const adminToken = (clubId) => jwt.sign(
  { user_id: 'admin-1', role: 'Club_Admin', club_id: clubId, is_approved: true },
  process.env.JWT_SECRET
);

describe('Admin', () => {
  test('Test 1 — Club_A admin → Club_B resource → 403 "Access Denied: Tenant Isolation Mismatch"', async () => {
    repo.getUserTenant.mockResolvedValue({ user_id: TARGET, club_id: 'club-B', account_role: 'Viewer' });
    const res = await request(app)
      .put(`/api/club-admin/approvals/${TARGET}`)
      .set('Authorization', `Bearer ${adminToken('club-A')}`)
      .send({ action: 'APPROVE', assigned_role: 'Scorer' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Access Denied: Tenant Isolation Mismatch');
  });

  test('Test 2 — Approve user → is_approved flips true in DB', async () => {
    repo.getUserTenant.mockResolvedValue({ user_id: TARGET, club_id: 'club-A', account_role: 'Viewer' });
    repo.approveUser.mockResolvedValue({
      user_id: TARGET, display_name: 'New Scorer', email: 's@e.com',
      account_role: 'Scorer', is_approved: true
    });

    const res = await request(app)
      .put(`/api/club-admin/approvals/${TARGET}`)
      .set('Authorization', `Bearer ${adminToken('club-A')}`)
      .send({ action: 'APPROVE', assigned_role: 'Scorer' });

    expect(res.status).toBe(200);
    expect(res.body.user.is_approved).toBe(true);
    // The persisted update was bound to the admin's own club and the new role.
    expect(repo.approveUser).toHaveBeenCalledWith(TARGET, 'club-A', 'Scorer', 'scorer');
  });
});
