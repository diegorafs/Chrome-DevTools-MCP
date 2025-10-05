// @ts-nocheck
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert';
import {describe, it} from 'node:test';
import {executablePath} from 'puppeteer';
import {launch} from '../src/browser.js';

class ABTestPage {
  constructor(page) {
    this.page = page;
  }
  async getVariationText() {
    console.log('Checking for A/B Test Variation text...');
    const bodyText = await this.page.evaluate(() => document.body.innerText);
    if (/A\/B Test Variation 1/.test(bodyText)) {
      console.log('A/B Test Variation 1 is present.');
      return 'A/B Test Variation 1';
    } else if (/A\/B Test Variation 2/.test(bodyText)) {
      console.log('A/B Test Variation 2 is present.');
      return 'A/B Test Variation 2';
    } else {
      console.log('No A/B Test Variation text found.');
      return null;
    }
  }
}

class TenthLinkPage {
  constructor(page) {
    this.page = page;
  }
  async getTitle() {
    const title = await this.page.title();
    console.log('10th link page title:', title);
    return title;
  }
}

class TheInternetHomePage {
  constructor(page) {
    this.page = page;
  }
  async goto() {
    console.log('Navigating to the homepage...');
    await this.page.goto('https://the-internet.herokuapp.com/', {waitUntil: 'domcontentloaded'});
    console.log('Homepage loaded.');
  }
  async clickABTesting() {
    console.log('Clicking the A/B Testing link...');
    const abTestLink = await this.page.$('a[href="/abtest"]');
    assert(abTestLink, 'A/B Testing link not found');
    await Promise.all([
      this.page.waitForNavigation({waitUntil: 'domcontentloaded'}),
      abTestLink.click(),
    ]);
    console.log('Navigated to A/B Test page.');
    return new ABTestPage(this.page);
  }
  async clickTenthLink() {
    console.log('Clicking the 10th link in the homepage list (//*[@id="content"]/ul/li[10]/a)...');
    const [tenthLink] = await this.page.$x('//*[@id="content"]/ul/li[10]/a');
    assert(tenthLink, '10th link not found');
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      tenthLink.click(),
    ]);
    console.log('Clicked the 10th link and navigated to the new page.');
    return new TenthLinkPage(this.page);
  }
  async isAtHomePage() {
    const title = await this.page.title();
    return /The Internet/i.test(title);
  }
}
describe('open the-internet.herokuapp.com', () => {
  it('should open the demo page, click A/B Testing, and validate Variation 1, then click the 10th link', async () => {
    console.log('Launching browser with options:', {
      headless: false,
      isolated: true,
      executablePath: executablePath(),
    });
    const browser = await launch({
      headless: false, // Show the browser window
      isolated: true,
      executablePath: executablePath(),
    });
    try {
      console.log('Opening new page...');
      const page = await browser.newPage();
      // Pipe browser page console logs to Node.js terminal
      page.on('console', msg => {
        // Print all console messages from the browser page
        console.log(`[browser][${msg.type()}]`, ...msg.args().map(arg => arg._remoteObject.value));
      });
      const home = new TheInternetHomePage(page);
      console.log('Navigating to home page...');
      await home.goto();
      const title = await page.title();
      console.log('Page title:', title);
      assert.match(title, /The Internet/i);
      console.log('Clicking A/B Testing link...');
  const abTestPage = await home.clickABTesting();
  const variationText = await abTestPage.getVariationText();
  console.log('Variation text found:', variationText);
  assert.ok(variationText, 'No A/B Test Variation text is present');
  // Go back to the main page
  console.log('Going back to the main page...');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  const atHome = await home.isAtHomePage();
  console.log('Is at home page:', atHome);
  assert.ok(atHome, 'Did not return to the main page');
  console.log('Returned to the main page.');
  // Click the 10th link using the page object
  const tenthLinkPage = await home.clickTenthLink();
  await tenthLinkPage.getTitle();
  // Wait a few seconds so the user can see the result
  console.log('Test complete. Waiting 5 seconds before closing browser...');
  await new Promise(res => setTimeout(res, 5000));
    } finally {
      console.log('Closing browser...');
      await browser.close();
    }
  });
});
