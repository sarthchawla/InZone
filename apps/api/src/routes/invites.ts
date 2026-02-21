import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export const invitesRouter: RouterType = Router();

const createInviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'user']),
});

const setTokenSchema = z.object({
  token: z.string().min(1),
});

// POST /api/invites - Create invite (Admin only)
invitesRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const body = createInviteSchema.parse(req.body);

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existingUser) {
      res.status(400).json({ error: 'This email is already registered.' });
      return;
    }

    // Check if a pending invite already exists
    const existingInvite = await prisma.invite.findFirst({
      where: { email: body.email.toLowerCase(), status: 'pending' },
    });
    if (existingInvite) {
      res.status(400).json({ error: 'A pending invite already exists for this email.' });
      return;
    }

    const token = nanoid(32);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const invite = await prisma.invite.create({
      data: {
        email: body.email.toLowerCase(),
        token,
        role: body.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdBy: req.user!.id,
      },
    });

    res.status(201).json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      inviteLink: `${frontendUrl}/signup?token=${token}`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

// GET /api/invites - List all invites (Admin only)
invitesRouter.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { name: true, email: true } } },
    });
    res.json(invites);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/invites/:id - Revoke invite (Admin only)
invitesRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { id: req.params.id as string },
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found.' });
      return;
    }
    if (invite.status !== 'pending') {
      res.status(400).json({ error: 'Only pending invites can be revoked.' });
      return;
    }

    const updated = await prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'revoked' },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/invites/validate - Validate token (Public)
invitesRouter.get('/validate', async (req, res, next) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.json({ valid: false });
      return;
    }

    const invite = await prisma.invite.findUnique({ where: { token } });

    if (!invite || invite.status !== 'pending') {
      res.json({ valid: false });
      return;
    }
    if (invite.expiresAt < new Date()) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      res.json({ valid: false });
      return;
    }

    res.json({ valid: true, email: invite.email });
  } catch (err) {
    next(err);
  }
});

// POST /api/invites/set-token - Set invite cookie for OAuth (Public)
invitesRouter.post('/set-token', async (req, res, next) => {
  try {
    const body = setTokenSchema.parse(req.body);

    const invite = await prisma.invite.findUnique({
      where: { token: body.token },
    });

    if (!invite || invite.status !== 'pending') {
      res.status(400).json({ error: 'Invalid invite token.' });
      return;
    }
    if (invite.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invite has expired.' });
      return;
    }

    res.cookie('__invite_token', body.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/',
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});
