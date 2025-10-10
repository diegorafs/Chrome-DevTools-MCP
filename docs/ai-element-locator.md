# AI-Powered Element Location Framework

## Overview

The AI-Powered Element Location Framework is a robust system that combines visual analysis with DOM inspection to help automate web interactions using natural language descriptions. Instead of writing complex CSS selectors or XPath expressions, you can find and interact with elements by describing them naturally.

## Key Features

- **Natural Language Element Finding**: Locate elements using descriptions like "submit button", "email input field", or "navigation menu"
- **Visual Analysis**: Captures screenshots and analyzes visual properties like colors, fonts, and positioning
- **Smart Element Detection**: Automatically identifies interactive elements and their accessibility properties
- **Coordinate Mapping**: Maps screen coordinates to DOM elements for precise targeting
- **Element Relationships**: Understands spatial relationships between elements (above, below, left, right)
- **Annotated Screenshots**: Generates highlighted screenshots showing detected elements
- **Confidence Scoring**: Ranks found elements by match confidence

## Architecture

The framework consists of four main components:

### 1. ElementLocator (`ElementLocator.ts`)
The core class that combines screenshot capture with DOM analysis.

**Key Methods:**
- `findElementsByDescription(description: string)`: Find elements by natural language description
- `getElementHandle(uid: string)`: Get Puppeteer element handle for interaction

**Configuration:**
```typescript
{
  includeElementScreenshots: boolean,  // Capture individual element screenshots
  annotateScreenshot: boolean,          // Generate annotated full-page screenshot
  maxResults: number,                   // Maximum results to return
  minConfidence: number,                // Minimum confidence threshold (0-1)
  fullPage: boolean                     // Capture full page vs viewport only
}
```

### 2. VisualElementAnalyzer (`VisualElementAnalyzer.ts`)
Analyzes visual properties of page elements.

**Key Methods:**
- `analyzeElements(elements)`: Extract visual properties (colors, fonts, etc.)
- `detectElementGroups(elements)`: Find visually related element groups
- `highlightElements(elements)`: Temporarily highlight elements on page
- `captureElementScreenshots(elements)`: Bulk capture element screenshots

**Visual Properties:**
- Background color, text color, font size/family
- Border width/color/style, opacity, z-index
- Element category (button, input, text, image, link, container)
- Interactive state detection

### 3. ElementCoordinateMapper (`ElementCoordinateMapper.ts`)
Maps screen coordinates to DOM elements.

**Key Methods:**
- `getElementAtPoint(x, y)`: Find element at specific coordinates
- `getElementsInRegion(x, y, width, height)`: Find all elements in area
- `getNearestElement(x, y)`: Find closest element to a point
- `getElementRelationships(element)`: Get spatial relationships
- `getElementsAlongPath(path)`: Find elements along a coordinate path

### 4. MCP Tools (`tools/ai-automation.ts`)
User-facing MCP tools for automation.

## Usage Examples

### Finding Elements by Description

```typescript
import { ElementLocator } from './ai-element-locator';

const locator = new ElementLocator(page, {
  minConfidence: 0.5,
  maxResults: 5,
  annotateScreenshot: true
});

const result = await locator.findElementsByDescription('blue submit button');

console.log(`Found ${result.elements.length} elements`);
result.elements.forEach(element => {
  console.log(`- ${element.accessibility.role}: ${element.visual.visibleText}`);
  console.log(`  Confidence: ${element.visual.confidence * 100}%`);
  console.log(`  Selector: ${element.selector}`);
});
```

### Visual Element Analysis

```typescript
import { VisualElementAnalyzer } from './ai-element-locator';

const analyzer = new VisualElementAnalyzer(page, {
  includeColors: true,
  detectGroups: true
});

// Analyze visual properties
const visualProps = await analyzer.analyzeElements(elements);
visualProps.forEach((props, uid) => {
  console.log(`Element ${uid}:`);
  console.log(`  Category: ${props.category}`);
  console.log(`  Background: ${props.backgroundColor}`);
  console.log(`  Interactive: ${props.isInteractive}`);
});

// Detect element groups
const groups = await analyzer.detectElementGroups(elements);
console.log(`Found ${groups.length} element groups`);

// Highlight elements for debugging
await analyzer.highlightElements(elements, 2000); // Highlight for 2 seconds
```

### Coordinate-Based Element Finding

```typescript
import { ElementCoordinateMapper } from './ai-element-locator';

const mapper = new ElementCoordinateMapper(page);
mapper.updateCache(elements);

// Find element at coordinates
const match = await mapper.getElementAtPoint(500, 300);
if (match) {
  console.log(`Found: ${match.element.accessibility.role}`);
  console.log(`Distance: ${match.distance}px`);
  console.log(`Inside: ${match.isInside}`);
}

// Find elements in region
const inRegion = await mapper.getElementsInRegion(0, 0, 800, 600);
console.log(`Found ${inRegion.length} elements in region`);

// Get spatial relationships
const relationships = await mapper.getElementRelationships(element);
console.log(`Above: ${relationships.above.length}`);
console.log(`Below: ${relationships.below.length}`);
console.log(`Left: ${relationships.left.length}`);
console.log(`Right: ${relationships.right.length}`);
```

### Element Interaction

```typescript
// Find and click in one step
const result = await locator.findElementsByDescription('login button');
const loginButton = result.elements[0];

const handle = await locator.getElementHandle(loginButton.uid);
if (handle) {
  await handle.click();
  await handle.dispose();
}
```

## MCP Tools

The framework exposes four MCP tools:

### 1. `find_element_by_description`
Find elements using natural language.

