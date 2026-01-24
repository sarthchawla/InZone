import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';

export interface CustomWorldParameters {
  baseUrl: string;
  apiUrl: string;
}

export class CustomWorld extends World<CustomWorldParameters> {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  constructor(options: IWorldOptions<CustomWorldParameters>) {
    super(options);
  }

  async init() {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
    });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async cleanup() {
    if (this.page) {
      await this.page.close();
    }
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  get baseUrl(): string {
    return this.parameters.baseUrl || 'http://localhost:5173';
  }

  get apiUrl(): string {
    return this.parameters.apiUrl || 'http://localhost:3000';
  }
}

setWorldConstructor(CustomWorld);
