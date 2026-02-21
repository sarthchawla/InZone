import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld, expect } from '../support/world';

// Predefined security questions (must match the API's SECURITY_QUESTIONS list)
const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'In what city were you born?',
  'What was the name of your first school?',
  "What is your mother's maiden name?",
  'What was the make of your first car?',
  'What is the name of the street you grew up on?',
  'What was your childhood nickname?',
  'What is your favorite book?',
];

// ==================== GIVEN STEPS ====================

Given('I am authenticated as a user', async function (this: CustomWorld) {
  // TODO: Set up user auth session via Better Auth API
  // This requires a running database with Better Auth tables
  this.testData.authRole = 'user';
  this.testData.authCookies = ''; // Will be populated with session cookies
});

Given('the user has configured security questions', async function (this: CustomWorld) {
  // TODO: Create 3 security questions in the database for the authenticated user
  // Uses prisma.securityQuestion.create() for each question
  this.testData.securityQuestionsConfigured = true;
});

Given('a user with email {string} has security questions configured', async function (
  this: CustomWorld,
  email: string,
) {
  // TODO: Create user with the given email and set up 3 security questions
  // Store the known answers for later verification
  this.testData.securityQuestionUser = email;
  this.testData.knownAnswers = ['answer1', 'answer2', 'answer3']; // Placeholder
});

Given('a user with username {string} has security questions configured', async function (
  this: CustomWorld,
  username: string,
) {
  // TODO: Create user with the given username and set up 3 security questions
  this.testData.securityQuestionUsername = username;
  this.testData.knownAnswers = ['answer1', 'answer2', 'answer3']; // Placeholder
});

// ==================== WHEN STEPS ====================

When('I POST to \\/api\\/security-questions\\/setup with {int} valid questions and answers', async function (
  this: CustomWorld,
  count: number,
) {
  const questions = SECURITY_QUESTIONS.slice(0, count).map((q) => ({
    question: q,
    answer: `test-answer-${q.slice(0, 10)}`,
  }));

  const response = await this.api.post('/api/security-questions/setup', { questions });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/security-questions\\/setup with {int} different valid questions and answers', async function (
  this: CustomWorld,
  count: number,
) {
  // Use different questions from the pool (offset by count)
  const questions = SECURITY_QUESTIONS.slice(count, count * 2).map((q) => ({
    question: q,
    answer: `new-answer-${q.slice(0, 10)}`,
  }));

  const response = await this.api.post('/api/security-questions/setup', { questions });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/security-questions\\/setup with {int} questions', async function (
  this: CustomWorld,
  count: number,
) {
  const questions = SECURITY_QUESTIONS.slice(0, count).map((q) => ({
    question: q,
    answer: `test-answer-${q.slice(0, 10)}`,
  }));

  const response = await this.api.post('/api/security-questions/setup', { questions });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/security-questions\\/setup with {int} questions where {int} are the same', async function (
  this: CustomWorld,
  _total: number,
  _duplicateCount: number,
) {
  const questions = [
    { question: SECURITY_QUESTIONS[0], answer: 'answer1' },
    { question: SECURITY_QUESTIONS[0], answer: 'answer2' }, // Duplicate question
    { question: SECURITY_QUESTIONS[2], answer: 'answer3' },
  ];

  const response = await this.api.post('/api/security-questions/setup', { questions });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/security-questions\\/setup with an invalid question', async function (this: CustomWorld) {
  const questions = [
    { question: 'This is not a valid predefined question?', answer: 'answer1' },
    { question: SECURITY_QUESTIONS[1], answer: 'answer2' },
    { question: SECURITY_QUESTIONS[2], answer: 'answer3' },
  ];

  const response = await this.api.post('/api/security-questions/setup', { questions });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/security-questions\\/setup with a short answer', async function (this: CustomWorld) {
  const questions = [
    { question: SECURITY_QUESTIONS[0], answer: 'a' }, // Too short (min 2)
    { question: SECURITY_QUESTIONS[1], answer: 'answer2' },
    { question: SECURITY_QUESTIONS[2], answer: 'answer3' },
  ];

  const response = await this.api.post('/api/security-questions/setup', { questions });
  this.storeResponse(response.status, response.body, response.headers);
});

When('I GET \\/api\\/security-questions\\/status', async function (this: CustomWorld) {
  const response = await this.api.get('/api/security-questions/status');
  this.storeResponse(response.status, response.body, response.headers);
});

When('I POST to \\/api\\/security-questions\\/questions with:', async function (
  this: CustomWorld,
  dataTable: DataTable,
) {
  const data = dataTable.rowsHash();
  const response = await this.api.post('/api/security-questions/questions', data);
  this.storeResponse(response.status, response.body, response.headers);
});

When(
  'I POST to \\/api\\/security-questions\\/verify with correct answers for {string}',
  async function (this: CustomWorld, identifier: string) {
    const answers = this.testData.knownAnswers as string[];
    const response = await this.api.post('/api/security-questions/verify', {
      identifier,
      answers,
    });
    this.storeResponse(response.status, response.body, response.headers);
  },
);

When(
  'I POST to \\/api\\/security-questions\\/verify with incorrect answers for {string}',
  async function (this: CustomWorld, identifier: string) {
    const response = await this.api.post('/api/security-questions/verify', {
      identifier,
      answers: ['wrong1', 'wrong2', 'wrong3'],
    });
    this.storeResponse(response.status, response.body, response.headers);
  },
);

When('I POST to \\/api\\/security-questions\\/verify with:', async function (
  this: CustomWorld,
  dataTable: DataTable,
) {
  const data = dataTable.rowsHash();
  const payload: Record<string, unknown> = {};

  if (data.identifier !== undefined) payload.identifier = data.identifier;
  if (data.answers !== undefined) {
    try {
      payload.answers = JSON.parse(data.answers);
    } catch {
      payload.answers = data.answers;
    }
  }

  const response = await this.api.post('/api/security-questions/verify', payload);
  this.storeResponse(response.status, response.body, response.headers);
});

// ==================== THEN STEPS ====================

// Note: "the response status should be {int}" is already defined in boards.steps.ts
// Note: "the response should contain success {word}" is defined in invites.steps.ts
// Note: "the response should contain error {string}" is defined in invites.steps.ts

Then('the response should contain configured {word}', function (this: CustomWorld, value: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  const expected = value === 'true';
  expect(body.configured).to.equal(expected);
});

Then('the response should contain {int} questions', function (this: CustomWorld, count: number) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as { questions: string[] };
  expect(body.questions).to.be.an('array').with.lengthOf(count);
});

Then('the response should contain a reset token', function (this: CustomWorld) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as Record<string, unknown>;
  expect(body.resetToken).to.be.a('string').and.not.be.empty;
});

Then('the response should contain error matching {string}', function (this: CustomWorld, errorPattern: string) {
  expect(this.lastResponse).to.not.be.null;
  const body = this.lastResponse!.body as { error?: string };
  expect(body.error).to.be.a('string');
  expect(body.error).to.include(errorPattern);
});
