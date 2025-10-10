/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {LocatedElement} from './ElementLocator.js';
import type {ElementSearchResult} from './ElementLocator.js';

/**
 * Output format optimized for AI models
 */
export type OutputFormat = 'detailed' | 'concise' | 'minimal';

/**
 * Configuration for concise output formatting
 */
export interface ConciseOutputConfig {
  /** Output format level */
  format: OutputFormat;
  /** Maximum text length to include */
  maxTextLength: number;
  /** Whether to include selectors */
  includeSelectors: boolean;
  /** Whether to include coordinates */
  includeCoordinates: boolean;
  /** Whether to include confidence scores */
  includeConfidence: boolean;
  /** Maximum number of elements to show */
  maxElements: number;
}

/**
 * Concise element representation for AI models
 */
export interface ConciseElement {
  /** Element ID for interaction */
  uid: string;
  /** Element type (button, input, etc.) */
  type: string;
  /** Brief text content */
  text: string;
  /** CSS selector (if requested) */
  selector?: string;
  /** Confidence score 0-100 (if requested) */
  confidence?: number;
  /** Position (if requested) */
  position?: string;
}

/**
 * Formats element information optimally for AI models
 */
export class ConciseOutputFormatter {
  private config: ConciseOutputConfig;

  constructor(format: OutputFormat = 'concise') {
    this.config = this.getFormatConfig(format);
  }

  /**
   * Get configuration for output format
   */
  private getFormatConfig(format: OutputFormat): ConciseOutputConfig {
    switch (format) {
      case 'minimal':
        return {
          format: 'minimal',
          maxTextLength: 20,
          includeSelectors: false,
          includeCoordinates: false,
          includeConfidence: false,
          maxElements: 5,
        };
      case 'concise':
        return {
          format: 'concise',
          maxTextLength: 40,
          includeSelectors: true,
          includeCoordinates: false,
          includeConfidence: true,
          maxElements: 10,
        };
      case 'detailed':
        return {
          format: 'detailed',
          maxTextLength: 100,
          includeSelectors: true,
          includeCoordinates: true,
          includeConfidence: true,
          maxElements: 20,
        };
    }
  }

  /**
   * Format search result for AI consumption
   */
  formatSearchResult(result: ElementSearchResult): string {
    const {elements, metadata} = result;
    
    if (elements.length === 0) {
      return '❌ No elements found';
    }

    const limited = elements.slice(0, this.config.maxElements);
    const conciseElements = limited.map((el, idx) => 
      this.formatElement(el, idx + 1)
    );

    let output = '';

    // Format based on verbosity level
    switch (this.config.format) {
      case 'minimal':
        output = this.formatMinimal(conciseElements, metadata);
        break;
      case 'concise':
        output = this.formatConcise(conciseElements, metadata);
        break;
      case 'detailed':
        output = this.formatDetailed(conciseElements, metadata, elements.length);
        break;
    }

    return output;
  }

  /**
   * Format single element
   */
  private formatElement(element: LocatedElement, index: number): ConciseElement {
    const truncate = (text: string, max: number) => 
      text.length > max ? text.slice(0, max) + '…' : text;

    const concise: ConciseElement = {
      uid: element.uid,
      type: element.accessibility.role || 'element',
      text: truncate(
        element.visual.visibleText || element.accessibility.name || '',
        this.config.maxTextLength
      ),
    };

    if (this.config.includeSelectors) {
      // Simplify selector for readability
      concise.selector = this.simplifySelector(element.selector);
    }

    if (this.config.includeConfidence) {
      concise.confidence = Math.round(element.visual.confidence * 100);
    }

    if (this.config.includeCoordinates) {
      const {x, y} = element.boundingBox;
      concise.position = `(${Math.round(x)},${Math.round(y)})`;
    }

    return concise;
  }

