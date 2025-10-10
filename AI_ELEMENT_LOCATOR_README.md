# AI-Powered Element Locator Framework

A robust framework for Chrome DevTools MCP that uses AI-powered visual analysis to find and interact with DOM elements using natural language descriptions.

**⚡ OPTIMIZED FOR FREE AI MODELS**: Includes concise output modes that reduce token usage by 75-85%, perfect for GitHub Copilot Free, Claude Free Tier, and other token-limited models.

## 🎯 What This Framework Does

Instead of writing complex CSS selectors or XPath expressions, you can now:

```typescript
// Old way
await page.click('#app > div.container > button.submit-btn[type="submit"]');

// New way
const result = await locator.findElementsByDescription('blue submit button');
const handle = await locator.getElementHandle(result.elements[0].uid);
await handle.click();
```

## ✨ Key Features

- **Natural Language Queries**: Find elements by describing them - "email input field", "submit button", "profile picture"
- **Visual Analysis**: Analyzes colors, fonts, positioning, and visual properties
- **Smart Detection**: Automatically identifies interactive elements
- **Screenshot Annotation**: Generates highlighted screenshots showing detected elements
- **Coordinate Mapping**: Maps screen coordinates to DOM elements
- **Spatial Relationships**: Understands element positioning (above, below, left, right)
- **Confidence Scoring**: Ranks results by match quality
- **MCP Integration**: Ready-to-use MCP tools for automation
- **🎯 Free Model Optimization**: Three output formats (minimal/concise/detailed) to minimize token usage
- **⚡ Fast & Efficient**: Optimized for laptops without premium AI subscriptions

## 📦 Components

### Core Classes

1. **ElementLocator** - Main class for finding elements
2. **VisualElementAnalyzer** - Analyzes visual properties
3. **ElementCoordinateMapper** - Maps coordinates to elements

### MCP Tools

1. `find_element_by_description` - Find elements by description
2. `analyze_screenshot_with_ai` - Visual page analysis
3. `interact_with_element` - Interact with found elements
4. `find_and_click` - Find and click in one step

## 🚀 Quick Start

### For Free AI Models (Recommended)

```json
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "login button",
    "outputFormat": "minimal",
    "annotateScreenshot": false,
    "maxResults": 3
  }
}
```

**Response** (uses ~80 tokens vs 450):
```
✓ Found elements:
1. [element-42] button: "Sign In"
2. [element-43] button: "Log In"
3. [element-44] button: "Continue"
```

Then interact:
```json
{
  "tool": "interact_with_element",
  "arguments": {
    "uid": "element-42",
    "action": "click"
  }
}
```

**Total tokens**: ~100 (vs 600+ with detailed output)

### Basic Element Finding

```typescript
import { ElementLocator } from './ai-element-locator';

const locator = new ElementLocator(page, {
  minConfidence: 0.5,
  annotateScreenshot: true
});

const result = await locator.findElementsByDescription('login button');
console.log(`Found ${result.elements.length} elements`);

// Get first match
const element = result.elements[0];
console.log(`Role: ${element.accessibility.role}`);
console.log(`Selector: ${element.selector}`);
console.log(`Confidence: ${element.visual.confidence}`);
```

### Visual Analysis

```typescript
import { VisualElementAnalyzer } from './ai-element-locator';

const analyzer = new VisualElementAnalyzer(page);
const visualProps = await analyzer.analyzeElements(elements);

visualProps.forEach((props, uid) => {
  console.log(`${uid}: ${props.category} - ${props.backgroundColor}`);
});
```

### Coordinate-Based Finding

```typescript
import { ElementCoordinateMapper } from './ai-element-locator';

const mapper = new ElementCoordinateMapper(page);
const match = await mapper.getElementAtPoint(500, 300);

if (match) {
  console.log(`Found at (500, 300): ${match.element.accessibility.role}`);
}
```

## 🎨 Use Cases

### Web Automation
```typescript
// Login automation
const emailField = await locator.findElementsByDescription('email input');
const passwordField = await locator.findElementsByDescription('password input');
const loginButton = await locator.findElementsByDescription('login button');
```

### Visual Testing
```typescript
// Check button color consistency
const analyzer = new VisualElementAnalyzer(page);
const props = await analyzer.analyzeElements(buttons);
const colors = new Set(Array.from(props.values()).map(p => p.backgroundColor));
```

### Accessibility Auditing
```typescript
// Find elements without labels
elements.filter(el => 
  el.accessibility.role === 'button' && 
  !el.accessibility.name
);
```

### Spatial Navigation
```typescript
// Find elements to the right of menu
const mapper = new ElementCoordinateMapper(page);
const relationships = await mapper.getElementRelationships(menuElement);
console.log(`Items to the right: ${relationships.right.length}`);
```

## 📚 Documentation

- **[🆓 Free Model Guide](./docs/ai-element-locator-free-models.md)** - ⭐ **START HERE** for Copilot/Claude free tier
- **[Full Documentation](./docs/ai-element-locator.md)** - Complete API reference
- **[Examples](./docs/ai-element-locator-examples.md)** - Practical usage examples
- **[Architecture](./docs/ai-element-locator-architecture.md)** - Technical details
- **[Tests](./tests/ai-element-locator.test.ts)** - Test suite

## 🔧 MCP Tools Usage

### Using with Free AI Models (Optimized)

```json
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "submit form button",
    "outputFormat": "minimal",
    "annotateScreenshot": false,
    "maxResults": 3
  }
}
```

