/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {beforeEach, describe, it} from 'node:test';

import type {Page} from 'puppeteer-core';

import {
  ElementCoordinateMapper,
  ElementLocator,
  VisualElementAnalyzer,
} from '../src/ai-element-locator/index.js';
import {withBrowser} from './utils.js';

describe('AI Element Locator Framework', () => {
  let page: Page;

  beforeEach(async () => {
    await withBrowser(async (_response, context) => {
      page = context.getSelectedPage();
    });
    
    if (!page) {
      throw new Error('Failed to initialize page');
    }

    // Create a test page with various elements
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; }
            .button { 
              padding: 10px 20px; 
              background: #007bff; 
              color: white;
              border: none;
              cursor: pointer;
              margin: 10px;
            }
            .input { padding: 8px; margin: 10px; border: 1px solid #ccc; }
            .container { margin: 20px; }
          </style>
        </head>
        <body>
          <h1>Test Page for AI Element Locator</h1>
          
          <div class="container">
            <button class="button" id="submit-btn">Submit Form</button>
            <button class="button" id="cancel-btn">Cancel</button>
          </div>
          
          <div class="container">
            <input type="text" class="input" placeholder="Enter email" />
            <input type="password" class="input" placeholder="Enter password" />
          </div>
          
          <div class="container">
            <a href="#" id="login-link">Login</a>
            <a href="#" id="signup-link">Sign Up</a>
          </div>
          
          <div class="container">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="Profile Picture" />
          </div>
        </body>
      </html>
    `);
  });

  describe('ElementLocator', () => {
    it('should find elements by description', async () => {
      const locator = new ElementLocator(page, {
        minConfidence: 0.1,
        maxResults: 10,
      });

      const result = await locator.findElementsByDescription('button');

      assert.ok(result.elements.length > 0, 'Should find button elements');
      assert.ok(
        result.elements.some(e => e.accessibility.role === 'button'),
        'Should identify button role',
      );
    });

    it('should find specific button by text', async () => {
      const locator = new ElementLocator(page, {
        minConfidence: 0.3,
      });

      const result = await locator.findElementsByDescription('submit button');

      assert.ok(result.elements.length > 0, 'Should find submit button');
      const submitBtn = result.elements.find(e =>
        e.visual.visibleText.toLowerCase().includes('submit'),
      );
      assert.ok(submitBtn, 'Should find element with "submit" text');
    });

    it('should find input fields', async () => {
      const locator = new ElementLocator(page, {
        minConfidence: 0.1,
      });

      const result = await locator.findElementsByDescription('input');

      assert.ok(result.elements.length >= 2, 'Should find input elements');
    });

    it('should respect maxResults parameter', async () => {
      const locator = new ElementLocator(page, {
        maxResults: 2,
        minConfidence: 0,
      });

      const result = await locator.findElementsByDescription('');

      assert.ok(
        result.elements.length <= 2,
        'Should respect maxResults limit',
      );
    });

    it('should annotate screenshots when requested', async () => {
      const locator = new ElementLocator(page, {
        annotateScreenshot: true,
        minConfidence: 0.1,
      });

      const result = await locator.findElementsByDescription('button');

      assert.ok(result.annotatedScreenshot, 'Should include annotated screenshot');
      if (result.annotatedScreenshot) {
        assert.ok(
          result.annotatedScreenshot.length > 0,
          'Screenshot should not be empty',
        );
      }
    });

    it('should get element handle by uid', async () => {
      const locator = new ElementLocator(page, {minConfidence: 0.1});

      const result = await locator.findElementsByDescription('submit');
      const firstElement = result.elements[0];

      if (firstElement) {
        const handle = await locator.getElementHandle(firstElement.uid);
        assert.ok(handle, 'Should get element handle');

        if (handle) {
          await handle.dispose();
        }
      }
    });
  });

  describe('VisualElementAnalyzer', () => {
    it('should analyze element visual properties', async () => {
      const locator = new ElementLocator(page);
      const result = await locator.findElementsByDescription('button');

      const analyzer = new VisualElementAnalyzer(page);
      const visualProps = await analyzer.analyzeElements(result.elements);

      assert.ok(visualProps.size > 0, 'Should analyze elements');

      const firstElement = result.elements[0];
      if (firstElement) {
        const props = visualProps.get(firstElement.uid);
        assert.ok(props, 'Should have visual properties');
        assert.ok(props?.category, 'Should have element category');
      }
    });

    it('should detect element groups', async () => {
      const locator = new ElementLocator(page);
      const result = await locator.findElementsByDescription('');

      const analyzer = new VisualElementAnalyzer(page, {detectGroups: true});
      const groups = await analyzer.detectElementGroups(result.elements);

      // Groups may or may not be detected depending on layout
      assert.ok(Array.isArray(groups), 'Should return groups array');
    });

    it('should highlight elements on page', async () => {
      const locator = new ElementLocator(page);
      const result = await locator.findElementsByDescription('button');

      const analyzer = new VisualElementAnalyzer(page);

      // Should not throw
      await analyzer.highlightElements(result.elements, 100);
    });

    it('should capture element screenshots', async () => {
      const locator = new ElementLocator(page);
      const result = await locator.findElementsByDescription('button');

      const analyzer = new VisualElementAnalyzer(page);
      const screenshots = await analyzer.captureElementScreenshots(
        result.elements.slice(0, 2),
      );

      assert.ok(screenshots.size > 0, 'Should capture screenshots');
    });
  });

  describe('ElementCoordinateMapper', () => {
    it('should find element at specific coordinates', async () => {
      const locator = new ElementLocator(page);
      const elements = (await locator.findElementsByDescription('')).elements;

      const mapper = new ElementCoordinateMapper(page);
      mapper.updateCache(elements);

      if (elements.length > 0) {
        const firstElement = elements[0];
        if (firstElement) {
          const {x, y, width, height} = firstElement.boundingBox;
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          const match = await mapper.getElementAtPoint(centerX, centerY, elements);
          assert.ok(match, 'Should find element at its center');
          assert.ok(match?.isInside, 'Point should be inside element');
        }
      }
    });

    it('should find elements in region', async () => {
      const locator = new ElementLocator(page);
      const elements = (await locator.findElementsByDescription('')).elements;

      const mapper = new ElementCoordinateMapper(page);
      const inRegion = await mapper.getElementsInRegion(0, 0, 500, 500, elements);

      assert.ok(Array.isArray(inRegion), 'Should return array');
    });

    it('should find nearest element to a point', async () => {
      const locator = new ElementLocator(page);
      const elements = (await locator.findElementsByDescription('')).elements;

      const mapper = new ElementCoordinateMapper(page);

      const nearest = await mapper.getNearestElement(100, 100, undefined, elements);
      assert.ok(nearest, 'Should find nearest element');
    });

    it('should determine element relationships', async () => {
      const locator = new ElementLocator(page);
      const elements = (await locator.findElementsByDescription('')).elements;

      if (elements.length >= 2) {
        const mapper = new ElementCoordinateMapper(page);
        const firstElement = elements[0];

        if (firstElement) {
          const relationships = await mapper.getElementRelationships(
            firstElement,
            elements,
          );

          assert.ok(relationships, 'Should return relationships');
          assert.ok(Array.isArray(relationships.above), 'Should have above array');
          assert.ok(Array.isArray(relationships.below), 'Should have below array');
          assert.ok(Array.isArray(relationships.left), 'Should have left array');
          assert.ok(Array.isArray(relationships.right), 'Should have right array');
          assert.ok(
            Array.isArray(relationships.overlapping),
            'Should have overlapping array',
          );
        }
      }
    });

    it('should convert viewport to page coordinates', async () => {
      const mapper = new ElementCoordinateMapper(page);
      const coords = await mapper.viewportToPageCoordinates(100, 100);

      assert.ok(typeof coords.x === 'number', 'Should return x coordinate');
      assert.ok(typeof coords.y === 'number', 'Should return y coordinate');
    });

    it('should find elements along a path', async () => {
      const locator = new ElementLocator(page);
      const elements = (await locator.findElementsByDescription('')).elements;

      const mapper = new ElementCoordinateMapper(page);
      const path = [
        {x: 50, y: 50},
        {x: 100, y: 100},
        {x: 150, y: 150},
      ];

      const alongPath = await mapper.getElementsAlongPath(path, elements);
      assert.ok(Array.isArray(alongPath), 'Should return array');
    });
  });

  describe('Integration Tests', () => {
    it('should find and click element using description', async () => {
      const locator = new ElementLocator(page, {minConfidence: 0.3});

      // Add click handler to button
      await page.evaluate(() => {
        const btn = document.querySelector('#submit-btn') as HTMLButtonElement;
        if (btn) {
          btn.onclick = () => {
            (window as any).buttonClicked = true;
          };
        }
      });

      const result = await locator.findElementsByDescription('submit');
      const submitButton = result.elements.find(e =>
        e.visual.visibleText.toLowerCase().includes('submit'),
      );

      assert.ok(submitButton, 'Should find submit button');

      if (submitButton) {
        const handle = await locator.getElementHandle(submitButton.uid);
        assert.ok(handle, 'Should get element handle');

        if (handle) {
          await handle.click();
          await handle.dispose();

          // Check if button was clicked
          const wasClicked = await page.evaluate(() => (window as any).buttonClicked);
          assert.ok(wasClicked, 'Button should have been clicked');
        }
      }
    });

    it('should work with complex multi-step workflow', async () => {
      const locator = new ElementLocator(page, {minConfidence: 0.2});

      // 1. Find all inputs
      const inputResult = await locator.findElementsByDescription('input');
      assert.ok(inputResult.elements.length >= 2, 'Should find input fields');

      // 2. Analyze visual properties
      const analyzer = new VisualElementAnalyzer(page);
      const visualProps = await analyzer.analyzeElements(inputResult.elements);
      assert.ok(visualProps.size > 0, 'Should have visual properties');

      // 3. Use coordinate mapper
      const mapper = new ElementCoordinateMapper(page);
      mapper.updateCache(inputResult.elements);

      const firstInput = inputResult.elements[0];
      if (firstInput) {
        const relationships = await mapper.getElementRelationships(
          firstInput,
          inputResult.elements,
        );
        assert.ok(relationships, 'Should get element relationships');
      }
    });
  });
});
