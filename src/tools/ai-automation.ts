/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import z from 'zod';

import {ElementLocator} from '../ai-element-locator/ElementLocator.js';
import {
  ConciseOutputFormatter,
  type OutputFormat,
} from '../ai-element-locator/ConciseOutputFormatter.js';
import {VisualElementAnalyzer} from '../ai-element-locator/VisualElementAnalyzer.js';
import {ToolCategories} from './categories.js';
import {defineTool, timeoutSchema} from './ToolDefinition.js';

/**
 * Tool to find elements using AI-powered natural language description
 */
export const findElementByDescription = defineTool({
  name: 'find_element_by_description',
  description: `Find elements on the page using natural language description. This tool uses visual analysis
and DOM inspection to locate elements based on how they appear and what they do, rather than technical selectors.
Use this when you want to find elements by their visual appearance, text content, or purpose.
OPTIMIZED FOR FREE AI MODELS: Returns concise, structured output that's easy to parse.`,
  annotations: {
    category: ToolCategories.NAVIGATION_AUTOMATION,
    readOnlyHint: true,
  },
  schema: {
    description: z
      .string()
      .describe(
        'Natural language description of the element to find. Examples: "blue submit button", "email input field", "navigation menu", "profile picture"',
      ),
    maxResults: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .describe('Maximum number of matching elements to return'),
    minConfidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.3)
      .describe(
        'Minimum confidence score (0-1) for matches. Lower values return more results but may be less accurate',
      ),
    outputFormat: z
      .enum(['minimal', 'concise', 'detailed'])
      .optional()
      .default('concise')
      .describe(
        'Output verbosity: "minimal" (least tokens), "concise" (balanced), "detailed" (most info). Use "minimal" for free AI models.',
      ),
    annotateScreenshot: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Whether to return an annotated screenshot showing the found elements. Disable for faster responses.',
      ),
    includeElementScreenshots: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to include individual screenshots of each found element'),
  },
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();

    const locator = new ElementLocator(page, {
      maxResults: request.params.maxResults,
      minConfidence: request.params.minConfidence,
      annotateScreenshot: request.params.annotateScreenshot,
      includeElementScreenshots: request.params.includeElementScreenshots,
    });

    const result = await locator.findElementsByDescription(
      request.params.description,
    );

    // Use concise formatter for output
    const formatter = new ConciseOutputFormatter(
      request.params.outputFormat as OutputFormat,
    );

    // Output formatted results
    const formattedOutput = formatter.formatSearchResult(result);
    response.appendResponseLine(formattedOutput);

    // Attach element screenshots if requested
    if (request.params.includeElementScreenshots) {
      result.elements.forEach(element => {
        if (element.visual.regionScreenshot) {
          response.attachImage({
            mimeType: 'image/png',
            data: element.visual.regionScreenshot,
          });
        }
      });
    }

    // Attach annotated screenshot if requested
    if (result.annotatedScreenshot && request.params.annotateScreenshot) {
      response.appendResponseLine('');
      response.appendResponseLine('📸 Annotated screenshot:');
      response.attachImage({
        mimeType: 'image/png',
        data: result.annotatedScreenshot,
      });
    }
  },
});

/**
 * Tool to analyze screenshot with AI-powered visual element detection
 */
export const analyzeScreenshotWithAI = defineTool({
  name: 'analyze_screenshot_with_ai',
  description: `Capture and analyze a screenshot of the page, extracting all interactive and visible elements
with their visual properties, coordinates, and accessibility information. This provides a comprehensive
view of what's visible on the page and how elements can be identified.`,
  annotations: {
    category: ToolCategories.DEBUGGING,
    readOnlyHint: true,
  },
  schema: {
    fullPage: z
      .boolean()
      .optional()
      .default(false)
      .describe('Capture full page screenshot instead of just viewport'),
    includeVisualProperties: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include detailed visual properties (colors, fonts, etc.)'),
    detectGroups: z
      .boolean()
      .optional()
      .default(false)
      .describe('Detect and group visually related elements'),
    highlightElements: z
      .boolean()
      .optional()
      .default(false)
      .describe('Highlight detected elements on the page for visual debugging'),
  },
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();

    response.appendResponseLine('🔍 Analyzing page screenshot...');

    const locator = new ElementLocator(page, {
      fullPage: request.params.fullPage,
      annotateScreenshot: true,
      includeElementScreenshots: false,
    });

    // Get all elements
    const result = await locator.findElementsByDescription(''); // Empty query returns all elements

    if (result.elements.length === 0) {
      response.appendResponseLine('No interactive elements detected on the page.');
      return;
    }

    response.appendResponseLine(
      `✅ Detected ${result.elements.length} interactive elements`,
    );
    response.appendResponseLine('');

    // Analyze visual properties if requested
    if (request.params.includeVisualProperties) {
      const analyzer = new VisualElementAnalyzer(page, {
        includeColors: true,
        detectGroups: request.params.detectGroups,
      });

      const visualProps = await analyzer.analyzeElements(result.elements);

      response.appendResponseLine('📊 Element Categories:');
      const categories = new Map<string, number>();
      result.elements.forEach(el => {
        const props = visualProps.get(el.uid);
        if (props) {
          categories.set(props.category, (categories.get(props.category) || 0) + 1);
        }
      });

      categories.forEach((count, category) => {
        response.appendResponseLine(`   ${category}: ${count}`);
      });
      response.appendResponseLine('');

      // Detect groups if requested
      if (request.params.detectGroups) {
        const groups = await analyzer.detectElementGroups(result.elements);
        if (groups.length > 0) {
          response.appendResponseLine(
            `🔗 Detected ${groups.length} element groups:`,
          );
          groups.forEach((group, index) => {
            response.appendResponseLine(
              `   Group ${index + 1}: ${group.length} elements`,
            );
          });
          response.appendResponseLine('');
        }
      }

      // Highlight elements if requested
      if (request.params.highlightElements) {
        await analyzer.highlightElements(result.elements, 3000);
        response.appendResponseLine('✨ Elements highlighted on page for 3 seconds');
        response.appendResponseLine('');
      }
    }

    // List first 10 elements
    response.appendResponseLine('📝 Element Details (first 10):');
    result.elements.slice(0, 10).forEach((element, index) => {
      response.appendResponseLine(`${index + 1}. ${element.accessibility.role}`);
      response.appendResponseLine(`   uid: ${element.uid}`);
      response.appendResponseLine(
        `   Text: ${element.visual.visibleText.slice(0, 50)}${element.visual.visibleText.length > 50 ? '...' : ''}`,
      );
      response.appendResponseLine(`   Selector: ${element.selector}`);
    });

    if (result.elements.length > 10) {
      response.appendResponseLine(
        `... and ${result.elements.length - 10} more elements`,
      );
    }

    response.appendResponseLine('');

    // Attach annotated screenshot
    if (result.annotatedScreenshot) {
      response.appendResponseLine('📸 Annotated screenshot:');
      response.attachImage({
        mimeType: 'image/png',
        data: result.annotatedScreenshot,
      });
    }
  },
});

