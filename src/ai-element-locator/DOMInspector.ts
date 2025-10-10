/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Page, ElementHandle} from 'puppeteer-core';

/**
 * Deep DOM element information with relationships
 */
export interface DeepDOMElement {
  /** Unique identifier */
  uid: string;
  /** Tag name */
  tagName: string;
  /** Element ID */
  id: string;
  /** CSS classes */
  classes: string[];
  /** All attributes */
  attributes: Record<string, string>;
  /** Text content (trimmed) */
  textContent: string;
  /** Inner text (visible text) */
  innerText: string;
  /** HTML content */
  innerHTML: string;
  /** Bounding box */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
  /** Computed styles */
  computedStyle: {
    display: string;
    visibility: string;
    opacity: string;
    position: string;
    zIndex: string;
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    cursor: string;
  };
  /** Element relationships */
  relationships: {
    parentId?: string;
    parentTag?: string;
    parentClasses?: string[];
    siblingCount: number;
    childCount: number;
    depth: number;
    ancestorChain: Array<{tag: string; id?: string; classes?: string[]}>;
  };
  /** Interactivity flags */
  interactivity: {
    isVisible: boolean;
    isClickable: boolean;
    isInputField: boolean;
    isLink: boolean;
    isButton: boolean;
    isFocusable: boolean;
    hasEventListeners: boolean;
    isDisabled: boolean;
  };
  /** ARIA attributes */
  aria: {
    role?: string;
    label?: string;
    labelledBy?: string;
    describedBy?: string;
    hidden?: boolean;
    expanded?: boolean;
    selected?: boolean;
    checked?: boolean;
    disabled?: boolean;
  };
  /** Data attributes */
  dataAttributes: Record<string, string>;
  /** CSS selectors for this element */
  selectors: {
    css: string;
    cssUnique: string;
    xpath: string;
    xpathShort: string;
  };
}

/**
 * DOM inspection configuration
 */
export interface DOMInspectorConfig {
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Include hidden elements */
  includeHidden?: boolean;
  /** Only include interactive elements */
  interactiveOnly?: boolean;
  /** Minimum element size to include */
  minSize?: {width: number; height: number};
  /** Include computed styles */
  includeStyles?: boolean;
  /** Include relationships */
  includeRelationships?: boolean;
  /** Maximum number of elements */
  maxElements?: number;
}

/**
 * DOM search criteria
 */
export interface DOMSearchCriteria {
  /** Tag name(s) to match */
  tagNames?: string[];
  /** ID pattern (regex or string) */
  idPattern?: string | RegExp;
  /** Class pattern (regex or string) */
  classPattern?: string | RegExp;
  /** Text content pattern */
  textPattern?: string | RegExp;
  /** Attribute filters */
  attributes?: Record<string, string | RegExp>;
  /** ARIA role */
  ariaRole?: string;
  /** Must be visible */
  visible?: boolean;
  /** Must be interactive */
  interactive?: boolean;
  /** CSS selector */
  cssSelector?: string;
  /** XPath selector */
  xpathSelector?: string;
}

/**
 * Element cluster/group information
 */
export interface ElementCluster {
  /** Cluster type */
  type: 'form' | 'navigation' | 'list' | 'table' | 'menu' | 'card-group' | 'button-group' | 'custom';
  /** Elements in this cluster */
  elements: DeepDOMElement[];
  /** Common parent element */
  parentElement?: DeepDOMElement;
  /** Cluster bounding box */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Cluster metadata */
  metadata: {
    elementCount: number;
    clusterName?: string;
    semanticPurpose?: string;
  };
}

/**
 * Advanced DOM Inspector for deep element analysis
 * Provides comprehensive DOM traversal and element discovery
 */
export class DOMInspector {
  private page: Page;
  private config: Required<DOMInspectorConfig>;
  private elementCache: Map<string, DeepDOMElement>;

  constructor(page: Page, config: DOMInspectorConfig = {}) {
    this.page = page;
    this.config = {
      maxDepth: config.maxDepth ?? 20,
      includeHidden: config.includeHidden ?? false,
      interactiveOnly: config.interactiveOnly ?? false,
      minSize: config.minSize ?? {width: 1, height: 1},
      includeStyles: config.includeStyles ?? true,
      includeRelationships: config.includeRelationships ?? true,
      maxElements: config.maxElements ?? 1000,
    };
    this.elementCache = new Map();
  }

