import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld, expect } from '../support/world';

// ==================== GIVEN STEPS ====================

Given('I am authenticated as an admin', async function (this: CustomWorld) {
  // TODO: Set up admin auth session via Better Auth API
  // This requires a running database with Better Auth tables
  // For now, store a placeholder flag
  this.testData.authRole = 'admin';
  this.testData.authCookies = ''; // Will be populated with session cookies
});

Given('an invite for {string} exists', async function (this: CustomWorld, email: string) {
  // TODO: Create invite directly in the database or via authenticated API call
  // For now, store the email for reference
  this.testData.inviteEmail = email;
  this.testData.inviteId = ''; // Will be populated with actual invite ID
});

Given('an invite for {string} exists with a known token', async function (this: CustomWorld, email: string) {
  // TODO: Create invite in database and capture the token
  this.testData.inviteEmail = email;
  this.testData.inviteToken = ''; // Will be populated with actual token
});

Given('an invite for {string} exists and is revoked', async function (this: CustomWorld, email: string) {
  // TODO: Create invite and update status to revoked
  this.testData.inviteEmail = email;
  this.testData.inviteId = ''; // Will be populated with actual invite ID
});

Given('an invite for {string} exists and is expired', async function (this: CustomWorld, email: string) {
  // TODO: Create invite with past expiresAt date
  this.testData.inviteEmail = email;
  this.testData.expiredInviteToken = ''; // Will be populated with actual token
});

Given('a user with email {string} exists', async function (this: CustomWorld, email: string) {
  // TODO: Create user directly in the database via Better Auth or Prisma
  this.testData.existingUserEmail = email;
});

// ==================== WHEN STEPS ====================

When('I POST to \\/api\\/invites with:', async function (this: CustomWorld, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.email !== undefined) payload.email = data.email;
  if (data.role !== undefined) payload.role = data.role;

  const response = await this.api.post('/api/invites', payload);
  this.storeResponse(response.status, response.body, response.headers);

  // Track created invite for reference
  if (response.status === 201) {
    const body = response.body as Record<string, unknown>;
    this.testData.inviteId = body.id;
  }
});

When('I GET \\/api\\/invites', async function (this: CustomWorld) {
  const response = await this.api.get('/api/invites');
  this.storeResponse(response.status, response.body, response.headers);
});

When('I DELETE the invite', async function (this: CustomWorld) {
  const inviteId = this.testData.inviteId as string;
  const response = await this.api.delete(`/api/invites/${inviteId}`);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I DELETE \\/api\\/invites\\/{word}', async function (this: CustomWorld, inviteId: string) {
  const response = await this.api.delete(`/api/invites/${inviteId}`);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/invites\\/validate with the token', async function (this: CustomWorld) {
  const token = this.testData.inviteToken as string;
  const response = await this.api.get(`/api/invites/validate?token=${token}`);
  this.storeResponse(response.status, response.body, response.headers);
});

When(/^I GET \/api\/invites\/validate\?token=(\w+)$/, async function (this: CustomWorld, token: string) {
  const response = await this.api.get(`/api/invites/validate?token=${token}`);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/invites\\/validate', async function (this: CustomWorld) {
  const response = await this.api.get('/api/invites/validate');
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/invites\\/set-token with the token', async function (this: CustomWorld) {
  const token = this.testData.inviteToken as string;
  const response = await this.api.post('/api/invites/set-token', { token });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/invites\\/set-token with:', async function (this: CustomWorld, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  const response = await this.api.post('/api/invites/set-token', data);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/invites\\/set-token with the expired token', async function (this: CustomWorld) {
  const token = this.testData.expiredInviteToken as string;
  const response = await this.api.post('/api/invites/set-token', { token });
  this.storeResponse(response.status, response.body, response.headers);
});

// ==================== THEN STEPS ====================

// Note: "the response status should be {int}" is already defined in boards.steps.ts

Then('the response should contain the invite email {string}', function (this: CustomWorld, email: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.email).to.equal(email);
});

Then('the response should contain the invite role {string}', function (this: CustomWorld, role: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.role).to.equal(role);
});

Then('the response should contain the invite status {string}', function (this: CustomWorld, status: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.status).to.equal(status);
});

Then('the response should contain an invite link', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.inviteLink).to.be.a('string').and.not.be.empty;
  expect(body.inviteLink as string).to.include('/signup?token=');
});

Then('the response should be an array with {int} items', function (this: CustomWorld, count: number) {
  expect(this.lastResponse).to.not.be.null;
  expect(this.lastResponse!.body).to.be.an('array').with.lengthOf(count);
});

Then('the invites should be ordered by creation date descending', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const invites = this.lastResponse!.body as Array<{ createdAt: string }>;
  for (let i = 1; i < invites.length; i++) {
    const prev = new Date(invites[i - 1].createdAt).getTime();
    const curr = new Date(invites[i].createdAt).getTime();
    expect(prev).to.be.at.least(curr);
  }
});

Then('the response should contain valid {word}', function (this: CustomWorld, value: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  const expected = value === 'true';
  expect(body.valid).to.equal(expected);
});

Then('the response should contain the email {string}', function (this: CustomWorld, email: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.email).to.equal(email);
});

Then('the response should contain success {word}', function (this: CustomWorld, value: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  const expected = value === 'true';
  expect(body.success).to.equal(expected);
});

Then('the response should set an invite cookie', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const setCookie = this.lastResponse!.headers['set-cookie'];
  expect(setCookie).to.not.be.undefined;
  expect(String(setCookie)).to.include('__invite_token');
});

// Note: "the response should contain error {string}" is already defined in boards.steps.ts
