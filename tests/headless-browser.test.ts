/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert';
import {describe, it} from 'node:test';
import {executablePath} from 'puppeteer';
import {launch} from '../src/browser.js';

describe('visible browser navigation', () => {
  it('should launch browser visibly and navigate to google.com', async () => {
    const browser = await launch({
      headless: false, // Show the browser window
      isolated: true,
      executablePath: executablePath(),
    });
    try {
      const page = await browser.newPage();
      await page.goto('https://google.com', {waitUntil: 'domcontentloaded'});
      const title = await page.title();
      assert.match(title, /Google/i);
      // Wait a few seconds so the user can see the browser
      await new Promise(res => setTimeout(res, 5000));
    } finally {
      await browser.close();
    }
  });
});