**Saves 75-85% tokens!** See [Free Model Guide](./docs/ai-element-locator-free-models.md) for details.

### Using with Premium Models (Full Features)

```json
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "submit form button",
    "outputFormat": "detailed",
    "maxResults": 5,
    "minConfidence": 0.5,
    "annotateScreenshot": true
  }
}
```

Response includes:
- List of matched elements with UIDs
- Confidence scores
- Selectors and accessibility info
- Annotated screenshot (if requested)

Then interact:

```json
{
  "tool": "interact_with_element",
  "arguments": {
    "uid": "element-42",
    "action": "click"
  }
}
```

## 🏗️ Architecture

```
ai-element-locator/
├── ElementLocator.ts          # Core element finding logic
├── VisualElementAnalyzer.ts   # Visual property analysis
├── ElementCoordinateMapper.ts # Coordinate-to-element mapping
└── index.ts                   # Public exports

tools/
└── ai-automation.ts           # MCP tool definitions

tests/
└── ai-element-locator.test.ts # Comprehensive tests

docs/
├── ai-element-locator.md      # Full documentation
└── ai-element-locator-examples.md # Usage examples
```

## 🎯 Element Detection Strategy

The framework uses a multi-layered approach:

1. **DOM Analysis**: Extracts all interactive elements with attributes
2. **Visual Properties**: Captures colors, fonts, positioning
3. **Accessibility Tree**: Uses Chrome's accessibility APIs
4. **Text Matching**: Analyzes visible text content
5. **Context Awareness**: Considers parent elements and relationships
6. **Confidence Scoring**: Ranks matches based on multiple factors

## 📊 Element Data Structure

Each found element includes:

```typescript
{
  uid: string,                    // Unique identifier
  boundingBox: {x, y, width, height},
  selector: string,               // CSS selector
  xpath: string,                  // XPath selector
  accessibility: {role, name},
  visual: {
    visibleText: string,
    isVisible: boolean,
    confidence: number,           // 0-1
    regionScreenshot?: string     // Optional
  },
  attributes: Record<string, string>
}
```

## ⚙️ Configuration Options

```typescript
{
  outputFormat: 'minimal' | 'concise' | 'detailed',  // ⭐ NEW: Output verbosity
  includeElementScreenshots: boolean,  // Individual screenshots
  annotateScreenshot: boolean,         // Full page annotation
  maxResults: number,                  // Max results to return
  minConfidence: number,               // Min confidence (0-1)
  fullPage: boolean                    // Full page vs viewport
}
```

### Output Format Comparison

| Format | Tokens | Use Case |
|--------|--------|----------|
| **minimal** | ~50-100 | ⭐ Free models, quick actions |
| **concise** | ~100-200 | Balanced usage |
| **detailed** | ~300-500 | Premium models, debugging |

## 🎓 Best Practices

### 1. For Free AI Models (Copilot, Claude Free, etc.)
```json
{
  "outputFormat": "minimal",
  "annotateScreenshot": false,
  "maxResults": 3,
  "minConfidence": 0.5
}
```
**Reduces token usage by 75-85%!** 

See detailed guide: [Free Model Optimization](./docs/ai-element-locator-free-models.md)

### 2. Use Specific Descriptions
```typescript
// ✅ Good
"blue submit button in the checkout form"
"email input field with placeholder"

// ❌ Too generic
"button"
"input"
```

### 3. Adjust Confidence Based on Needs
```typescript
// High precision (fewer results, more accurate)
{ minConfidence: 0.7 }

// High recall (more results, may include false positives)
{ minConfidence: 0.3 }
```

### 4. Use Visual Analysis for Debugging
```typescript
const analyzer = new VisualElementAnalyzer(page);
await analyzer.highlightElements(elements, 3000); // Highlight for 3s
```

### 4. Handle Dynamic Content
```typescript
// Always verify element exists
const handle = await locator.getElementHandle(uid);
if (!handle) {
  throw new Error('Element no longer exists');
}
```

## 🧪 Testing

Run the test suite:

```bash
npm run build
npm test tests/ai-element-locator.test.ts
```

Tests cover:
- Element finding by description
- Visual property analysis  
- Coordinate mapping
- Spatial relationships
- Integration workflows

## 🔮 Future Enhancements

Planned features:
- **AI Integration**: GPT-4 Vision API, Claude Vision
- **ML Models**: Custom element recognition models
- **OCR Support**: Text-based element finding
- **Video Recording**: Record element interactions
- **Multi-Page Tracking**: Track elements across navigation
- **Performance**: Caching and optimization

## 🤝 Contributing

This framework is part of Chrome DevTools MCP. See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## 📄 License

Copyright 2025 Google LLC  
SPDX-License-Identifier: Apache-2.0

## 🆘 Troubleshooting

### No elements found
- Lower `minConfidence` threshold
- Use more specific descriptions
- Check if elements are visible
- Verify page has loaded

### Low confidence scores
- Add more visual details to description
- Include text content in description
- Specify element location/context

### Element handle errors
- Check if element still exists in DOM
- Verify page hasn't navigated
- Try XPath as fallback selector

## 📞 Support

- **Documentation**: See [docs/ai-element-locator.md](./docs/ai-element-locator.md)
- **Examples**: See [docs/ai-element-locator-examples.md](./docs/ai-element-locator-examples.md)
- **Issues**: File on GitHub repository
- **Tests**: Check test suite for usage patterns

---

**Built with ❤️ for Chrome DevTools MCP**
