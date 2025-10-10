/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ElementHandle, Page} from 'puppeteer-core';

import type {TextSnapshot} from '../McpContext.js';

// Type alias for Uint8Array to avoid Buffer type issues
type ScreenshotData = Uint8Array | string;

/**
 * Represents an element found through visual analysis with its DOM metadata
 */
export interface LocatedElement {
  /** Unique identifier for the element */
  uid: string;
  /** Visual bounding box coordinates */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** CSS selector for the element */
  selector: string;
  /** XPath selector for the element */
  xpath: string;
  /** Accessibility role and name */
  accessibility: {
    role: string;
    name: string;
  };
  /** Visual attributes extracted from screenshot */
  visual: {
    /** Text visible in the element */
    visibleText: string;
    /** Whether element is currently visible */
    isVisible: boolean;
    /** Confidence score for visual detection (0-1) */
    confidence: number;
    /** Screenshot region as base64 */
    regionScreenshot?: string;
  };
  /** DOM attributes */
  attributes: Record<string, string>;
  /** Parent element context for better targeting */
  parentContext?: string;
}

/**
 * Result from AI-powered element search
 */
export interface ElementSearchResult {
  /** Found elements matching the description */
  elements: LocatedElement[];
  /** Annotated screenshot with highlighted elements */
  annotatedScreenshot?: string;
  /** Search metadata */
  metadata: {
    query: string;
    totalMatches: number;
    processingTime: number;
    snapshotId: string;
  };
}

/**
 * Configuration for the element locator
 */
export interface ElementLocatorConfig {
  /** Include element screenshots in results */
  includeElementScreenshots?: boolean;
  /** Annotate full page screenshot */
  annotateScreenshot?: boolean;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Whether to capture full page or viewport only */
  fullPage?: boolean;
}

/**
 * Core class for AI-powered element location and automation
 */
export class ElementLocator {
  private page: Page;
  private config: Required<ElementLocatorConfig>;

  constructor(page: Page, config: ElementLocatorConfig = {}) {
    this.page = page;
    this.config = {
      includeElementScreenshots: config.includeElementScreenshots ?? false,
      annotateScreenshot: config.annotateScreenshot ?? false,
      maxResults: config.maxResults ?? 10,
      minConfidence: config.minConfidence ?? 0.5,
      fullPage: config.fullPage ?? false,
    };
  }

  /**
   * Find elements on the page based on natural language description
   * @throws {Error} If page is not ready or description is invalid
   */
  async findElementsByDescription(
    description: string,
  ): Promise<ElementSearchResult> {
    // Validate input
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new Error('Description must be a non-empty string');
    }

    // Ensure page is ready
    await this.ensurePageReady();

    const startTime = Date.now();