  /**
   * Perform deep inspection of the entire DOM
   */
  async inspectDOM(): Promise<DeepDOMElement[]> {
    console.log('🔍 Starting deep DOM inspection...');
    const startTime = Date.now();

    const elements = await this.page.evaluate(
      (config: Required<DOMInspectorConfig>) => {
        const elements: DeepDOMElement[] = [];
        const elementIdMap = new WeakMap<Element, string>();
        let uidCounter = 0;

        /**
         * Generate unique ID for element
         */
        function getElementUid(element: Element): string {
          let uid = elementIdMap.get(element);
          if (!uid) {
            uid = `elem-${uidCounter++}`;
            elementIdMap.set(element, uid);
          }
          return uid;
        }

        /**
         * Generate optimal CSS selector
         */
        function generateCSSSelector(element: Element): string {
          if (element.id) {
            return `#${CSS.escape(element.id)}`;
          }

          const path: string[] = [];
          let current: Element | null = element;

          while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
              selector += `#${CSS.escape(current.id)}`;
              path.unshift(selector);
              break;
            }

            if (current.className) {
              const classes = Array.from(current.classList)
                .map(c => `.${CSS.escape(c)}`)
                .join('');
              selector += classes;
            }

            // Add nth-child if needed for uniqueness
            const parent = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children);
              const index = siblings.indexOf(current);
              if (siblings.filter(s => s.tagName === current.tagName).length > 1) {
                selector += `:nth-child(${index + 1})`;
              }
            }

            path.unshift(selector);
            current = current.parentElement;
          }

