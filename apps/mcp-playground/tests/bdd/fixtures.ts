import { test as base } from 'playwright-bdd';

type Fixtures = {
  apiUrl: string;
};

export const test = base.extend<Fixtures>({
  apiUrl: [process.env.API_URL || `http://localhost:${process.env.API_PORT || '3001'}`, { option: true }],
});

export { expect } from '@playwright/test';