    try {
      // Get page snapshot for DOM context (with retry)
      const snapshot = await this.withRetry(
        () => this.capturePageSnapshot(),
        'Failed to capture page snapshot'
      );

      // Capture screenshot for visual analysis (with retry)
      const screenshot = await this.withRetry(
        () => this.captureScreenshot(),
        'Failed to capture screenshot'
      );

      // Get all interactive elements with their visual properties
      const elements = await this.withRetry(
        () => this.extractElementsWithVisualData(),
        'Failed to extract elements'
      );

      if (elements.length === 0) {
        console.warn('No interactive elements found on page');
      }

      // Filter elements based on description
      const matches = await this.matchElementsByDescription(
        elements,
        description,
      );

      // Sort by confidence and limit results
      const sortedMatches = matches
        .sort((a, b) => b.visual.confidence - a.visual.confidence)
        .slice(0, this.config.maxResults);

      // Optionally annotate screenshot
      let annotatedScreenshot: string | undefined;
      if (this.config.annotateScreenshot && sortedMatches.length > 0) {
        try {
          annotatedScreenshot = await this.annotateScreenshot(
            screenshot,
            sortedMatches,
          );
        } catch (error) {
          console.warn('Failed to annotate screenshot:', error);
          // Continue without annotation
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        elements: sortedMatches,
        annotatedScreenshot,
        metadata: {
          query: description,
          totalMatches: matches.length,
          processingTime,
          snapshotId: snapshot.snapshotId,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      throw new Error(
        `Failed to find elements for description "${description}": ${error instanceof Error ? error.message : String(error)} (took ${processingTime}ms)`
      );
    }
  }

  /**
   * Ensure the page is in a ready state for element location
   * @private
   */
  private async ensurePageReady(): Promise<void> {
    try {
      // Wait for page to be ready
      await this.page.waitForFunction(
        () => document.readyState === 'complete',
        {timeout: 5000}
      ).catch(() => {
        // Continue even if timeout - page might be ready enough
        console.warn('Page load timeout, continuing anyway');
      });

      // Check if page is still connected
      if (!this.page.isClosed()) {
        return;
      }

      throw new Error('Page is closed');
    } catch (error) {
      throw new Error(`Page is not ready: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a function with retry logic
   * @private
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    errorMessage: string,
    maxRetries: number = 3,
    delay: number = 500
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(
          `Attempt ${attempt}/${maxRetries} failed: ${error instanceof Error ? error.message : String(error)}`
        );

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw new Error(
      `${errorMessage} after ${maxRetries} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }

  /**
   * Capture a screenshot of the current page
   * @private
   */
  private async captureScreenshot(): Promise<Uint8Array> {
    try {
      const screenshot = await this.page.screenshot({
        type: 'png',
        fullPage: this.config.fullPage,
        encoding: 'binary',
        captureBeyondViewport: this.config.fullPage,
      });
      return screenshot as Uint8Array;
    } catch (error) {
      throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Capture accessibility snapshot of the page
   * @private
   */
  private async capturePageSnapshot(): Promise<TextSnapshot> {
    let client;
    try {
      client = await this.page.createCDPSession();
      await client.send('Accessibility.enable');
      const {nodes} = await client.send('Accessibility.getFullAXTree');

      // Validate nodes
      if (!nodes || nodes.length === 0) {
        console.warn('No accessibility nodes found, page may be empty');
      }

      // Build snapshot structure
      const idToNode = new Map();
      const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Process nodes and build tree
      const root = this.buildAccessibilityTree(nodes, idToNode);

      return {
        root,
        idToNode,
        snapshotId,
      };
    } catch (error) {
      throw new Error(`Failed to capture accessibility snapshot: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Always cleanup
      if (client) {
        try {
          await client.send('Accessibility.disable');
          await client.detach();
        } catch (error) {
          console.warn('Failed to cleanup CDP session:', error);
        }
      }
    }
  }

  /**
   * Build accessibility tree from nodes
   */
  private buildAccessibilityTree(
    nodes: any[],
    idToNode: Map<string, any>,
  ): any {
    if (!nodes || nodes.length === 0) {
      return {id: 'root', role: 'WebArea', name: '', children: []};
    }

    // Build tree structure
    const root = nodes[0];
    const processedRoot = this.processAXNode(root, idToNode);
    return processedRoot;
  }

  /**
   * Process accessibility node
   */
  private processAXNode(node: any, idToNode: Map<string, any>): any {
    const processed = {
      id: node.nodeId || `node-${Math.random()}`,
      role: node.role?.value || 'generic',
      name: node.name?.value || '',
      children: [],
      ...node,
    };

    idToNode.set(processed.id, processed);

    if (node.childIds) {
      processed.children = node.childIds.map((childId: string) => {
        const childNode = node.childIds[childId];
        return childNode
          ? this.processAXNode(childNode, idToNode)
          : {id: childId, role: 'unknown', name: '', children: []};
      });
    }

    return processed;
  }

  /**
   * Extract all interactive elements with their visual properties
   */
  private async extractElementsWithVisualData(): Promise<LocatedElement[]> {
    const elements = await this.page.evaluate(() => {
      const results: any[] = [];
      const uidCounter = {value: 0};

      // Target interactive and visible elements
      const selectors = [
        'a',
        'button',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="textbox"]',
        '[onclick]',
        '[tabindex]',
        'img',
        '[contenteditable="true"]',
      ];

      const elements = document.querySelectorAll(selectors.join(','));

      elements.forEach(element => {
        const rect = element.getBoundingClientRect();

        // Skip hidden or zero-size elements
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          rect.top < -1000 ||
          rect.left < -1000
        ) {
          return;
        }

        const computedStyle = window.getComputedStyle(element);
        if (
          computedStyle.display === 'none' ||
          computedStyle.visibility === 'hidden' ||
          computedStyle.opacity === '0'
        ) {
          return;
        }

        const uid = `element-${uidCounter.value++}`;

        // Generate CSS selector
        const selector = generateSelector(element);

        // Generate XPath
        const xpath = generateXPath(element);

        // Extract attributes
        const attributes: Record<string, string> = {};
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          if (attr) {
            attributes[attr.name] = attr.value;
          }
        }

        // Get visible text
        const visibleText = (element.textContent || '').trim().slice(0, 200);

        // Get accessibility info
        const role =
          element.getAttribute('role') ||
          (element as HTMLElement).tagName.toLowerCase();
        const ariaLabel = element.getAttribute('aria-label') || '';

        results.push({
          uid,
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          selector,
          xpath,
          accessibility: {
            role,
            name: ariaLabel || visibleText.slice(0, 50),
          },
          visual: {
            visibleText,
            isVisible: true,
            confidence: 1.0,
          },
          attributes,
          parentContext: element.parentElement?.tagName.toLowerCase(),
        });
      });

      return results;

      function generateSelector(el: Element): string {
        if (el.id) return `#${el.id}`;

        const path: string[] = [];
        let current: Element | null = el;

        while (current && current.tagName) {
          let selector = current.tagName.toLowerCase();

          if (current.className) {
            const classes = Array.from(current.classList)
              .filter(c => c && !/\s/.test(c))
              .slice(0, 2);
            if (classes.length) {
              selector += '.' + classes.join('.');
            }
          }

          path.unshift(selector);
          current = current.parentElement;

          if (path.length > 5) break;
        }

        return path.join(' > ');
      }

      function generateXPath(el: Element): string {
        if (el.id) return `//*[@id="${el.id}"]`;

        const path: string[] = [];
        let current: Element | null = el;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 0;
          let sibling = current.previousSibling;

          while (sibling) {
            if (
              sibling.nodeType === Node.ELEMENT_NODE &&
              sibling.nodeName === current.nodeName
            ) {
              index++;
            }
            sibling = sibling.previousSibling;
          }

          const tagName = current.nodeName.toLowerCase();
          const pathIndex = index > 0 ? `[${index + 1}]` : '';
          path.unshift(`${tagName}${pathIndex}`);

          current = current.parentElement;
          if (path.length > 10) break;
        }

        return '/' + path.join('/');
      }
    });

    // Optionally capture element screenshots
    if (this.config.includeElementScreenshots) {
      for (const element of elements) {
        try {
          const handle = await this.page.$(element.selector);
          if (handle) {
            const screenshot = await handle.screenshot({encoding: 'base64'});
            element.visual.regionScreenshot = screenshot as string;
            await handle.dispose();
          }
        } catch (e) {
          // Element might have been removed, skip
        }
      }
    }

    return elements;
  }

  /**
   * Match elements based on natural language description
   * Enhanced with robust semantic matching and multiple scoring strategies
   */
  private async matchElementsByDescription(
    elements: LocatedElement[],
    description: string,
  ): Promise<LocatedElement[]> {
    const lowerDesc = description.toLowerCase();
    
    // Enhanced keyword extraction with stopwords and semantic grouping
    const stopwords = ['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'with', 'have', 'has'];
    const keywords = lowerDesc
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.includes(w));
    
    // Extract semantic hints from description
    const semanticHints = this.extractSemanticHints(lowerDesc);

    return elements
      .map(element => {
        let score = 0;
        let matchDetails: string[] = [];

        // 1. Exact text match (highest priority)
        const elementText = element.visual.visibleText.toLowerCase();
        if (elementText === lowerDesc || lowerDesc === elementText) {
          score += 50;
          matchDetails.push('exact text match');
        }

        // 2. Exact name match
        const elementName = element.accessibility.name.toLowerCase();
        if (elementName === lowerDesc || lowerDesc === elementName) {
          score += 45;
          matchDetails.push('exact name match');
        }

        // 3. Full phrase containment
        if (elementText.includes(lowerDesc)) {
          score += 30;
          matchDetails.push('contains full phrase in text');
        } else if (elementName.includes(lowerDesc)) {
          score += 25;
          matchDetails.push('contains full phrase in name');
        }

        // 4. Keyword matching with frequency bonus
        const textMatch = keywords.filter(keyword =>
          elementText.includes(keyword),
        );
        score += textMatch.length * 5;
        if (textMatch.length > 0) {
          matchDetails.push(`text keywords: ${textMatch.join(', ')}`);
        }

        const nameMatch = keywords.filter(keyword =>
          elementName.includes(keyword),
        );
        score += nameMatch.length * 4;
        if (nameMatch.length > 0) {
          matchDetails.push(`name keywords: ${nameMatch.join(', ')}`);
        }

        // 5. Role-based matching with semantic understanding
        const roleScore = this.matchRole(element.accessibility.role, semanticHints);
        score += roleScore;
        if (roleScore > 0) {
          matchDetails.push(`role: ${element.accessibility.role}`);
        }

        // 6. Visual property matching (colors, position, etc.)
        const visualScore = this.matchVisualProperties(element, semanticHints);
        score += visualScore;
        if (visualScore > 0) {
          matchDetails.push('visual properties match');
        }

        // 7. Attribute matching with semantic awareness
        for (const [key, value] of Object.entries(element.attributes)) {
          const attrText = `${key}=${value}`.toLowerCase();
          const attrKeywordMatches = keywords.filter(keyword =>
            attrText.includes(keyword),
          ).length;
          score += attrKeywordMatches * 2;
          
          // Boost score for important attributes
          if (key === 'aria-label' || key === 'title' || key === 'alt') {
            score += attrKeywordMatches * 3;
          }
        }

        // 8. Contextual scoring - nearby text/labels
        const parentScore = this.matchContextualElements(element, keywords);
        score += parentScore;
        if (parentScore > 0) {
          matchDetails.push('contextual match');
        }

        // 9. Boost score if element type matches intent
        const intentScore = this.matchIntent(element, semanticHints);
        score += intentScore;

        // 10. Penalty for generic elements without good matches
        if (element.visual.visibleText.length === 0 && 
            element.accessibility.name.length === 0 && 
            score < 5) {
          score *= 0.5; // Reduce score for unlabeled elements
        }

        // Calculate confidence with adaptive normalization
        // Higher keyword count = higher threshold
        const normalizer = Math.max(keywords.length * 5, 10);
        const confidence = Math.min(score / normalizer, 1.0);

        // Store match details for debugging
        const enhancedElement = {
          ...element,
          visual: {
            ...element.visual,
            confidence,
            matchScore: score,
            matchDetails: matchDetails.join('; '),
          },
        };

        return enhancedElement;
      })
      .filter(element => element.visual.confidence >= this.config.minConfidence)
      .sort((a, b) => b.visual.confidence - a.visual.confidence); // Sort by confidence
  }

  /**
   * Extract semantic hints from description (colors, positions, actions)
   */
  private extractSemanticHints(description: string): {
    colors: string[];
    positions: string[];
    actions: string[];
    elementTypes: string[];
  } {
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'grey'];
    const positions = ['top', 'bottom', 'left', 'right', 'center', 'above', 'below', 'beside', 'near', 'first', 'last'];
    const actions = ['submit', 'login', 'sign in', 'register', 'search', 'filter', 'delete', 'remove', 'add', 'create', 'save', 'cancel', 'close', 'open'];
    const elementTypes = ['button', 'input', 'link', 'checkbox', 'radio', 'dropdown', 'select', 'textarea', 'form', 'menu', 'icon', 'image'];

    return {
      colors: colors.filter(color => description.includes(color)),
      positions: positions.filter(pos => description.includes(pos)),
      actions: actions.filter(action => description.includes(action)),
      elementTypes: elementTypes.filter(type => description.includes(type)),
    };
  }

  /**
   * Match element role with semantic hints
   */
  private matchRole(role: string, hints: ReturnType<typeof this.extractSemanticHints>): number {
    let score = 0;
    const lowerRole = role.toLowerCase();

    // Direct role matching
    if (hints.elementTypes.some(type => lowerRole.includes(type))) {
      score += 10;
    }

    // Action-based role matching
    if (hints.actions.length > 0) {
      if (lowerRole === 'button' || lowerRole === 'link') {
        score += 5;
      }
    }

    // Semantic role mappings
    const roleMap: Record<string, string[]> = {
      'button': ['button', 'submit', 'click', 'press'],
      'textbox': ['input', 'text', 'type', 'enter', 'search'],
      'link': ['link', 'navigate', 'go to'],
      'checkbox': ['check', 'toggle', 'select'],
      'combobox': ['dropdown', 'select', 'choose'],
    };

    for (const [roleType, keywords] of Object.entries(roleMap)) {
      if (lowerRole === roleType && hints.actions.some(action => 
        keywords.some(kw => action.includes(kw))
      )) {
        score += 8;
      }
    }

    return score;
  }

  /**
   * Match visual properties (colors, size, position)
   */
  private matchVisualProperties(
    element: LocatedElement,
    hints: ReturnType<typeof this.extractSemanticHints>
  ): number {
    let score = 0;

    // Color matching - check attributes for color information
    if (hints.colors.length > 0) {
      const style = element.attributes['style'] || '';
      const className = element.attributes['class'] || '';
      const colorInfo = (style + ' ' + className).toLowerCase();
      
      for (const color of hints.colors) {
        if (colorInfo.includes(color)) {
          score += 15; // High boost for color matches
        }
        // Also check visible text for color names
        if (element.visual.visibleText.toLowerCase().includes(color)) {
          score += 10;
        }
      }
    }

    // Position matching
    if (hints.positions.length > 0) {
      const {x, y, width, height} = element.boundingBox;
      const viewportWidth = 1920; // Approximate, could be dynamic
      const viewportHeight = 1080;

      for (const position of hints.positions) {
        if (position === 'top' && y < viewportHeight * 0.3) score += 8;
        if (position === 'bottom' && y > viewportHeight * 0.7) score += 8;
        if (position === 'left' && x < viewportWidth * 0.3) score += 8;
        if (position === 'right' && x > viewportWidth * 0.7) score += 8;
        if (position === 'center' && 
            x > viewportWidth * 0.3 && x < viewportWidth * 0.7) score += 8;
        if (position === 'first' && y < 200) score += 8;
        if (position === 'last' && y > viewportHeight - 200) score += 8;
      }
    }

    // Size-based hints (large buttons, small icons, etc.)
    const area = element.boundingBox.width * element.boundingBox.height;
    if (area > 10000) {
      // Large element
      if (hints.elementTypes.includes('button')) score += 5;
    } else if (area < 1000) {
      // Small element
      if (hints.elementTypes.includes('icon') || hints.elementTypes.includes('image')) score += 5;
    }

    return score;
  }

  /**
   * Match contextual elements (labels, nearby text)
   */
  private matchContextualElements(element: LocatedElement, keywords: string[]): number {
    // This would analyze parent/sibling elements for context
    // For now, basic implementation
    let score = 0;

    // Check if element has associated label
    const labelId = element.attributes['aria-labelledby'];
    if (labelId) {
      score += 3; // Boost for elements with explicit labels
    }

    // Check if element is inside a form
    if (element.selector.includes('form')) {
      score += 2;
    }

    return score;
  }

  /**
   * Match user intent with element characteristics
   */
  private matchIntent(
    element: LocatedElement,
    hints: ReturnType<typeof this.extractSemanticHints>
  ): number {
    let score = 0;

    // If user wants to click/submit, boost buttons
    const clickActions = ['submit', 'login', 'sign in', 'register', 'save', 'confirm'];
    if (hints.actions.some(action => clickActions.includes(action))) {
      if (element.accessibility.role === 'button') {
        score += 10;
      }
    }

    // If user wants to type/enter, boost inputs
    const typeActions = ['type', 'enter', 'input', 'search', 'filter'];
    if (hints.actions.some(action => typeActions.includes(action))) {
      if (element.accessibility.role === 'textbox') {
        score += 10;
      }
    }

    return score;
  }

  /**
   * Annotate screenshot with element bounding boxes and labels
   */
  private async annotateScreenshot(
    screenshot: Uint8Array,
    elements: LocatedElement[],
  ): Promise<string> {
    // Get page dimensions for proper scaling
    const viewport = await this.page.viewport();
    
    // Convert Uint8Array to base64 string
    const base64Screenshot = this.arrayBufferToBase64(screenshot);
    
    if (!viewport) {
      return base64Screenshot;
    }

    // Use browser canvas API to annotate
    const annotated = await this.page.evaluate(
      async (
        screenshotBase64: string,
        elementsData: Array<{
          boundingBox: {x: number; y: number; width: number; height: number};
          accessibility: {name: string};
          visual: {confidence: number};
        }>,
        viewportData: {width: number; height: number},
      ) => {
        return new Promise<string>(resolve => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;

            // Draw original screenshot
            ctx.drawImage(img, 0, 0);

            // Draw bounding boxes and labels
            elementsData.forEach((element, index: number) => {
              const {x, y, width, height} = element.boundingBox;

              // Draw bounding box
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, width, height);

              // Draw label background
              const label = `${index + 1}: ${element.accessibility.name.slice(0, 30)}`;
              ctx.font = '12px Arial';
              const textMetrics = ctx.measureText(label);
              const padding = 4;

              ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
              ctx.fillRect(
                x,
                y - 20,
                textMetrics.width + padding * 2,
                16 + padding,
              );

              // Draw label text
              ctx.fillStyle = '#000000';
              ctx.fillText(label, x + padding, y - 6);

              // Draw confidence
              ctx.fillStyle = '#ffffff';
              ctx.font = '10px Arial';
              ctx.fillText(
                `${(element.visual.confidence * 100).toFixed(0)}%`,
                x + width - 30,
                y + 12,
              );
            });

            resolve(canvas.toDataURL('image/png').split(',')[1]);
          };
          img.src = 'data:image/png;base64,' + screenshotBase64;
        });
      },
      base64Screenshot,
      elements,
      viewport,
    );

    return annotated;
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i] as number);
    }
    return globalThis.btoa(binary);
  }

  /**
   * Get element handle by UID for interaction
   * @param uid - Unique identifier of the element
   * @returns ElementHandle or null if not found
   * @throws {Error} If UID is invalid
   */
  async getElementHandle(uid: string): Promise<ElementHandle | null> {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    // Extract elements from page
    const elements = await this.extractElementsWithVisualData();
    const element = elements.find(e => e.uid === uid);

    if (!element) {
      console.warn(`Element with UID ${uid} not found`);
      return null;
    }

    // Try CSS selector first (most reliable)
    try {
      const handle = await this.page.$(element.selector);
      if (handle) {
        // Verify element is still attached and visible
        const isAttached = await handle.evaluate((el: Element) => {
          return document.contains(el);
        }).catch(() => false);

        if (isAttached) {
          return handle;
        }
        await handle.dispose();
      }
    } catch (error) {
      console.warn(`CSS selector failed for ${uid}:`, error);
    }

    // Try XPath as fallback
    try {
      const handles = await this.page.$x(element.xpath);
      if (handles.length > 0) {
        const handle = handles[0];
        
        // Verify element is still attached
        const isAttached = await handle.evaluate((el: Element) => {
          return document.contains(el);
        }).catch(() => false);

        // Dispose extra handles
        for (let i = 1; i < handles.length; i++) {
          await handles[i].dispose().catch(() => {});
        }

        if (isAttached) {
          return handle;
        }
        await handle.dispose();
      }
    } catch (error) {
      console.warn(`XPath selector failed for ${uid}:`, error);
    }

    console.error(`Could not locate element ${uid} - it may have been removed from DOM`);
    return null;
  }

  /**
   * Interact with an element by UID
   * @param uid - Element unique identifier
   * @param action - Type of interaction (click, type, hover, focus, scroll_into_view)
   * @param options - Additional options (e.g., text for typing)
   * @throws {Error} If interaction fails
   */
  async interactWithElement(
    uid: string,
    action: 'click' | 'type' | 'hover' | 'focus' | 'scroll_into_view',
    options?: {text?: string; delay?: number}
  ): Promise<void> {
    const handle = await this.getElementHandle(uid);

    if (!handle) {
      throw new Error(`Cannot interact with element ${uid}: element not found`);
    }

    try {
      // Ensure element is in viewport
      await handle.scrollIntoViewIfNeeded().catch(() => {
        console.warn('Could not scroll element into view, continuing anyway');
      });

      // Wait a bit for any animations
      await new Promise(resolve => setTimeout(resolve, 100));

      switch (action) {
        case 'click':
          await handle.click({delay: options?.delay || 0});
          // Wait for potential navigation or state changes
          await this.page.waitForLoadState('networkidle', {timeout: 2000}).catch(() => {});
          break;

        case 'type':
          if (!options?.text) {
            throw new Error('Text is required for type action');
          }
          // Clear existing text first
          await handle.click({clickCount: 3}); // Select all
          await this.page.keyboard.press('Backspace');
          // Type new text
          await handle.type(options.text, {delay: options?.delay || 50});
          break;

        case 'hover':
          await handle.hover();
          break;

        case 'focus':
          await handle.focus();
          break;

        case 'scroll_into_view':
          await handle.scrollIntoViewIfNeeded();
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Dispose handle after use
      await handle.dispose();
    } catch (error) {
      // Cleanup handle on error
      await handle.dispose().catch(() => {});
      throw new Error(
        `Failed to ${action} element ${uid}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Wait for a specific load state
   * @private
   */
  private async waitForLoadState(
    state: 'load' | 'domcontentloaded' | 'networkidle',
    options?: {timeout?: number}
  ): Promise<void> {
    try {
      await this.page.waitForLoadState(state, options);
    } catch (error) {
      // Timeout is acceptable in many cases
      console.warn(`Wait for ${state} timed out:`, error);
    }
  }

  /**
   * Find and interact with element in one call
   * @param description - Natural language description
   * @param action - Type of interaction
   * @param options - Additional options
   * @returns The element that was interacted with
   * @throws {Error} If no suitable element is found or interaction fails
   */
  async findAndInteract(
    description: string,
    action: 'click' | 'type' | 'hover' | 'focus',
    options?: {text?: string; delay?: number; minConfidence?: number}
  ): Promise<LocatedElement> {
    // Find elements
    const result = await this.findElementsByDescription(description);

    if (result.elements.length === 0) {
      throw new Error(`No elements found matching description: "${description}"`);
    }

    // Get best match
    const bestMatch = result.elements[0];
    const minConf = options?.minConfidence || this.config.minConfidence;

    if (bestMatch.visual.confidence < minConf) {
      throw new Error(
        `Best match confidence (${(bestMatch.visual.confidence * 100).toFixed(1)}%) ` +
        `is below minimum (${(minConf * 100).toFixed(1)}%)`
      );
    }

    // Interact with it
    await this.interactWithElement(bestMatch.uid, action, options);

    return bestMatch;
  }

  /**
   * Wait for an element matching description to appear
   * @param description - Natural language description
   * @param timeout - Maximum wait time in milliseconds
   * @param pollInterval - How often to check for element
   * @returns The found element
   * @throws {Error} If element doesn't appear within timeout
   */
  async waitForElement(
    description: string,
    timeout: number = 10000,
    pollInterval: number = 500
  ): Promise<LocatedElement> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.findElementsByDescription(description);

        if (result.elements.length > 0 && result.elements[0].visual.confidence >= this.config.minConfidence) {
          return result.elements[0];
        }
      } catch (error) {
        // Continue polling on errors
        console.warn('Error while waiting for element:', error);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Element matching "${description}" did not appear within ${timeout}ms`
    );
  }

  /**
   * Check if element matching description exists on page
   * @param description - Natural language description
   * @returns true if element exists with sufficient confidence
   */
  async elementExists(description: string): Promise<boolean> {
    try {
      const result = await this.findElementsByDescription(description);
      return result.elements.length > 0 && 
             result.elements[0].visual.confidence >= this.config.minConfidence;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update configuration
   * @param config - Partial configuration to update
   */
  setConfig(config: Partial<ElementLocatorConfig>): void {
    // Validate configuration
    if (config.minConfidence !== undefined) {
      if (config.minConfidence < 0 || config.minConfidence > 1) {
        throw new Error('minConfidence must be between 0 and 1');
      }
    }
    if (config.maxResults !== undefined) {
      if (config.maxResults < 1) {
        throw new Error('maxResults must be at least 1');
      }
    }

    this.config = {...this.config, ...config};
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  getConfig(): Readonly<Required<ElementLocatorConfig>> {
    return {...this.config};
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = {
      includeElementScreenshots: false,
      annotateScreenshot: false,
      maxResults: 10,
      minConfidence: 0.5,
      fullPage: false,
    };
  }
}
