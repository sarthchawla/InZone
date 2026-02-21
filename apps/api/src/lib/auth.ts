import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.js';
import { allowedOrigins } from './origins.js';

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
    enabled: false,
  },
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
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          console.log(`[auth] New session created for user ${session.userId}`);
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          console.log(`[auth] New user registered: ${user.email}`);
        },
      },
    },
  },
  basePath: '/api/auth',
});

export type Session = typeof auth.$Infer.Session;
