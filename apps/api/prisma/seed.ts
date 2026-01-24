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

  // Seed default labels
  const defaultLabels = [
    { id: 'label-bug', name: 'Bug', color: '#ef4444' },
    { id: 'label-feature', name: 'Feature', color: '#3b82f6' },
    { id: 'label-enhancement', name: 'Enhancement', color: '#8b5cf6' },
    { id: 'label-documentation', name: 'Documentation', color: '#06b6d4' },
    { id: 'label-urgent', name: 'Urgent', color: '#f97316' },
    { id: 'label-blocked', name: 'Blocked', color: '#6b7280' },
  ];

  for (const label of defaultLabels) {
    await prisma.label.upsert({
      where: { id: label.id },
      update: {},
      create: label,
    });
  }

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
