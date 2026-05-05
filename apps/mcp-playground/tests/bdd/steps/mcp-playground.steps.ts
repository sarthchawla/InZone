import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

let mcpToken = '';

Given('I have a valid MCP token for the playground', async ({ request, apiUrl }) => {
  const response = await request.post(`${apiUrl}/api/mcp-tokens`, {
    data: {
      name: `BDD MCP Playground ${Date.now()}`,
      expiresIn: '30d',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { token: string };
  mcpToken = body.token;
});

When('I open the MCP playground', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'InZone MCP Playground' })).toBeVisible();
  await page.getByLabel('Bearer token').fill(mcpToken);
});

When('I connect the playground to the MCP server', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByTestId('connection-status')).toHaveText('connected', { timeout: 15000 });
});

Then('I should see MCP tool {string}', async ({ page }, toolName: string) => {
  await expect(page.getByRole('button', { name: new RegExp(toolName) })).toBeVisible();
});

When('I run MCP tool {string} with arguments {string}', async ({ page }, toolName: string, args: string) => {
  await page.getByRole('button', { name: new RegExp(toolName) }).click();
  await page.getByLabel('Arguments JSON').fill(args);
  await page.getByRole('button', { name: 'Run Tool' }).click();
});

Then('the MCP playground result should include {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('region', { name: 'MCP result' })).toContainText(text, { timeout: 15000 });
});

Then('the MCP playground error should include {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('region', { name: 'MCP result' })).toContainText(text, { timeout: 15000 });
});
