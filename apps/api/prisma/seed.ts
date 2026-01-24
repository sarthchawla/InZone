import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed built-in templates
  await prisma.boardTemplate.upsert({
    where: { id: 'kanban-basic' },
    update: {},
    create: {
      id: 'kanban-basic',
      name: 'Basic Kanban',
      description: 'Simple three-column Kanban board',
      isBuiltIn: true,
      columns: [
        { name: 'Todo' },
        { name: 'In Progress' },
        { name: 'Done' }
      ]
    }
  });

  await prisma.boardTemplate.upsert({
    where: { id: 'dev-workflow' },
    update: {},
    create: {
      id: 'dev-workflow',
      name: 'Development',
      description: 'Software development workflow',
      isBuiltIn: true,
      columns: [
        { name: 'Backlog' },
        { name: 'Todo' },
        { name: 'In Progress' },
        { name: 'Review' },
        { name: 'Done' }
      ]
    }
  });

  await prisma.boardTemplate.upsert({
    where: { id: 'simple' },
    update: {},
    create: {
      id: 'simple',
      name: 'Simple',
      description: 'Minimal two-column setup',
      isBuiltIn: true,
      columns: [
        { name: 'Todo' },
        { name: 'Done' }
      ]
    }
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
