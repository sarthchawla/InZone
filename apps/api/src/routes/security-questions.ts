import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const securityQuestionsRouter: RouterType = Router();

export const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'In what city were you born?',
  'What was the name of your first school?',
  "What is your mother's maiden name?",
  'What was the make of your first car?',
  'What is the name of the street you grew up on?',
  'What was your childhood nickname?',
  'What is your favorite book?',
];

const setupSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string().min(2, 'Answer must be at least 2 characters'),
      }),
    )
    .length(3, 'Exactly 3 security questions required'),
});

const identifierSchema = z.object({
  identifier: z.string().min(1),
});

const verifySchema = z.object({
  identifier: z.string().min(1),
  answers: z.array(z.string()).length(3, 'Exactly 3 answers required'),
});

// POST /api/security-questions/setup - Set/update security questions (Authenticated)
securityQuestionsRouter.post('/setup', requireAuth, async (req, res, next) => {
  try {
    const body = setupSchema.parse(req.body);

    // Validate all questions are from the predefined pool
    const questions = body.questions.map((q) => q.question);
    for (const q of questions) {
      if (!SECURITY_QUESTIONS.includes(q)) {
        res.status(400).json({ error: `Invalid question: "${q}"` });
        return;
      }
    }

    // All 3 must be different
    if (new Set(questions).size !== 3) {
      res.status(400).json({ error: 'All 3 questions must be different.' });
      return;
    }

    // Hash answers
    const hashed = await Promise.all(
      body.questions.map(async (q, i) => ({
        question: q.question,
        answer: await bcrypt.hash(q.answer.trim().toLowerCase(), 10),
        order: i + 1,
      })),
    );

    // Replace existing questions in a transaction
    await prisma.$transaction([
      prisma.securityQuestion.deleteMany({
        where: { userId: req.user!.id },
      }),
      ...hashed.map((q) =>
        prisma.securityQuestion.create({
          data: {
            userId: req.user!.id,
            question: q.question,
            answer: q.answer,
            order: q.order,
          },
        }),
      ),
    ]);

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

// GET /api/security-questions/status - Check if questions configured (Authenticated)
securityQuestionsRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    const count = await prisma.securityQuestion.count({
      where: { userId: req.user!.id },
    });
    res.json({ configured: count === 3 });
  } catch (err) {
    next(err);
  }
});

// POST /api/security-questions/questions - Get questions for identifier (Public)
securityQuestionsRouter.post('/questions', async (req, res, next) => {
  try {
    const body = identifierSchema.parse(req.body);
    const identifier = body.identifier.trim();

    // Find user by email or username
    const isEmail = identifier.includes('@');
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: identifier, mode: 'insensitive' } }
        : { username: { equals: identifier, mode: 'insensitive' } },
    });

    if (user) {
      const questions = await prisma.securityQuestion.findMany({
        where: { userId: user.id },
        orderBy: { order: 'asc' },
        select: { question: true },
      });

      if (questions.length === 3) {
        res.json({ questions: questions.map((q) => q.question) });
        return;
      }
    }

    // Return fake questions to prevent user enumeration
    const fakeQuestions = [
      SECURITY_QUESTIONS[0],
      SECURITY_QUESTIONS[2],
      SECURITY_QUESTIONS[5],
    ];
    res.json({ questions: fakeQuestions });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

// POST /api/security-questions/verify - Verify answers, return reset token (Public)
securityQuestionsRouter.post('/verify', async (req, res, next) => {
  try {
    const body = verifySchema.parse(req.body);
    const identifier = body.identifier.trim();

    // Find user
    const isEmail = identifier.includes('@');
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: identifier, mode: 'insensitive' } }
        : { username: { equals: identifier, mode: 'insensitive' } },
    });

    if (!user) {
      res.status(400).json({ error: 'Incorrect answers.' });
      return;
    }

    // Get stored questions
    const stored = await prisma.securityQuestion.findMany({
      where: { userId: user.id },
      orderBy: { order: 'asc' },
    });

    if (stored.length !== 3) {
      res.status(400).json({ error: 'Incorrect answers.' });
      return;
    }

    // Verify all 3 answers
    const results = await Promise.all(
      stored.map((sq, i) =>
        bcrypt.compare(body.answers[i].trim().toLowerCase(), sq.answer),
      ),
    );

    if (!results.every(Boolean)) {
      res.status(400).json({ error: 'Incorrect answers.' });
      return;
    }

    // All correct — create a short-lived reset token via Verification table
    const resetToken = nanoid(32);
    await prisma.verification.create({
      data: {
        id: nanoid(),
        identifier: user.email,
        value: resetToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({ resetToken });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});
