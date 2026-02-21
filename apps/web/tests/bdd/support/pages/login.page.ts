import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Login page
 * Handles sign-in form interactions and assertions
 */
export class LoginPage {
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly identifierInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly googleButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly requestAccessLink: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'InZone' });
    this.subtitle = page.getByText('Sign in to manage your boards');
    this.identifierInput = page.getByLabel('Email or Username');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: /Sign In/i });
    this.googleButton = page.getByRole('button', { name: /Continue with Google/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /Forgot password/i });
    this.requestAccessLink = page.getByRole('link', { name: /Request Access/i });
    this.errorAlert = page.getByRole('alert');
  }

  async goto(baseUrl: string = 'http://localhost:5173') {
    await this.page.goto(`${baseUrl}/login`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillIdentifier(value: string) {
    await this.identifierInput.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async submit() {
    await this.signInButton.click();
  }

  async login(identifier: string, password: string) {
    await this.fillIdentifier(identifier);
    await this.fillPassword(password);
    await this.submit();
  }

  // Assertions
  async expectVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.subtitle).toBeVisible();
  }

  async expectSignInDisabled() {
    await expect(this.signInButton).toBeDisabled();
  }

  async expectSignInEnabled() {
    await expect(this.signInButton).toBeEnabled();
  }

  async expectError(message: string) {
    await expect(this.errorAlert).toBeVisible();
    await expect(this.errorAlert).toContainText(message);
  }
}