  /**
   * Simplify CSS selector for readability
   */
  private simplifySelector(selector: string): string {
    // If selector has ID, use that
    if (selector.includes('#')) {
      const idMatch = selector.match(/#[\w-]+/);
      if (idMatch) return idMatch[0];
    }

    // Shorten long selectors
    const parts = selector.split('>').map(p => p.trim());
    if (parts.length > 3) {
      return `${parts[0]} > ... > ${parts[parts.length - 1]}`;
    }

    // Remove long class lists
    return selector.replace(/\.([\w-]+\.[\w-]+\.[\w-]+)/, '.$1...');
  }

  /**
   * Format minimal output (most concise)
   */
  private formatMinimal(elements: ConciseElement[], metadata: any): string {
    const lines = ['✓ Found elements:'];
    
    elements.forEach((el, idx) => {
      lines.push(`${idx + 1}. [${el.uid}] ${el.type}: "${el.text}"`);
    });

    if (metadata.totalMatches > elements.length) {
      lines.push(`+ ${metadata.totalMatches - elements.length} more`);
    }

    return lines.join('\n');
  }

  /**
   * Format concise output (balanced)
   */
  private formatConcise(elements: ConciseElement[], metadata: any): string {
    const lines = [
      `✓ Found ${metadata.totalMatches} element${metadata.totalMatches !== 1 ? 's' : ''}`,
      ''
    ];

    elements.forEach((el, idx) => {
      const parts = [
        `${idx + 1}.`,
        `${el.type}:`,
        `"${el.text}"`
      ];

      if (el.confidence !== undefined) {
        parts.push(`(${el.confidence}%)`);
      }

      lines.push(parts.join(' '));
      lines.push(`   ID: ${el.uid}`);
      
      if (el.selector) {
        lines.push(`   Selector: ${el.selector}`);
      }
      
      lines.push('');
    });

    if (metadata.totalMatches > elements.length) {
      lines.push(`... and ${metadata.totalMatches - elements.length} more elements`);
    }

    lines.push(`\n💡 To interact: use uid value (e.g., "${elements[0]?.uid}")`);

    return lines.join('\n');
  }

  /**
   * Format detailed output (most verbose)
   */
  private formatDetailed(
    elements: ConciseElement[], 
    metadata: any,
    total: number
  ): string {
    const lines = [
      `✓ Found ${metadata.totalMatches} matching elements (${metadata.processingTime}ms)`,
      `  Query: "${metadata.query}"`,
      ''
    ];

    elements.forEach((el, idx) => {
      lines.push(`${idx + 1}. ${el.type.toUpperCase()}`);
      lines.push(`   ID: ${el.uid}`);
      lines.push(`   Text: "${el.text}"`);
      
      if (el.selector) {
        lines.push(`   Selector: ${el.selector}`);
      }
      
      if (el.confidence !== undefined) {
        lines.push(`   Match: ${el.confidence}%`);
      }
      
      if (el.position) {
        lines.push(`   Position: ${el.position}`);
      }
      
      lines.push('');
    });

    if (total > elements.length) {
      lines.push(`... ${total - elements.length} more elements not shown`);
      lines.push('');
    }

    lines.push('💡 Usage:');
    lines.push('   1. Note the ID of the element you want');
    lines.push('   2. Use interact_with_element tool with that ID');
    lines.push(`   3. Example: {"uid": "${elements[0]?.uid}", "action": "click"}`);

    return lines.join('\n');
  }

  /**
   * Format element list as JSON for structured parsing
   */
  formatAsJSON(result: ElementSearchResult): string {
    const limited = result.elements.slice(0, this.config.maxElements);
    
    const data = {
      found: result.metadata.totalMatches,
      query: result.metadata.query,
      time_ms: result.metadata.processingTime,
      elements: limited.map(el => this.formatElement(el, 0)),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Format as compact single-line for each element
   */
  formatAsCompactLines(result: ElementSearchResult): string[] {
    const limited = result.elements.slice(0, this.config.maxElements);
    
    return limited.map((el, idx) => {
      const ce = this.formatElement(el, idx + 1);
      const parts = [`[${idx + 1}]`, ce.type, `"${ce.text}"`, `id=${ce.uid}`];
      
      if (ce.confidence) {
        parts.push(`conf=${ce.confidence}%`);
      }
      
      return parts.join(' ');
    });
  }

  /**
   * Format as markdown table
   */
  formatAsTable(result: ElementSearchResult): string {
    const limited = result.elements.slice(0, this.config.maxElements);
    const lines = [
      '| # | Type | Text | ID | Match |',
      '|---|------|------|-------|-------|'
    ];

    limited.forEach((el, idx) => {
      const ce = this.formatElement(el, idx + 1);
      const text = ce.text.length > 25 ? ce.text.slice(0, 25) + '…' : ce.text;
      const conf = ce.confidence ? `${ce.confidence}%` : '-';
      lines.push(`| ${idx + 1} | ${ce.type} | ${text} | \`${ce.uid}\` | ${conf} |`);
    });

    return lines.join('\n');
  }

  /**
   * Create action-oriented summary
   */
  formatActionSummary(result: ElementSearchResult): string {
    if (result.elements.length === 0) {
      return '❌ NO ELEMENTS FOUND - Try different description or lower minConfidence';
    }

    const best = result.elements[0];
    if (!best) return '';

    const lines = [
      `✓ BEST MATCH:`,
      `  Type: ${best.accessibility.role}`,
      `  Text: "${best.visual.visibleText.slice(0, 50)}"`,
      `  ID: ${best.uid}`,
      `  Confidence: ${Math.round(best.visual.confidence * 100)}%`,
      '',
      `🎯 TO CLICK THIS ELEMENT:`,
      `   {"uid": "${best.uid}", "action": "click"}`,
      '',
      `📝 TO TYPE IN THIS ELEMENT:`,
      `   {"uid": "${best.uid}", "action": "type", "text": "your text"}`,
    ];

    if (result.elements.length > 1) {
      lines.push('');
      lines.push(`ℹ️  ${result.elements.length - 1} more similar elements available`);
    }

    return lines.join('\n');
  }

  /**
   * Update output format
   */
  setFormat(format: OutputFormat): void {
    this.config = this.getFormatConfig(format);
  }

  /**
   * Update specific config options
   */
  updateConfig(config: Partial<ConciseOutputConfig>): void {
    this.config = {...this.config, ...config};
  }
}

/**
 * Helper to create formatter from config
 */
export function createFormatter(
  format?: OutputFormat | string
): ConciseOutputFormatter {
  const formatStr = format || 'concise';
  const validFormat = ['minimal', 'concise', 'detailed'].includes(formatStr)
    ? (formatStr as OutputFormat)
    : 'concise';
  
  return new ConciseOutputFormatter(validFormat);
}