/**
 * Tool to interact with an element found by AI
 */
export const interactWithElement = defineTool({
  name: 'interact_with_element',
  description: `Interact with an element previously found using find_element_by_description or
analyze_screenshot_with_ai. Supports clicking, typing, and other actions.`,
  annotations: {
    category: ToolCategories.NAVIGATION_AUTOMATION,
    readOnlyHint: false,
  },
  schema: {
    uid: z
      .string()
      .describe('The uid of the element from find_element_by_description'),
    action: z
      .enum(['click', 'type', 'hover', 'focus', 'scroll_into_view'])
      .describe('The action to perform on the element'),
    text: z
      .string()
      .optional()
      .describe('Text to type (required for "type" action)'),
    ...timeoutSchema,
  },
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();

    const locator = new ElementLocator(page);
    const elementHandle = await locator.getElementHandle(request.params.uid);

    if (!elementHandle) {
      throw new Error(
        `Element with uid "${request.params.uid}" not found. The element may have been removed or the page may have changed.`,
      );
    }

    try {
      await context.waitForEventsAfterAction(async () => {
        switch (request.params.action) {
          case 'click':
            await elementHandle.click({timeout: request.params.timeout});
            response.appendResponseLine(
              `✅ Clicked element ${request.params.uid}`,
            );
            break;

          case 'type':
            if (!request.params.text) {
              throw new Error('Text parameter required for "type" action');
            }
            await elementHandle.type(request.params.text, {
              delay: 50,
            });
            response.appendResponseLine(
              `✅ Typed "${request.params.text}" into element ${request.params.uid}`,
            );
            break;

          case 'hover':
            await elementHandle.hover();
            response.appendResponseLine(
              `✅ Hovered over element ${request.params.uid}`,
            );
            break;

          case 'focus':
            await elementHandle.focus();
            response.appendResponseLine(
              `✅ Focused element ${request.params.uid}`,
            );
            break;

          case 'scroll_into_view':
            await elementHandle.scrollIntoView();
            response.appendResponseLine(
              `✅ Scrolled element ${request.params.uid} into view`,
            );
            break;
        }
      });

      // Include snapshot after action
      response.setIncludeSnapshot(true);
    } finally {
      await elementHandle.dispose();
    }
  },
});

/**
 * Tool to find and interact with element in one step
 */
export const findAndClick = defineTool({
  name: 'find_and_click',
  description: `Find an element by natural language description and click it in one step.
This is a convenience tool that combines find_element_by_description and interact_with_element.
OPTIMIZED: Minimal output, fast execution for free AI models.`,
  annotations: {
    category: ToolCategories.NAVIGATION_AUTOMATION,
    readOnlyHint: false,
  },
  schema: {
    description: z
      .string()
      .describe(
        'Natural language description of the element to find and click. Examples: "submit button", "login link", "search icon"',
      ),
    verbose: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to output detailed information. Set false for minimal output.'),
    ...timeoutSchema,
  },
  handler: async (request, response, context) => {
    const page = context.getSelectedPage();

    if (request.params.verbose) {
      response.appendResponseLine(
        `🔍 Finding: "${request.params.description}"`,
      );
    }

    const locator = new ElementLocator(page, {
      maxResults: 1,
      minConfidence: 0.5,
      annotateScreenshot: false,
    });

    const result = await locator.findElementsByDescription(
      request.params.description,
    );

    if (result.elements.length === 0) {
      throw new Error(
        `❌ Not found: "${request.params.description}". Try different description.`,
      );
    }

    const element = result.elements[0];
    if (!element) {
      throw new Error('No element found');
    }

    if (request.params.verbose) {
      response.appendResponseLine(
        `✅ Found: ${element.accessibility.role} "${element.visual.visibleText.slice(0, 30)}" (${Math.round(element.visual.confidence * 100)}%)`,
      );
    }

    const elementHandle = await locator.getElementHandle(element.uid);

    if (!elementHandle) {
      throw new Error('Failed to get element handle');
    }

    try {
      await context.waitForEventsAfterAction(async () => {
        await elementHandle.click({timeout: request.params.timeout});
        
        if (request.params.verbose) {
          response.appendResponseLine('✅ Clicked successfully');
        } else {
          response.appendResponseLine(`✓ Clicked: "${request.params.description}"`);
        }
      });

      response.setIncludeSnapshot(true);
    } finally {
      await elementHandle.dispose();
    }
  },
});
