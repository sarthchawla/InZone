import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld, expect } from '../support/world';

// ==================== GIVEN STEPS ====================

// Note: "I am authenticated as an admin" is defined in invites.steps.ts
// Note: "a user with email {string} exists" is defined in invites.steps.ts

Given('an access request from {string} exists', async function (this: CustomWorld, email: string) {
  // TODO: Create access request directly in the database via Prisma
  this.testData.accessRequestEmail = email;
  this.testData.accessRequestId = ''; // Will be populated with actual ID
});

Given('an access request from {string} with status {string} exists', async function (
  this: CustomWorld,
  email: string,
  status: string,
) {
  // TODO: Create access request in database with the given status
  this.testData.accessRequestEmail = email;
  this.testData.accessRequestStatus = status;
  this.testData.accessRequestId = ''; // Will be populated with actual ID
});

// ==================== WHEN STEPS ====================

When('I POST to \\/api\\/access-requests with:', async function (this: CustomWorld, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.email !== undefined) payload.email = data.email;
  if (data.name !== undefined) payload.name = data.name;
  if (data.reason !== undefined) payload.reason = data.reason;

  const response = await this.api.post('/api/access-requests', payload);
  this.storeResponse(response.status, response.body, response.headers);

  // Track created request for reference
  if (response.status === 201) {
    const body = response.body as Record<string, unknown>;
    this.testData.accessRequestId = body.id;
  }
});

When('I GET \\/api\\/access-requests', async function (this: CustomWorld) {
  const response = await this.api.get('/api/access-requests');
  this.storeResponse(response.status, response.body, response.headers);
});

When(/^I GET \/api\/access-requests\?status=(\w+)$/, async function (this: CustomWorld, status: string) {
  const response = await this.api.get(`/api/access-requests?status=${status}`);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to approve the access request', async function (this: CustomWorld) {
  const requestId = this.testData.accessRequestId as string;
  const response = await this.api.post(`/api/access-requests/${requestId}/approve`, {});
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to approve the access request with:', async function (this: CustomWorld, dataTable: DataTable) {
  const requestId = this.testData.accessRequestId as string;
  const data = dataTable.rowsHash();
  const response = await this.api.post(`/api/access-requests/${requestId}/approve`, data);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to reject the access request', async function (this: CustomWorld) {
  const requestId = this.testData.accessRequestId as string;
  const response = await this.api.post(`/api/access-requests/${requestId}/reject`, {});
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST \\/api\\/access-requests\\/{word}\\/approve', async function (this: CustomWorld, requestId: string) {
  const response = await this.api.post(`/api/access-requests/${requestId}/approve`, {});
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST \\/api\\/access-requests\\/{word}\\/reject', async function (this: CustomWorld, requestId: string) {
  const response = await this.api.post(`/api/access-requests/${requestId}/reject`, {});
  this.storeResponse(response.status, response.body, response.headers);
});

// ==================== THEN STEPS ====================

// Note: "the response status should be {int}" is already defined in boards.steps.ts
// Note: "the response should be an array with {int} items" is defined in invites.steps.ts
// Note: "the response should contain error {string}" is defined in invites.steps.ts

Then('the response should contain the access request status {string}', function (this: CustomWorld, status: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.status).to.equal(status);
});

Then('the response should contain the message {string}', function (this: CustomWorld, message: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.message).to.equal(message);
});

Then('the response should contain the access request role {string}', function (this: CustomWorld, role: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.role).to.equal(role);
});

Then('the first access request email should be {string}', function (this: CustomWorld, email: string) {
  expect(this.lastResponse).to.not.be.null;
  const requests = this.lastResponse!.body as Array<{ email: string }>;
  expect(requests).to.be.an('array').and.not.be.empty;
  expect(requests[0].email).to.equal(email);
});
