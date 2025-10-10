/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AI Element Locator Framework
 *
 * This module provides AI-powered element detection and automation capabilities
 * for Chrome DevTools MCP. It combines visual analysis with DOM inspection to
 * help locate and interact with elements using natural language descriptions.
 */

export {
  ElementLocator,
  type ElementLocatorConfig,
  type ElementSearchResult,
  type LocatedElement,
} from './ElementLocator.js';

export {
  ElementCoordinateMapper,
  type CoordinateMatch,
} from './ElementCoordinateMapper.js';

export {
  VisualElementAnalyzer,
  type ElementVisualProperties,
  type VisualAnalysisConfig,
} from './VisualElementAnalyzer.js';

export {
  ConciseOutputFormatter,
  createFormatter,
  type ConciseElement,
  type ConciseOutputConfig,
  type OutputFormat,
} from './ConciseOutputFormatter.js';
