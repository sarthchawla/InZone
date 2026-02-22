import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { hashPassword } from 'better-auth/crypto';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validatePasswordStrength } from '../lib/password-validation.js';

export const accessRequestsRouter: RouterType = Router();

const createRequestSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required').max(100),
  reason: z.string().max(500).optional(),
  password: z.string().min(1, 'Password is required'),
});

const approveSchema = z.object({
  role: z.enum(['admin', 'user']).default('user'),
});

// POST /api/access-requests - Submit access request (Public)
accessRequestsRouter.post('/', async (req, res, next) => {
  try {
    const body = createRequestSchema.parse(req.body);
    const email = body.email.toLowerCase();

    // Validate password strength
    const passwordError = validatePasswordStrength(body.password);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }

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

    const passwordHash = await hashPassword(body.password);

    const request = await prisma.accessRequest.create({
      data: {
        email,
        name: body.name,
        reason: body.reason,
        passwordHash,
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
      select: {
        id: true,
        email: true,
        name: true,
        reason: true,
        status: true,
        role: true,
        reviewedBy: true,
        reviewedAt: true,
        createdAt: true,
      },
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

    // Check if a user with this email already exists (e.g. signed up via OAuth in the meantime)
    const existingUser = await prisma.user.findUnique({
      where: { email: request.email },
    });

    const now = new Date();

    if (existingUser) {
      // User already exists — just approve the request without creating a duplicate
      const updated = await prisma.accessRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          role: body.role,
          reviewedBy: req.user!.id,
          reviewedAt: now,
        },
      });
      res.json(updated);
      return;
    }

    const userId = nanoid();

    const [updated] = await prisma.$transaction([
      prisma.accessRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          role: body.role,
          reviewedBy: req.user!.id,
          reviewedAt: now,
        },
      }),
      prisma.user.create({
        data: {
          id: userId,
          name: request.name,
          email: request.email,
          emailVerified: false,
          role: body.role,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.account.create({
        data: {
          id: nanoid(),
          userId,
          accountId: userId,
          providerId: 'credential',
          password: request.passwordHash,
          createdAt: now,
          updatedAt: now,
        },
      }),
    ]);

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
