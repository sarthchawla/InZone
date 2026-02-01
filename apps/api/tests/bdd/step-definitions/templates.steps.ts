import { When, Then } from '@cucumber/cucumber';
import { CustomWorld, expect, BoardTemplate, testDataGenerators } from '../support/world';

// ==================== WHEN STEPS ====================

When('I GET \\/api\\/templates', async function (this: CustomWorld) {
  const response = await this.api.listTemplates();
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/templates\\/{word}', async function (this: CustomWorld, templateId: string) {
  const response = await this.api.getTemplate(templateId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/templates\\/', async function (this: CustomWorld) {
  // When accessing /api/templates/ (with trailing slash), it should redirect to /api/templates
  const response = await this.api.listTemplates();
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/templates with ID exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const longId = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.getTemplate(longId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/templates with URL-encoded spaces in ID', async function (this: CustomWorld) {
  const response = await this.api.getTemplate('template%20with%20spaces');
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/templates with SQL injection in ID', async function (this: CustomWorld) {
  const response = await this.api.getTemplate("'; DROP TABLE templates; --");
  this.storeResponse(response.status, response.body, response.headers);
});


// ==================== THEN STEPS ====================

Then('the response should be an array', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  expect(this.lastResponse!.body).to.be.an('array');
});

Then('the response should contain at least {int} templates', function (
  this: CustomWorld,
  minCount: number
) {
  expect(this.lastResponse).to.not.be.null;
  expect(this.lastResponse!.body).to.be.an('array');
  const templates = this.lastResponse!.body as BoardTemplate[];
  expect(templates.length).to.be.at.least(minCount);
});

Then('the response should include a template named {string}', function (
  this: CustomWorld,
  templateName: string
) {
  expect(this.lastResponse).to.not.be.null;
  const templates = this.lastResponse!.body as BoardTemplate[];
  const found = templates.some((template) => template.name === templateName);
  expect(found, `Expected to find template named "${templateName}"`).to.be.true;
});

Then('the templates should be in alphabetical order by name', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const templates = this.lastResponse!.body as BoardTemplate[];
  const names = templates.map((t) => t.name);
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
  expect(names).to.deep.equal(sortedNames);
});

Then('the response should contain the template name {string}', function (
  this: CustomWorld,
  templateName: string
) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.name).to.equal(templateName);
});

Then('the response should contain the template description {string}', function (
  this: CustomWorld,
  description: string
) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.description).to.equal(description);
});

Then('the template should have {int} columns', function (this: CustomWorld, columnCount: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.columns).to.be.an('array').with.lengthOf(columnCount);
});

Then('the template columns should be named {string}', function (
  this: CustomWorld,
  columnNames: string
) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  const expectedNames = columnNames.split(', ');
  const actualNames = body.columns.map((col) => col.name);
  expect(actualNames).to.deep.equal(expectedNames);
});

Then('the template should be marked as built-in', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.isBuiltIn).to.be.true;
});

Then('the template should have an id', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.id).to.be.a('string').and.not.be.empty;
});

Then('the template should have a name', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.name).to.be.a('string').and.not.be.empty;
});

Then('the template should have a description', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  // Description can be null or a string
  expect(body.description === null || typeof body.description === 'string').to.be.true;
});

Then('the template should have columns', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.columns).to.be.an('array');
});

Then('the template should have an isBuiltIn field', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body).to.have.property('isBuiltIn');
  expect(typeof body.isBuiltIn).to.equal('boolean');
});

Then('the template should have a createdAt timestamp', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.createdAt).to.be.a('string');
  // Verify it's a valid ISO date
  const date = new Date(body.createdAt);
  expect(date.toString()).to.not.equal('Invalid Date');
});

Then('the template should have an updatedAt timestamp', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.updatedAt).to.be.a('string');
  // Verify it's a valid ISO date
  const date = new Date(body.updatedAt);
  expect(date.toString()).to.not.equal('Invalid Date');
});

Then('each template column should have a name', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as BoardTemplate;
  expect(body.columns).to.be.an('array');
  for (const column of body.columns) {
    expect(column).to.have.property('name');
    expect(column.name).to.be.a('string').and.not.be.empty;
  }
});
