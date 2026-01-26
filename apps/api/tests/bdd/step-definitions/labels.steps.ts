import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld, expect, Label, testDataGenerators } from '../support/world';

// ==================== GIVEN STEPS ====================

// Note: "a label {string} with color {string} exists" is already defined in todos.steps.ts
// We reuse it here for labels API tests

// ==================== WHEN STEPS ====================

When('I GET \\/api\\/labels', async function (this: CustomWorld) {
  const response = await this.api.listLabels();
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/labels\\/{word}', async function (this: CustomWorld, labelId: string) {
  const response = await this.api.getLabel(labelId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET the label by ID', async function (this: CustomWorld) {
  const labelId = this.testData.labelId as string;
  const response = await this.api.getLabel(labelId);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/labels with:', async function (this: CustomWorld, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.color !== undefined) payload.color = data.color;

  const response = await this.api.createLabel(
    payload as { name: string; color: string }
  );
  this.storeResponse(response.status, response.body, response.headers);

  if (response.status === 201 && response.body.id) {
    this.trackLabel(response.body.id);
    this.testData.labelId = response.body.id;
  }
});

When('I POST to \\/api\\/labels with name exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const longName = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.createLabel({ name: longName, color: '#FF0000' });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT to \\/api\\/labels\\/:labelId with:', async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const labelId = this.testData.labelId as string;
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.color !== undefined) payload.color = data.color;

  const response = await this.api.updateLabel(labelId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT \\/api\\/labels\\/{word} with:', async function (
  this: CustomWorld,
  labelId: string,
  dataTable: DataTable
) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.color !== undefined) payload.color = data.color;

  const response = await this.api.updateLabel(labelId, payload);
  this.storeResponse(response.status, response.body, response.headers);
});

When('I PUT to \\/api\\/labels\\/:labelId with name exceeding {int} characters', async function (
  this: CustomWorld,
  maxLength: number
) {
  const labelId = this.testData.labelId as string;
  const longName = testDataGenerators.longString(maxLength + 1);
  const response = await this.api.updateLabel(labelId, { name: longName });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I DELETE the label', async function (this: CustomWorld) {
  const labelId = this.testData.labelId as string;
  const response = await this.api.deleteLabel(labelId);
  this.storeResponse(response.status, response.body, response.headers);
  this.createdLabelIds = this.createdLabelIds.filter((id) => id !== labelId);
});

When('I DELETE \\/api\\/labels\\/{word}', async function (this: CustomWorld, labelId: string) {
  const response = await this.api.deleteLabel(labelId);
  this.storeResponse(response.status, response.body, response.headers);
});

// ==================== THEN STEPS ====================

Then('the response should contain {int} labels', function (this: CustomWorld, count: number) {
  expect(this.lastResponse).to.not.be.null;
  expect(this.lastResponse!.body).to.be.an('array').with.lengthOf(count);
});

Then('the response should include a label named {string}', function (
  this: CustomWorld,
  labelName: string
) {
  expect(this.lastResponse).to.not.be.null;
  const labels = this.lastResponse!.body as Label[];
  const found = labels.some((label) => label.name === labelName);
  expect(found).to.be.true;
});

Then('the labels should be ordered by name ascending', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const labels = this.lastResponse!.body as Label[];
  const names = labels.map((label) => label.name);
  const sortedNames = [...names].sort();
  expect(names).to.deep.equal(sortedNames);
});

Then('the response should contain the label name {string}', function (
  this: CustomWorld,
  labelName: string
) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Label;
  expect(body.name).to.equal(labelName);
});

Then('the response should contain the color {string}', function (
  this: CustomWorld,
  color: string
) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Label;
  expect(body.color).to.equal(color);
});

Then('the label should have an id', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Label;
  expect(body.id).to.be.a('string').and.not.be.empty;
});

Then('the label should have todo count of {int}', function (this: CustomWorld, count: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Label;
  expect(body._count).to.not.be.undefined;
  expect(body._count!.todos).to.equal(count);
});

Then('the label should no longer exist', async function (this: CustomWorld) {
  const labelId = this.testData.labelId as string;
  const response = await this.api.getLabel(labelId);
  expect(response.status).to.equal(404);
});

Then('the todo should have no labels', async function (this: CustomWorld) {
  const todoId = this.testData.todoId as string;
  const response = await this.api.getTodo(todoId);
  expect(response.status).to.equal(200);
  const todo = response.body;
  expect(todo.labels).to.be.an('array').with.lengthOf(0);
});
