/**
 * Test Database Configuration and Utilities
 *
 * Provides isolated test database setup for BDD tests.
 * Supports both local development and CI environments.
 */

import { PrismaClient } from '@prisma/client';

// Test database URL - uses TEST_DATABASE_URL if available, otherwise falls back to DATABASE_URL
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error(
    'Database URL not configured. Set TEST_DATABASE_URL or DATABASE_URL environment variable.'
  );
}

// Create a dedicated Prisma client for testing
let testPrisma: PrismaClient | null = null;

/**
 * Get or create the test Prisma client
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL,
        },
      },
      log: process.env.DEBUG_TESTS ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return testPrisma;
}

/**
 * Connect to the test database
 */
export async function connectTestDatabase(): Promise<void> {
  const prisma = getTestPrisma();
  await prisma.$connect();
  console.log('Connected to test database');
}

/**
 * Disconnect from the test database
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
    console.log('Disconnected from test database');
  }
}

/** Well-known test user ID used by all BDD board-creation helpers.
 *  Matches the DEV_USER id in src/middleware/auth.ts so that boards
 *  created via the API (with auth bypass) and boards created directly
 *  in the database share the same owner. */
export const BDD_TEST_USER_ID = 'dev-user-000';

/**
 * Clean all data from the test database
 * Deletes in correct order to respect foreign key constraints
 */
export async function cleanTestDatabase(): Promise<void> {
  const prisma = getTestPrisma();

  // Delete in reverse dependency order
  // 1. First delete todos (they reference columns and labels)
  await prisma.todo.deleteMany({});

  // 2. Delete labels (many-to-many with todos, but todos are already deleted)
  await prisma.label.deleteMany({});

  // 3. Delete columns (they reference boards)
  await prisma.column.deleteMany({});

  // 4. Delete boards
  await prisma.board.deleteMany({});

  // 5. Delete board templates (no dependencies)
  await prisma.boardTemplate.deleteMany({});

  // 6. Delete auth-related tables
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Test database cleaned');
}

/**
 * Reset the test database to initial state with seed data
 */
export async function resetTestDatabase(): Promise<void> {
  await cleanTestDatabase();
  await seedTestDatabase();
}

/**
 * Seed the test database with built-in templates
 */
export async function seedTestDatabase(): Promise<void> {
  const prisma = getTestPrisma();

  // Ensure the dev/test user exists for board ownership
  // This user matches the DEV_USER in src/middleware/auth.ts
  await prisma.user.upsert({
    where: { id: BDD_TEST_USER_ID },
    update: {},
    create: {
      id: BDD_TEST_USER_ID,
      name: 'Dev User',
      email: 'dev@localhost',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Seed built-in templates (same as prisma/seed.ts)
  await prisma.boardTemplate.createMany({
    data: [
      {
        id: 'kanban-basic',
        name: 'Basic Kanban',
        description: 'Simple three-column Kanban board',
        isBuiltIn: true,
        columns: [{ name: 'Todo' }, { name: 'In Progress' }, { name: 'Done' }],
      },
      {
        id: 'dev-workflow',
        name: 'Development',
        description: 'Software development workflow',
        isBuiltIn: true,
        columns: [
          { name: 'Backlog' },
          { name: 'Todo' },
          { name: 'In Progress' },
          { name: 'Review' },
          { name: 'Done' },
        ],
      },
      {
        id: 'simple',
        name: 'Simple',
        description: 'Minimal two-column setup',
        isBuiltIn: true,
        columns: [{ name: 'Todo' }, { name: 'Done' }],
      },
    ],
    skipDuplicates: true,
  });

  console.log('Test database seeded with templates');
}

/**
 * Create test data helpers
 */
export const testDataFactory = {
  /**
   * Create a test board
   */
  async createBoard(data: { name: string; description?: string; templateId?: string; position?: number; userId?: string }) {
    const prisma = getTestPrisma();
    return prisma.board.create({
      data: {
        name: data.name,
        description: data.description,
        templateId: data.templateId,
        position: data.position,
        userId: data.userId ?? BDD_TEST_USER_ID,
      },
      include: {
        columns: {
          include: {
            todos: true,
          },
        },
      },
    });
  },

  /**
   * Create a test column
   */
  async createColumn(data: { name: string; boardId: string; position?: number; description?: string; wipLimit?: number }) {
    const prisma = getTestPrisma();
    return prisma.column.create({
      data: {
        name: data.name,
        boardId: data.boardId,
        position: data.position ?? 0,
        description: data.description,
        wipLimit: data.wipLimit,
      },
    });
  },

  /**
   * Create a test todo
   */
  async createTodo(data: {
    title: string;
    columnId: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    position?: number;
  }) {
    const prisma = getTestPrisma();
    return prisma.todo.create({
      data: {
        title: data.title,
        columnId: data.columnId,
        description: data.description,
        priority: data.priority ?? 'MEDIUM',
        position: data.position ?? 0,
      },
      include: {
        labels: true,
      },
    });
  },

  /**
   * Create a test label
   */
  async createLabel(data: { name: string; color: string }) {
    const prisma = getTestPrisma();
    return prisma.label.create({
      data: {
        name: data.name,
        color: data.color,
      },
    });
  },

  /**
   * Create a complete board with columns and todos for testing
   */
  async createBoardWithTodos(data: {
    name: string;
    columns: Array<{ name: string; todos: Array<{ title: string }> }>;
    userId?: string;
  }) {
    const prisma = getTestPrisma();

    const board = await prisma.board.create({
      data: {
        name: data.name,
        userId: data.userId ?? BDD_TEST_USER_ID,
        columns: {
          create: data.columns.map((col, colIndex) => ({
            name: col.name,
            position: colIndex,
            todos: {
              create: col.todos.map((todo, todoIndex) => ({
                title: todo.title,
                position: todoIndex,
              })),
            },
          })),
        },
      },
      include: {
        columns: {
          include: {
            todos: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    return board;
  },
};

/**
 * Export the test Prisma client type for use in tests
 */
export type { PrismaClient };
