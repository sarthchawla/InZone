import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Sign Up page
 * Handles sign-up form interactions, invite validation, and assertions
 */
export class SignUpPage {
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly googleButton: Locator;
  readonly emailInput: Locator;
  readonly nameInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly createAccountButton: Locator;
  readonly signInLink: Locator;
  readonly errorAlert: Locator;
  readonly loadingSpinner: Locator;

  // Invalid invite state
  readonly invalidInviteHeading: Locator;
  readonly backToSignInLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: /Create your InZone account/i });
    this.googleButton = page.getByRole('button', { name: /Continue with Google/i });
    this.emailInput = page.getByLabel('Email *');
    this.nameInput = page.getByLabel('Name *');
    this.usernameInput = page.getByLabel(/Username/);
    this.passwordInput = page.getByLabel('Password *', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirm Password *');
    this.createAccountButton = page.getByRole('button', { name: /Create Account/i });
    this.signInLink = page.getByRole('link', { name: /Sign in/i });
    this.errorAlert = page.getByRole('alert');
    this.loadingSpinner = page.getByRole('status', { name: /Loading/i });

    this.invalidInviteHeading = page.getByRole('heading', { name: /Invalid Invite/i });
    this.backToSignInLink = page.getByRole('link', { name: /Back to Sign In/i });
  }

  async goto(baseUrl: string = 'http://localhost:5173', token?: string) {
    const url = token ? `${baseUrl}/signup?token=${token}` : `${baseUrl}/signup`;
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillName(value: string) {
    await this.nameInput.fill(value);
  }

  async fillEmail(value: string) {
    await this.emailInput.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async fillConfirmPassword(value: string) {
    await this.confirmPasswordInput.fill(value);
  }

  async selectSecurityQuestion(index: number, question: string) {
    await this.page.getByLabel(`Security question ${index + 1}`).selectOption(question);
  }

  async fillSecurityAnswer(index: number, answer: string) {
    const answerInputs = this.page.getByPlaceholder('Your answer');
    await answerInputs.nth(index).fill(answer);
  }

  async fillValidForm() {
    await this.nameInput.fill('Test User');
    await this.passwordInput.fill('Abcdef1!');
    await this.confirmPasswordInput.fill('Abcdef1!');
    // Fill security questions
    await this.selectSecurityQuestion(0, 'What was the name of your first pet?');
    await this.fillSecurityAnswer(0, 'Buddy');
    await this.selectSecurityQuestion(1, 'In what city were you born?');
    await this.fillSecurityAnswer(1, 'New York');
    await this.selectSecurityQuestion(2, 'What was the name of your first school?');
    await this.fillSecurityAnswer(2, 'Lincoln Elementary');
  }

  async submit() {
    await this.createAccountButton.click();
  }

  // Assertions
  async expectVisible() {
    await expect(this.heading).toBeVisible();
  }

  async expectInvalidInvite() {
    await expect(this.invalidInviteHeading).toBeVisible();
  }

  async expectLoading() {
    await expect(this.loadingSpinner).toBeVisible();
  }

  async expectCreateAccountDisabled() {
    await expect(this.createAccountButton).toBeDisabled();
  }

  async expectCreateAccountEnabled() {
    await expect(this.createAccountButton).toBeEnabled();
  }

  async expectError(message: string) {
    await expect(this.errorAlert).toBeVisible();
    await expect(this.errorAlert).toContainText(message);
  }

  async expectPasswordCheckMet(label: string) {
    const check = this.page.locator(`[aria-label="${label}: met"]`);
    await expect(check).toBeVisible();
  }

  async expectPasswordCheckNotMet(label: string) {
    const check = this.page.locator(`[aria-label="${label}: not met"]`);
    await expect(check).toBeVisible();
  }
}
