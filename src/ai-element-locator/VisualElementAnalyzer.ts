/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Page} from 'puppeteer-core';

import type {LocatedElement} from './ElementLocator.js';

/**
 * Configuration for visual analysis
 */
export interface VisualAnalysisConfig {
  /** Include color information */
  includeColors?: boolean;
  /** Detect element groupings */
  detectGroups?: boolean;
  /** Minimum element size to consider */
  minElementSize?: {width: number; height: number};
}

/**
 * Visual properties of an element
 */
export interface ElementVisualProperties {
  /** Primary background color */
  backgroundColor: string;
  /** Primary text color */
  color: string;
  /** Font size in pixels */
  fontSize: number;
  /** Font family */
  fontFamily: string;
  /** Z-index stacking order */
  zIndex: number;
  /** Opacity */
  opacity: number;
  /** Border information */
  border: {
    width: number;
    color: string;
    style: string;
  };
  /** Whether element is interactive */
  isInteractive: boolean;
  /** Visual category */
  category: 'button' | 'input' | 'text' | 'image' | 'link' | 'container' | 'other';
}

/**
 * Analyzes visual properties of page elements
 */
export class VisualElementAnalyzer {
  private page: Page;
  private config: Required<VisualAnalysisConfig>;

  constructor(page: Page, config: VisualAnalysisConfig = {}) {
    this.page = page;
    this.config = {
      includeColors: config.includeColors ?? true,
      detectGroups: config.detectGroups ?? false,
      minElementSize: config.minElementSize ?? {width: 5, height: 5},
    };
  }

  /**
   * Analyze visual properties of elements on the page
   */
  async analyzeElements(
    elements: LocatedElement[],
  ): Promise<Map<string, ElementVisualProperties>> {
    const results = new Map<string, ElementVisualProperties>();

    // Run analysis in the browser context for performance
    const visualData = await this.page.evaluate(
      (elementSelectors: Array<{uid: string; selector: string}>) => {
        const results: Record<string, ElementVisualProperties> = {};

        elementSelectors.forEach(({uid, selector}) => {
          try {
            const element = document.querySelector(selector) as HTMLElement;
            if (!element) return;

            const computed = window.getComputedStyle(element);
            const tagName = element.tagName.toLowerCase();

            // Determine element category
            let category: ElementVisualProperties['category'] = 'other';
            if (
              tagName === 'button' ||
              element.getAttribute('role') === 'button'
            ) {
              category = 'button';
            } else if (
              tagName === 'input' ||
              tagName === 'textarea' ||
              tagName === 'select'
            ) {
              category = 'input';
            } else if (tagName === 'a') {
              category = 'link';
            } else if (tagName === 'img' || tagName === 'svg') {
              category = 'image';
            } else if (
              ['div', 'section', 'article', 'aside', 'nav', 'header', 'footer'].includes(
                tagName,
              )
            ) {
              category = 'container';
            } else if (
              ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label'].includes(
                tagName,
              )
            ) {
              category = 'text';
            }

            // Check if interactive
            const isInteractive =
              element.hasAttribute('onclick') ||
              element.hasAttribute('tabindex') ||
              ['a', 'button', 'input', 'select', 'textarea'].includes(tagName) ||
              computed.cursor === 'pointer';

            results[uid] = {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              fontSize: parseFloat(computed.fontSize) || 0,
              fontFamily: computed.fontFamily,
              zIndex: parseInt(computed.zIndex) || 0,
              opacity: parseFloat(computed.opacity) || 1,
              border: {
                width: parseFloat(computed.borderWidth) || 0,
                color: computed.borderColor,
                style: computed.borderStyle,
              },
              isInteractive,
              category,
            };
          } catch (e) {
            // Element might not be accessible
          }
        });

        return results;
      },
      elements.map(e => ({uid: e.uid, selector: e.selector})),
    );

    // Convert to Map
    for (const [uid, props] of Object.entries(visualData)) {
      results.set(uid, props as ElementVisualProperties);
    }

    return results;
  }

  /**
   * Detect element groups based on visual similarity and proximity
   */
  async detectElementGroups(
    elements: LocatedElement[],
  ): Promise<Array<LocatedElement[]>> {
    if (!this.config.detectGroups || elements.length === 0) {
      return [];
    }

    // Simple proximity-based grouping
    const groups: Array<LocatedElement[]> = [];
    const processed = new Set<string>();
    const proximityThreshold = 50; // pixels

    for (const element of elements) {
      if (processed.has(element.uid)) continue;

      const group = [element];
      processed.add(element.uid);

      // Find nearby elements
      for (const other of elements) {
        if (processed.has(other.uid)) continue;

        const distance = this.calculateDistance(
          element.boundingBox,
          other.boundingBox,
        );

        if (distance < proximityThreshold) {
          group.push(other);
          processed.add(other.uid);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Calculate distance between two bounding boxes
   */
  private calculateDistance(
    box1: {x: number; y: number; width: number; height: number},
    box2: {x: number; y: number; width: number; height: number},
  ): number {
    const center1 = {
      x: box1.x + box1.width / 2,
      y: box1.y + box1.height / 2,
    };
    const center2 = {
      x: box2.x + box2.width / 2,
      y: box2.y + box2.height / 2,
    };

    return Math.sqrt(
      Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2),
    );
  }

  /**
   * Highlight elements on the page for debugging
   */
  async highlightElements(
    elements: LocatedElement[],
    duration = 2000,
  ): Promise<void> {
    await this.page.evaluate(
      (elementSelectors: string[], durationMs: number) => {
        const style = document.createElement('style');
        style.textContent = `
        .ai-element-highlight {
          outline: 2px solid #00ff00 !important;
          outline-offset: 2px !important;
          animation: ai-pulse 1s infinite;
        }
        @keyframes ai-pulse {
          0%, 100% { outline-color: #00ff00; }
          50% { outline-color: #00ff00aa; }
        }
      `;
        document.head.appendChild(style);

        const highlighted: Element[] = [];

        elementSelectors.forEach(selector => {
          try {
            const element = document.querySelector(selector);
            if (element) {
              element.classList.add('ai-element-highlight');
              highlighted.push(element);
            }
          } catch (e) {
            // Selector might be invalid
          }
        });

        setTimeout(() => {
          highlighted.forEach(element => {
            element.classList.remove('ai-element-highlight');
          });
          style.remove();
        }, durationMs);
      },
      elements.map(e => e.selector),
      duration,
    );
  }

  /**
   * Capture individual element screenshots in bulk
   */
  async captureElementScreenshots(
    elements: LocatedElement[],
  ): Promise<Map<string, string>> {
    const screenshots = new Map<string, string>();

    for (const element of elements) {
      try {
        const handle = await this.page.$(element.selector);
        if (handle) {
          const screenshot = await handle.screenshot({
            encoding: 'base64',
            type: 'png',
          });
          screenshots.set(element.uid, screenshot as string);
          await handle.dispose();
        }
      } catch (e) {
        // Element might not be screenshot-able
      }
    }

    return screenshots;
  }

  /**
   * Get viewport-relative coordinates for an element
   */
  async getElementViewportPosition(
    selector: string,
  ): Promise<{x: number; y: number} | null> {
    return this.page.evaluate((sel: string) => {
      const element = document.querySelector(sel);
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      };
    }, selector);
  }
}
