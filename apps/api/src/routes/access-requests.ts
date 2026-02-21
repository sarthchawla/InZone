import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export const accessRequestsRouter: RouterType = Router();

const createRequestSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required').max(100),
  reason: z.string().max(500).optional(),
});

const approveSchema = z.object({
  role: z.enum(['admin', 'user']).default('user'),
});

// POST /api/access-requests - Submit access request (Public)
accessRequestsRouter.post('/', async (req, res, next) => {
  try {
    const body = createRequestSchema.parse(req.body);
    const email = body.email.toLowerCase();

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      res.status(400).json({ error: 'You already have an account. Try signing in.' });
      return;
    }

    // Check for existing pending request
    const existingRequest = await prisma.accessRequest.findFirst({
      where: { email, status: 'pending' },
    });
    if (existingRequest) {
      res.status(400).json({ error: "You've already submitted a request." });
      return;
    }

    const request = await prisma.accessRequest.create({
      data: {
        email,
        name: body.name,
        reason: body.reason,
      },
    });

    res.status(201).json({
      id: request.id,
      status: 'pending',
      message: 'Your request has been submitted.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

// GET /api/access-requests - List all requests (Admin only)
accessRequestsRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status } : {};

    const requests = await prisma.accessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// POST /api/access-requests/:id/approve - Approve request (Admin only)
accessRequestsRouter.post('/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const body = approveSchema.parse(req.body || {});

    const request = await prisma.accessRequest.findUnique({
      where: { id: req.params.id as string },
    });

    if (!request) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(400).json({ error: 'This request has already been reviewed.' });
      return;
    }

    const updated = await prisma.accessRequest.update({
      where: { id: request.id },
      data: {
        status: 'approved',
        role: body.role,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

// POST /api/access-requests/:id/reject - Reject request (Admin only)
accessRequestsRouter.post('/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const request = await prisma.accessRequest.findUnique({
      where: { id: req.params.id as string },
    });

    if (!request) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(400).json({ error: 'This request has already been reviewed.' });
      return;
    }

    const updated = await prisma.accessRequest.update({
      where: { id: request.id },
      data: {
        status: 'rejected',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