**Parameters:**
- `description` (string): Natural language description
- `maxResults` (number, optional): Maximum results (default: 5)
- `minConfidence` (number, optional): Minimum confidence 0-1 (default: 0.3)
- `annotateScreenshot` (boolean, optional): Include annotated screenshot (default: true)
- `includeElementScreenshots` (boolean, optional): Include individual screenshots (default: false)

**Example:**
```json
{
  "description": "blue submit button",
  "maxResults": 3,
  "minConfidence": 0.5,
  "annotateScreenshot": true
}
```

### 2. `analyze_screenshot_with_ai`
Comprehensive visual analysis of the page.

**Parameters:**
- `fullPage` (boolean, optional): Capture full page (default: false)
- `includeVisualProperties` (boolean, optional): Include detailed visual analysis (default: true)
- `detectGroups` (boolean, optional): Detect element groups (default: false)
- `highlightElements` (boolean, optional): Highlight elements on page (default: false)

### 3. `interact_with_element`
Interact with a previously found element.

**Parameters:**
- `uid` (string): Element UID from find_element_by_description
- `action` (enum): Action to perform - 'click', 'type', 'hover', 'focus', 'scroll_into_view'
- `text` (string, optional): Text to type (required for 'type' action)
- `timeout` (number, optional): Action timeout in milliseconds

**Example:**
```json
{
  "uid": "element-42",
  "action": "type",
  "text": "user@example.com"
}
```

### 4. `find_and_click`
Convenience tool that finds and clicks in one step.

**Parameters:**
- `description` (string): Natural language description
- `timeout` (number, optional): Click timeout in milliseconds

**Example:**
```json
{
  "description": "submit form button"
}
```

## Data Structures

### LocatedElement
```typescript
interface LocatedElement {
  uid: string;                          // Unique identifier
  boundingBox: {                        // Screen coordinates
    x: number;
    y: number;
    width: number;
    height: number;
  };
  selector: string;                     // CSS selector
  xpath: string;                        // XPath selector
  accessibility: {                      // A11y properties
    role: string;
    name: string;
  };
  visual: {
    visibleText: string;                // Text content
    isVisible: boolean;                 // Visibility state
    confidence: number;                 // Match confidence 0-1
    regionScreenshot?: string;          // Element screenshot (base64)
  };
  attributes: Record<string, string>;   // DOM attributes
  parentContext?: string;               // Parent element info
}
```

### ElementSearchResult
```typescript
interface ElementSearchResult {
  elements: LocatedElement[];           // Matched elements
  annotatedScreenshot?: string;         // Highlighted screenshot
  metadata: {
    query: string;                      // Search query
    totalMatches: number;               // Total matches found
    processingTime: number;             // Processing time (ms)
    snapshotId: string;                 // Snapshot identifier
  };
}
```

## Best Practices

### 1. Use Descriptive Queries
Be specific about what you're looking for:
- ✅ "blue submit button in the header"
- ✅ "email input field with placeholder"
- ❌ "button" (too generic)

### 2. Adjust Confidence Thresholds
- High confidence (0.7-1.0): Precise matches only
- Medium confidence (0.3-0.7): Balance precision and recall
- Low confidence (0.0-0.3): Maximum recall, may include false positives

### 3. Use Visual Analysis for Debugging
When elements aren't found, use `analyze_screenshot_with_ai` with `highlightElements: true` to see what the framework detects.

### 4. Cache Element Results
The `ElementCoordinateMapper` supports caching to avoid repeated DOM queries:
```typescript
const mapper = new ElementCoordinateMapper(page);
mapper.updateCache(elements);  // Cache elements
// ... perform multiple queries ...
mapper.clearCache();           // Clear when page changes
```

### 5. Handle Dynamic Content
Elements may move or change. Always:
- Verify element existence before interaction
- Handle `null` returns from `getElementHandle`
- Use appropriate timeout values

## Advanced Features

### Custom Element Matching
Extend the framework by implementing custom matching logic:

```typescript
class CustomLocator extends ElementLocator {
  protected async matchElementsByDescription(
    elements: LocatedElement[],
    description: string
  ): Promise<LocatedElement[]> {
    // Your custom matching logic here
    // Could integrate with AI APIs, ML models, etc.
    return super.matchElementsByDescription(elements, description);
  }
}
```

### AI Integration Points
The framework is designed to integrate with AI services:

1. **Vision APIs**: Send screenshots to vision APIs for element detection
2. **LLMs**: Use language models to understand complex descriptions
3. **ML Models**: Train custom models for domain-specific element recognition

### Performance Optimization

1. **Limit Screenshot Size**: Use `fullPage: false` for faster processing
2. **Reduce maxResults**: Only return what you need
3. **Disable Annotations**: Set `annotateScreenshot: false` when not needed
4. **Cache Strategically**: Use coordinate mapper caching for repeated queries

## Troubleshooting

### No Elements Found
1. Check if elements are visible (`display: none` elements are skipped)
2. Lower `minConfidence` threshold
3. Use more specific descriptions
4. Verify page has loaded completely

### Low Confidence Scores
1. Use more distinctive descriptions
2. Include visual attributes (colors, text)
3. Specify element context (location on page)

### Element Handle Errors
1. Ensure element still exists in DOM
2. Check if page has navigated
3. Verify selector validity
4. Use XPath as fallback

## Testing

Run the test suite:
```bash
npm test tests/ai-element-locator.test.ts
```

Tests cover:
- Element finding by description
- Visual property analysis
- Coordinate mapping
- Element relationships
- Integration workflows

## Future Enhancements

Planned improvements:
- Integration with GPT-4 Vision API
- Machine learning model training
- OCR for text-based element finding
- Video recording of element interactions
- Multi-page element tracking
- A/B testing support

## License

Copyright 2025 Google LLC  
SPDX-License-Identifier: Apache-2.0