          return path.join(' > ');
        }

        /**
         * Generate XPath for element
         */
        function generateXPath(element: Element): string {
          if (element.id) {
            return `//*[@id="${element.id}"]`;
          }

          const path: string[] = [];
          let current: Element | null = element;

          while (current && current !== document.body) {
            let index = 0;
            let sibling: Element | null = current;

            while (sibling) {
              if (sibling.tagName === current.tagName) {
                index++;
              }
              sibling = sibling.previousElementSibling;
            }

            const tagName = current.tagName.toLowerCase();
            const pathIndex = index > 1 ? `[${index}]` : '';
            path.unshift(`${tagName}${pathIndex}`);
            current = current.parentElement;
          }

          return '//' + path.join('/');
        }

        /**
         * Get ancestor chain
         */
        function getAncestorChain(
          element: Element,
        ): Array<{tag: string; id?: string; classes?: string[]}> {
          const chain: Array<{tag: string; id?: string; classes?: string[]}> = [];
          let current: Element | null = element.parentElement;
          let depth = 0;

          while (current && depth < 10) {
            chain.push({
              tag: current.tagName.toLowerCase(),
              id: current.id || undefined,
              classes: current.className ? Array.from(current.classList) : undefined,
            });
            current = current.parentElement;
            depth++;
          }

          return chain;
        }

        /**
         * Check if element has event listeners
         */
        function hasEventListeners(element: Element): boolean {
          // Check for inline event handlers
          const events = ['onclick', 'onchange', 'onsubmit', 'onkeypress', 'onmouseenter'];
          for (const event of events) {
            if ((element as any)[event]) {
              return true;
            }
          }
          return false;
        }

        /**
         * Check if element is interactive
         */
        function isInteractive(element: Element): boolean {
          const tag = element.tagName.toLowerCase();
          const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary'];

          if (interactiveTags.includes(tag)) {
            return true;
          }

          const role = element.getAttribute('role');
          if (role && ['button', 'link', 'tab', 'checkbox', 'radio', 'switch'].includes(role)) {
            return true;
          }

          if (element.hasAttribute('onclick') || element.getAttribute('tabindex')) {
            return true;
          }

          const computed = window.getComputedStyle(element);
          if (computed.cursor === 'pointer') {
            return true;
          }

          return false;
        }

        /**
         * Check if element is visible
         */
        function isElementVisible(element: Element): boolean {
          const rect = element.getBoundingClientRect();
          const computed = window.getComputedStyle(element);

          if (rect.width === 0 || rect.height === 0) {
            return false;
          }

          if (
            computed.display === 'none' ||
            computed.visibility === 'hidden' ||
            parseFloat(computed.opacity) === 0
          ) {
            return false;
          }

          return true;
        }

        /**
         * Extract deep element information
         */
        function extractElementInfo(element: Element, depth: number): DeepDOMElement | null {
          if (depth > config.maxDepth) {
            return null;
          }

          const rect = element.getBoundingClientRect();
          const computed = window.getComputedStyle(element);
          const isVisible = isElementVisible(element);

          // Filter based on config
          if (!config.includeHidden && !isVisible) {
            return null;
          }

          if (rect.width < config.minSize.width || rect.height < config.minSize.height) {
            return null;
          }

          const isInteract = isInteractive(element);
          if (config.interactiveOnly && !isInteract) {
            return null;
          }

          const tagName = element.tagName.toLowerCase();
          const uid = getElementUid(element);

          // Extract attributes
          const attributes: Record<string, string> = {};
          for (const attr of element.attributes) {
            attributes[attr.name] = attr.value;
          }

          // Extract data attributes
          const dataAttributes: Record<string, string> = {};
          for (const attr of element.attributes) {
            if (attr.name.startsWith('data-')) {
              dataAttributes[attr.name.substring(5)] = attr.value;
            }
          }

          // Extract ARIA attributes
          const aria = {
            role: element.getAttribute('role') || undefined,
            label: element.getAttribute('aria-label') || undefined,
            labelledBy: element.getAttribute('aria-labelledby') || undefined,
            describedBy: element.getAttribute('aria-describedby') || undefined,
            hidden: element.getAttribute('aria-hidden') === 'true' || undefined,
            expanded: element.getAttribute('aria-expanded') === 'true' || undefined,
            selected: element.getAttribute('aria-selected') === 'true' || undefined,
            checked: element.getAttribute('aria-checked') === 'true' || undefined,
            disabled: element.getAttribute('aria-disabled') === 'true' || undefined,
          };

          const deepElement: DeepDOMElement = {
            uid,
            tagName,
            id: element.id || '',
            classes: Array.from(element.classList),
            attributes,
            textContent: (element.textContent || '').trim().substring(0, 200),
            innerText: (element as HTMLElement).innerText?.trim().substring(0, 200) || '',
            innerHTML: element.innerHTML.substring(0, 500),
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
            },
            computedStyle: {
              display: computed.display,
              visibility: computed.visibility,
              opacity: computed.opacity,
              position: computed.position,
              zIndex: computed.zIndex,
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              cursor: computed.cursor,
            },
            relationships: {
              parentId: element.parentElement ? getElementUid(element.parentElement) : undefined,
              parentTag: element.parentElement?.tagName.toLowerCase(),
              parentClasses: element.parentElement?.classList
                ? Array.from(element.parentElement.classList)
                : undefined,
              siblingCount: element.parentElement?.children.length || 0,
              childCount: element.children.length,
              depth,
              ancestorChain: getAncestorChain(element),
            },
            interactivity: {
              isVisible,
              isClickable: isInteract,
              isInputField: ['input', 'textarea', 'select'].includes(tagName),
              isLink: tagName === 'a',
              isButton: tagName === 'button' || element.getAttribute('role') === 'button',
              isFocusable: element.hasAttribute('tabindex') || isInteract,
              hasEventListeners: hasEventListeners(element),
              isDisabled:
                element.hasAttribute('disabled') ||
                element.getAttribute('aria-disabled') === 'true',
            },
            aria,
            dataAttributes,
            selectors: {
              css: generateCSSSelector(element),
              cssUnique: generateCSSSelector(element),
              xpath: generateXPath(element),
              xpathShort: generateXPath(element),
            },
          };

          return deepElement;
        }

        /**
         * Traverse DOM recursively
         */
        function traverseDOM(element: Element, depth: number = 0): void {
          if (elements.length >= config.maxElements) {
            return;
          }

          const elementInfo = extractElementInfo(element, depth);
          if (elementInfo) {
            elements.push(elementInfo);
          }

          // Traverse children
          for (const child of element.children) {
            traverseDOM(child, depth + 1);
          }
        }

        // Start traversal from body
        traverseDOM(document.body, 0);

        return elements;
      },
      this.config,
    );

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ DOM inspection complete: ${elements.length} elements found in ${processingTime}ms`,
    );

    // Cache elements
    this.elementCache.clear();
    elements.forEach(el => this.elementCache.set(el.uid, el));

    return elements;
  }

  /**
   * Search for elements matching criteria
   */
  async searchElements(criteria: DOMSearchCriteria): Promise<DeepDOMElement[]> {
    let elements = Array.from(this.elementCache.values());

    // If cache is empty, inspect DOM first
    if (elements.length === 0) {
      elements = await this.inspectDOM();
    }

    // Apply filters
    if (criteria.tagNames) {
      const tags = criteria.tagNames.map(t => t.toLowerCase());
      elements = elements.filter(el => tags.includes(el.tagName));
    }

    if (criteria.idPattern) {
      const pattern =
        typeof criteria.idPattern === 'string'
          ? new RegExp(criteria.idPattern, 'i')
          : criteria.idPattern;
      elements = elements.filter(el => el.id && pattern.test(el.id));
    }

    if (criteria.classPattern) {
      const pattern =
        typeof criteria.classPattern === 'string'
          ? new RegExp(criteria.classPattern, 'i')
          : criteria.classPattern;
      elements = elements.filter(el => el.classes.some(c => pattern.test(c)));
    }

    if (criteria.textPattern) {
      const pattern =
        typeof criteria.textPattern === 'string'
          ? new RegExp(criteria.textPattern, 'i')
          : criteria.textPattern;
      elements = elements.filter(
        el => pattern.test(el.textContent) || pattern.test(el.innerText),
      );
    }

    if (criteria.attributes) {
      elements = elements.filter(el => {
        return Object.entries(criteria.attributes!).every(([key, value]) => {
          const attrValue = el.attributes[key];
          if (!attrValue) return false;
          if (typeof value === 'string') {
            return attrValue === value;
          }
          return value.test(attrValue);
        });
      });
    }

    if (criteria.ariaRole) {
      elements = elements.filter(el => el.aria.role === criteria.ariaRole);
    }

    if (criteria.visible !== undefined) {
      elements = elements.filter(el => el.interactivity.isVisible === criteria.visible);
    }

    if (criteria.interactive !== undefined) {
      elements = elements.filter(el => el.interactivity.isClickable === criteria.interactive);
    }

    if (criteria.cssSelector) {
      // This would require re-querying, for now filter by matching selector
      elements = elements.filter(el => el.selectors.css.includes(criteria.cssSelector!));
    }

    return elements;
  }

  /**
   * Find element clusters/groups
   */
  async findClusters(): Promise<ElementCluster[]> {
    const elements = Array.from(this.elementCache.values());
    if (elements.length === 0) {
      await this.inspectDOM();
    }

    const clusters: ElementCluster[] = [];

    // Find forms
    const formElements = elements.filter(el => el.tagName === 'form');
    for (const form of formElements) {
      const formChildren = elements.filter(
        el => el.relationships.ancestorChain.some(a => a.tag === 'form'),
      );

      if (formChildren.length > 0) {
        clusters.push({
          type: 'form',
          elements: formChildren,
          parentElement: form,
          boundingBox: form.boundingBox,
          metadata: {
            elementCount: formChildren.length,
            clusterName: form.attributes.name || form.attributes.id || 'unnamed-form',
            semanticPurpose: 'Form submission and data input',
          },
        });
      }
    }

    // Find navigation menus
    const navElements = elements.filter(
      el => el.tagName === 'nav' || el.aria.role === 'navigation',
    );
    for (const nav of navElements) {
      const navChildren = elements.filter(el =>
        el.relationships.ancestorChain.some(a => a.tag === 'nav'),
      );

      clusters.push({
        type: 'navigation',
        elements: navChildren,
        parentElement: nav,
        boundingBox: nav.boundingBox,
        metadata: {
          elementCount: navChildren.length,
          semanticPurpose: 'Site navigation',
        },
      });
    }

    // Find lists
    const listElements = elements.filter(el => ['ul', 'ol'].includes(el.tagName));
    for (const list of listElements) {
      const listItems = elements.filter(
        el =>
          el.tagName === 'li' &&
          el.relationships.ancestorChain.some(a => ['ul', 'ol'].includes(a.tag || '')),
      );

      if (listItems.length >= 3) {
        clusters.push({
          type: 'list',
          elements: listItems,
          parentElement: list,
          boundingBox: list.boundingBox,
          metadata: {
            elementCount: listItems.length,
            semanticPurpose: 'Structured list of items',
          },
        });
      }
    }

    // Find tables
    const tableElements = elements.filter(el => el.tagName === 'table');
    for (const table of tableElements) {
      const tableChildren = elements.filter(el =>
        el.relationships.ancestorChain.some(a => a.tag === 'table'),
      );

      clusters.push({
        type: 'table',
        elements: tableChildren,
        parentElement: table,
        boundingBox: table.boundingBox,
        metadata: {
          elementCount: tableChildren.length,
          semanticPurpose: 'Tabular data display',
        },
      });
    }

    // Find card groups (common pattern)
    const cardElements = elements.filter(el => el.classes.some(c => c.includes('card')));
    if (cardElements.length >= 2) {
      // Group cards by common parent
      const cardsByParent = new Map<string, DeepDOMElement[]>();
      for (const card of cardElements) {
        const parentId = card.relationships.parentId || 'root';
        if (!cardsByParent.has(parentId)) {
          cardsByParent.set(parentId, []);
        }
        cardsByParent.get(parentId)!.push(card);
      }

      for (const [parentId, cards] of cardsByParent) {
        if (cards.length >= 2) {
          const parent = elements.find(el => el.uid === parentId);
          clusters.push({
            type: 'card-group',
            elements: cards,
            parentElement: parent,
            boundingBox: parent?.boundingBox || cards[0].boundingBox,
            metadata: {
              elementCount: cards.length,
              semanticPurpose: 'Group of card components',
            },
          });
        }
      }
    }

    // Find button groups
    const buttons = elements.filter(el => el.interactivity.isButton);
    const buttonGroups = new Map<string, DeepDOMElement[]>();
    for (const button of buttons) {
      const parentId = button.relationships.parentId || 'root';
      if (!buttonGroups.has(parentId)) {
        buttonGroups.set(parentId, []);
      }
      buttonGroups.get(parentId)!.push(button);
    }

    for (const [parentId, buttons] of buttonGroups) {
      if (buttons.length >= 2) {
        const parent = elements.find(el => el.uid === parentId);
        clusters.push({
          type: 'button-group',
          elements: buttons,
          parentElement: parent,
          boundingBox: parent?.boundingBox || buttons[0].boundingBox,
          metadata: {
            elementCount: buttons.length,
            semanticPurpose: 'Group of action buttons',
          },
        });
      }
    }

    console.log(`🔍 Found ${clusters.length} element clusters`);
    return clusters;
  }

  /**
   * Get element by UID from cache
   */
  getElementByUid(uid: string): DeepDOMElement | undefined {
    return this.elementCache.get(uid);
  }

  /**
   * Get all cached elements
   */
  getAllElements(): DeepDOMElement[] {
    return Array.from(this.elementCache.values());
  }

  /**
   * Clear element cache
   */
  clearCache(): void {
    this.elementCache.clear();
  }

  /**
   * Generate a summary report of the DOM
   */
  async generateDOMReport(): Promise<{
    totalElements: number;
    byTag: Record<string, number>;
    byInteractivity: {
      clickable: number;
      inputFields: number;
      links: number;
      buttons: number;
    };
    byVisibility: {
      visible: number;
      hidden: number;
    };
    clusters: {
      forms: number;
      navigation: number;
      lists: number;
      tables: number;
      cardGroups: number;
      buttonGroups: number;
    };
  }> {
    const elements = Array.from(this.elementCache.values());
    if (elements.length === 0) {
      await this.inspectDOM();
    }

    const byTag: Record<string, number> = {};
    for (const el of elements) {
      byTag[el.tagName] = (byTag[el.tagName] || 0) + 1;
    }

    const clusters = await this.findClusters();

    return {
      totalElements: elements.length,
      byTag,
      byInteractivity: {
        clickable: elements.filter(el => el.interactivity.isClickable).length,
        inputFields: elements.filter(el => el.interactivity.isInputField).length,
        links: elements.filter(el => el.interactivity.isLink).length,
        buttons: elements.filter(el => el.interactivity.isButton).length,
      },
      byVisibility: {
        visible: elements.filter(el => el.interactivity.isVisible).length,
        hidden: elements.filter(el => !el.interactivity.isVisible).length,
      },
      clusters: {
        forms: clusters.filter(c => c.type === 'form').length,
        navigation: clusters.filter(c => c.type === 'navigation').length,
        lists: clusters.filter(c => c.type === 'list').length,
        tables: clusters.filter(c => c.type === 'table').length,
        cardGroups: clusters.filter(c => c.type === 'card-group').length,
        buttonGroups: clusters.filter(c => c.type === 'button-group').length,
      },
    };
  }
}
