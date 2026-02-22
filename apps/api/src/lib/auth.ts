import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import { username } from 'better-auth/plugins/username';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { prisma } from './prisma.js';
import { allowedOrigins } from './origins.js';
import { validatePasswordStrength } from './password-validation.js';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  trustedOrigins: allowedOrigins,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  plugins: [
    admin({
      defaultRole: 'user',
    }),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
      strategy: 'compact',
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: {
      '/api/auth/sign-in/*': { window: 60, max: 5 },
      '/api/auth/sign-up/*': { window: 60, max: 3 },
      '/api/auth/callback/*': { window: 60, max: 10 },
      '/api/auth/change-password': { window: 60, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Password strength validation on all password-setting paths
      if (
        ['/sign-up/email', '/change-password', '/reset-password'].includes(
          ctx.path,
        )
      ) {
        const password =
          (ctx.body as { password?: string })?.password ||
          (ctx.body as { newPassword?: string })?.newPassword;
        if (password) {
          const error = validatePasswordStrength(password);
          if (error) {
            throw new APIError('BAD_REQUEST', {
              message: `Password too weak: ${error}`,
            });
          }
        }
      }

      // Intercept email/password sign-up
      if (ctx.path === '/sign-up/email') {
        const inviteToken = (ctx.body as { inviteToken?: string })
          ?.inviteToken;

        if (inviteToken) {
          const invite = await prisma.invite.findUnique({
            where: { token: inviteToken },
          });

          if (!invite || invite.status !== 'pending') {
            throw new APIError('FORBIDDEN', {
              message: 'Invalid or already used invite.',
            });
          }
          if (invite.expiresAt < new Date()) {
            await prisma.invite.update({
              where: { id: invite.id },
              data: { status: 'expired' },
            });
            throw new APIError('FORBIDDEN', {
              message: 'This invite has expired.',
            });
          }
          if (
            invite.email.toLowerCase() !==
            (ctx.body as { email?: string })?.email?.toLowerCase()
          ) {
            throw new APIError('FORBIDDEN', {
              message: 'This invite is for a different email address.',
            });
          }

          (ctx.context as Record<string, unknown>).inviteId = invite.id;
          (ctx.context as Record<string, unknown>).inviteRole = invite.role;
        }
        // If no invite token, we'll check for approved access request in databaseHooks
      }

      // Intercept OAuth callback (Google sign-up)
      if (ctx.path.startsWith('/callback/')) {
        const cookies = ctx.request?.headers.get('cookie') || '';
        const inviteToken = cookies
          .split(';')
          .find((c: string) => c.trim().startsWith('__invite_token='))
          ?.split('=')[1]
          ?.trim();

        if (inviteToken) {
          (ctx.context as Record<string, unknown>).oauthInviteToken =
            inviteToken;
        }
      }
    }),
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          console.log(
            `[auth] New session created for user ${session.userId}`,
          );
        },
      },
    },
    user: {
      create: {
        before: async (user, ctx) => {
          // 1. First admin bootstrapping
          const adminEmail = process.env.ADMIN_EMAIL;
          if (
            adminEmail &&
            user.email.toLowerCase() === adminEmail.toLowerCase()
          ) {
            const existingAdmin = await prisma.user.findFirst({
              where: { role: 'admin' },
            });
            if (!existingAdmin) {
              return { data: { ...user, role: 'admin' } };
            }
          }

          // 2. Invite token (OAuth path — from cookie)
          const oauthInviteToken = (
            ctx?.context as Record<string, unknown> | undefined
          )?.oauthInviteToken as string | undefined;
          if (oauthInviteToken) {
            const invite = await prisma.invite.findUnique({
              where: { token: oauthInviteToken },
            });

            if (!invite || invite.status !== 'pending') {
              throw new Error('Invalid or already used invite.');
            }
            if (invite.expiresAt < new Date()) {
              await prisma.invite.update({
                where: { id: invite.id },
                data: { status: 'expired' },
              });
              throw new Error('This invite has expired.');
            }
            if (
              invite.email.toLowerCase() !== user.email.toLowerCase()
            ) {
              throw new Error(
                'This invite is for a different email address.',
              );
            }

            await prisma.invite.update({
              where: { id: invite.id },
              data: { status: 'accepted', usedAt: new Date() },
            });
            return { data: { ...user, role: invite.role } };
          }

          // 3. Invite token (email sign-up path — validated in hooks.before)
          const inviteId = (
            ctx?.context as Record<string, unknown> | undefined
          )?.inviteId as string | undefined;
          const inviteRole = (
            ctx?.context as Record<string, unknown> | undefined
          )?.inviteRole as string | undefined;
          if (inviteId) {
            await prisma.invite.update({
              where: { id: inviteId },
              data: { status: 'accepted', usedAt: new Date() },
            });
            return { data: { ...user, role: inviteRole || 'user' } };
          }

          // 4. Approved access request
          const approvedRequest = await prisma.accessRequest.findFirst({
            where: {
              email: { equals: user.email, mode: 'insensitive' },
              status: 'approved',
            },
          });
          if (approvedRequest) {
            return { data: { ...user, role: approvedRequest.role } };
          }

          // 5. No valid path — block
          throw new Error(
            'An invite or approved access request is required to sign up.',
          );
        },
        after: async (user) => {
          console.log(`[auth] New user registered: ${user.email}`);
        },
      },
    },
  },
  basePath: '/api/auth',
});

export type Session = typeof auth.$Infer.Session;
