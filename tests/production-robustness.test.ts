/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {describe, it, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert';
import {ElementLocator} from '../src/ai-element-locator/ElementLocator';

/**
 * Production-Ready Integration Tests
 * Tests error handling, edge cases, and robustness
 */

describe('ElementLocator - Production Robustness', () => {
  let page: any; // Mock page object
  let locator: ElementLocator;

  beforeEach(() => {
    // Mock page object with essential methods
    page = {
      screenshot: async () => new Uint8Array([]),
      createCDPSession: async () => ({
        send: async (command: string) => {
          if (command === 'Accessibility.getFullAXTree') {
            return {nodes: []};
          }
          return {};
        },
        detach: async () => {},
      }),
      evaluate: async (fn: Function) => [],
      $: async () => null,
      $x: async () => [],
      waitForFunction: async () => {},
      isClosed: () => false,
      waitForLoadState: async () => {},
      keyboard: {press: async () => {}},
      viewport: async () => ({width: 1920, height: 1080}),
    };

    locator = new ElementLocator(page);
  });

  describe('Input Validation', () => {
    it('should reject empty description', async () => {
      await assert.rejects(
        () => locator.findElementsByDescription(''),
        /Description must be a non-empty string/
      );
    });

    it('should reject non-string description', async () => {
      await assert.rejects(
        () => locator.findElementsByDescription(null as any),
        /Description must be a non-empty string/
      );
    });

    it('should reject whitespace-only description', async () => {
      await assert.rejects(
        () => locator.findElementsByDescription('   '),
        /Description must be a non-empty string/
      );
    });

    it('should reject invalid UID', async () => {
      await assert.rejects(
        () => locator.getElementHandle(''),
        /Invalid UID provided/
      );
    });

    it('should reject invalid UID type', async () => {
      await assert.rejects(
        () => locator.getElementHandle(null as any),
        /Invalid UID provided/
      );
    });
  });

  describe('Configuration Validation', () => {
    it('should reject minConfidence < 0', () => {
      assert.throws(
        () => locator.setConfig({minConfidence: -0.1}),
        /minConfidence must be between 0 and 1/
      );
    });

    it('should reject minConfidence > 1', () => {
      assert.throws(
        () => locator.setConfig({minConfidence: 1.1}),
        /minConfidence must be between 0 and 1/
      );
    });

    it('should reject maxResults < 1', () => {
      assert.throws(
        () => locator.setConfig({maxResults: 0}),
        /maxResults must be at least 1/
      );
    });

    it('should accept valid configuration', () => {
      assert.doesNotThrow(() => {
        locator.setConfig({
          minConfidence: 0.5,
          maxResults: 10,
          fullPage: true,
        });
      });
    });

    it('should return current configuration', () => {
      locator.setConfig({minConfidence: 0.7, maxResults: 5});
      const config = locator.getConfig();
      
      assert.strictEqual(config.minConfidence, 0.7);
      assert.strictEqual(config.maxResults, 5);
    });

    it('should reset configuration to defaults', () => {
      locator.setConfig({minConfidence: 0.8, maxResults: 20});
      locator.resetConfig();
      
      const config = locator.getConfig();
      assert.strictEqual(config.minConfidence, 0.5);
      assert.strictEqual(config.maxResults, 10);
    });
  });

  describe('Error Handling', () => {
    it('should handle page closed error', async () => {
      page.isClosed = () => true;
      
      await assert.rejects(
        () => locator.findElementsByDescription('button'),
        /Page is not ready.*Page is closed/
      );
    });

    it('should handle screenshot failure', async () => {
      page.screenshot = async () => {
        throw new Error('Screenshot failed');
      };
      
      await assert.rejects(
        () => locator.findElementsByDescription('button'),
        /Failed to find elements.*Screenshot capture failed/
      );
    });

    it('should handle CDP session failure', async () => {
      page.createCDPSession = async () => {
        throw new Error('CDP failed');
      };
      
      await assert.rejects(
        () => locator.findElementsByDescription('button'),
        /Failed to find elements.*Failed to capture accessibility snapshot/
      );
    });

    it('should handle element extraction failure', async () => {
      page.evaluate = async () => {
        throw new Error('Evaluation failed');
      };
      
      await assert.rejects(
        () => locator.findElementsByDescription('button'),
        /Failed to find elements.*Failed to extract elements/
      );
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      let attempts = 0;
      page.screenshot = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Transient error');
        }
        return new Uint8Array([]);
      };

      // Should succeed after retry
      const result = await locator.findElementsByDescription('button');
      assert.ok(result);
      assert.strictEqual(attempts, 2);
    });

    it('should fail after max retries', async () => {
      page.screenshot = async () => {
        throw new Error('Persistent error');
      };

      await assert.rejects(
        () => locator.findElementsByDescription('button'),
        /after 3 attempts/
      );
    });
  });

  describe('Element Interaction', () => {
    it('should reject interaction without text for type action', async () => {
      await assert.rejects(
        () => locator.interactWithElement('element-1', 'type'),
        /Text is required for type action/
      );
    });

    it('should reject unknown action', async () => {
      await assert.rejects(
        () => locator.interactWithElement('element-1', 'invalid' as any),
        /Unknown action/
      );
    });

    it('should handle element not found gracefully', async () => {
      await assert.rejects(
        () => locator.interactWithElement('nonexistent-uid', 'click'),
        /Cannot interact with element.*element not found/
      );
    });
  });

  describe('Element Search', () => {
    beforeEach(() => {
      // Mock elements for search tests
      page.evaluate = async () => [
        {
          uid: 'element-1',
          boundingBox: {x: 100, y: 100, width: 50, height: 30},
          selector: '#submit-btn',
          xpath: '//*[@id="submit-btn"]',
          accessibility: {role: 'button', name: 'Submit'},
          visual: {visibleText: 'Submit Form', isVisible: true},
          attributes: {id: 'submit-btn', class: 'btn btn-primary'},
        },
        {
          uid: 'element-2',
          boundingBox: {x: 200, y: 100, width: 50, height: 30},
          selector: '#cancel-btn',
          xpath: '//*[@id="cancel-btn"]',
          accessibility: {role: 'button', name: 'Cancel'},
          visual: {visibleText: 'Cancel', isVisible: true},
          attributes: {id: 'cancel-btn', class: 'btn btn-secondary'},
        },
      ];
    });

    it('should find elements by description', async () => {
      const result = await locator.findElementsByDescription('submit button');
      
      assert.ok(result.elements.length > 0);
      assert.ok(result.metadata.query === 'submit button');
      assert.ok(result.metadata.processingTime > 0);
    });

    it('should sort by confidence', async () => {
      const result = await locator.findElementsByDescription('button');
      
      // Results should be sorted by confidence (descending)
      for (let i = 0; i < result.elements.length - 1; i++) {
        assert.ok(
          result.elements[i].visual.confidence >= 
          result.elements[i + 1].visual.confidence
        );
      }
    });

    it('should respect maxResults', async () => {
      locator.setConfig({maxResults: 1});
      const result = await locator.findElementsByDescription('button');
      
      assert.ok(result.elements.length <= 1);
    });

    it('should filter by minConfidence', async () => {
      locator.setConfig({minConfidence: 0.9});
      const result = await locator.findElementsByDescription('button');
      
      // All results should meet minimum confidence
      result.elements.forEach(element => {
        assert.ok(element.visual.confidence >= 0.9);
      });
    });
  });

  describe('Semantic Understanding', () => {
    beforeEach(() => {
      page.evaluate = async () => [
        {
          uid: 'element-1',
          boundingBox: {x: 100, y: 950, width: 80, height: 40}, // Bottom position
          selector: '#submit',
          xpath: '//*[@id="submit"]',
          accessibility: {role: 'button', name: 'Submit'},
          visual: {visibleText: 'Submit', isVisible: true},
          attributes: {
            id: 'submit',
            class: 'btn btn-primary',
            style: 'background-color: blue',
          },
        },
      ];
    });

    it('should understand color hints', async () => {
      const result = await locator.findElementsByDescription('blue button');
      
      assert.ok(result.elements.length > 0);
      // Should have higher confidence due to color match
      assert.ok(result.elements[0].visual.confidence > 0.7);
    });

    it('should understand position hints', async () => {
      const result = await locator.findElementsByDescription('button at bottom');
      
      assert.ok(result.elements.length > 0);
      // Should have higher confidence due to position match
      assert.ok(result.elements[0].visual.confidence > 0.7);
    });

    it('should understand action hints', async () => {
      const result = await locator.findElementsByDescription('submit button');
      
      assert.ok(result.elements.length > 0);
      // Should have higher confidence due to action word match
      assert.ok(result.elements[0].visual.confidence > 0.8);
    });

    it('should understand combined hints', async () => {
      const result = await locator.findElementsByDescription(
        'blue submit button at bottom'
      );
      
      assert.ok(result.elements.length > 0);
      // Should have very high confidence due to multiple matches
      assert.ok(result.elements[0].visual.confidence > 0.9);
    });
  });

  describe('Edge Cases', () => {
    it('should handle page with no elements', async () => {
      page.evaluate = async () => [];
      
      const result = await locator.findElementsByDescription('button');
      assert.strictEqual(result.elements.length, 0);
      assert.strictEqual(result.metadata.totalMatches, 0);
    });

    it('should handle very long descriptions', async () => {
      const longDesc = 'a'.repeat(1000);
      
      // Should not throw, just process it
      await assert.doesNotReject(() => 
        locator.findElementsByDescription(longDesc)
      );
    });

    it('should handle special characters in description', async () => {
      const specialDesc = 'button@#$%^&*()_+{}[]|\\:";\'<>?,./';
      
      // Should not throw
      await assert.doesNotReject(() => 
        locator.findElementsByDescription(specialDesc)
      );
    });

    it('should handle unicode characters', async () => {
      const unicodeDesc = '提交按钮 버튼 кнопка';
      
      // Should not throw
      await assert.doesNotReject(() => 
        locator.findElementsByDescription(unicodeDesc)
      );
    });
  });

  describe('Performance', () => {
    it('should complete search within reasonable time', async () => {
      const startTime = Date.now();
      await locator.findElementsByDescription('button');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds (generous for CI)
      assert.ok(duration < 5000, `Search took ${duration}ms, expected < 5000ms`);
    });

    it('should include processing time in metadata', async () => {
      const result = await locator.findElementsByDescription('button');
      
      assert.ok(result.metadata.processingTime > 0);
      assert.ok(result.metadata.processingTime < 10000);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent searches', async () => {
      const searches = [
        locator.findElementsByDescription('button'),
        locator.findElementsByDescription('input'),
        locator.findElementsByDescription('link'),
      ];
      
      const results = await Promise.all(searches);
      
      assert.strictEqual(results.length, 3);
      results.forEach(result => {
        assert.ok(result.metadata);
        assert.ok(result.elements);
      });
    });
  });

  describe('Element Existence Check', () => {
    beforeEach(() => {
      page.evaluate = async () => [
        {
          uid: 'element-1',
          boundingBox: {x: 100, y: 100, width: 50, height: 30},
          selector: '#submit',
          xpath: '//*[@id="submit"]',
          accessibility: {role: 'button', name: 'Submit'},
          visual: {visibleText: 'Submit', isVisible: true, confidence: 0.9},
          attributes: {},
        },
      ];
    });

    it('should return true for existing element', async () => {
      const exists = await locator.elementExists('submit button');
      assert.strictEqual(exists, true);
    });

    it('should return false for non-existing element', async () => {
      const exists = await locator.elementExists('nonexistent element');
      assert.strictEqual(exists, false);
    });

    it('should return false on error', async () => {
      page.evaluate = async () => {
        throw new Error('Evaluation failed');
      };
      
      const exists = await locator.elementExists('button');
      assert.strictEqual(exists, false);
    });
  });

  describe('Wait for Element', () => {
    it('should find element immediately if present', async () => {
      page.evaluate = async () => [
        {
          uid: 'element-1',
          boundingBox: {x: 100, y: 100, width: 50, height: 30},
          selector: '#submit',
          xpath: '//*[@id="submit"]',
          accessibility: {role: 'button', name: 'Submit'},
          visual: {visibleText: 'Submit', isVisible: true, confidence: 0.9},
          attributes: {},
        },
      ];

      const startTime = Date.now();
      const element = await locator.waitForElement('submit button', 5000, 100);
      const duration = Date.now() - startTime;
      
      assert.ok(element);
      assert.ok(duration < 1000); // Should find quickly
    });

    it('should timeout if element never appears', async () => {
      page.evaluate = async () => [];
      
      await assert.rejects(
        () => locator.waitForElement('nonexistent', 1000, 100),
        /did not appear within 1000ms/
      );
    });
  });
});

console.log('✅ All production robustness tests defined');
