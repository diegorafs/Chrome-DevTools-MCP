# Integration Guide: AI Element Locator Framework

This guide explains how to integrate the AI Element Locator Framework into the Chrome DevTools MCP project.

## Files Created

### Core Framework
```
src/ai-element-locator/
├── ElementLocator.ts              # Main element finding logic
├── VisualElementAnalyzer.ts       # Visual analysis utilities
├── ElementCoordinateMapper.ts     # Coordinate-based queries
└── index.ts                       # Public exports
```

### MCP Tools
```
src/tools/
└── ai-automation.ts               # New MCP tools
    ├── find_element_by_description
    ├── analyze_screenshot_with_ai
    ├── interact_with_element
    └── find_and_click
```

### Tests
```
tests/
└── ai-element-locator.test.ts     # Comprehensive test suite
```

### Documentation
```
docs/
├── ai-element-locator.md          # Full API documentation
├── ai-element-locator-examples.md # Usage examples
└── ai-element-locator-architecture.md # Architecture overview

AI_ELEMENT_LOCATOR_README.md      # Quick start guide
```

## Integration Steps

### Step 1: Register MCP Tools

Add the new tools to your tool registry. In `src/main.ts` or wherever tools are registered:

```typescript
// Import the new tools
import {
  findElementByDescription,
  analyzeScreenshotWithAI,
  interactWithElement,
  findAndClick,
} from './tools/ai-automation.js';

// Register with MCP server
server.tool(findElementByDescription.definition, findElementByDescription.handler);
server.tool(analyzeScreenshotWithAI.definition, analyzeScreenshotWithAI.handler);
server.tool(interactWithElement.definition, interactWithElement.handler);
server.tool(findAndClick.definition, findAndClick.handler);
```

### Step 2: Update Tool Categories (Optional)

If you want the tools in a specific category, update `src/tools/categories.ts`:

```typescript
export const ToolCategories = {
  // ... existing categories
  AI_AUTOMATION: 'ai-automation',
} as const;
```

Then update the tool annotations in `ai-automation.ts`:

```typescript
annotations: {
  category: ToolCategories.AI_AUTOMATION,
  readOnlyHint: false,
}
```

### Step 3: Build the Project

```bash
npm run build
```

This compiles TypeScript and prepares the framework for use.

### Step 4: Run Tests

```bash
npm test tests/ai-element-locator.test.ts
```

Verify all tests pass. You may need to adjust test setup based on your environment.

### Step 5: Update Documentation

Add a reference to the AI Element Locator in your main README:

```markdown
## AI-Powered Element Detection

Chrome DevTools MCP now includes an AI-powered element locator that lets you find
and interact with DOM elements using natural language descriptions.

See [AI_ELEMENT_LOCATOR_README.md](./AI_ELEMENT_LOCATOR_README.md) for details.

### Quick Example

\`\`\`json
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "login button",
    "annotateScreenshot": true
  }
}
\`\`\`
```

### Step 6: Update Tool Reference Documentation

If you have a tool reference document (like `docs/tool-reference.md`), add entries:

```markdown
## AI-Powered Automation Tools

### find_element_by_description

Find elements on the page using natural language descriptions.

**Parameters:**
- `description` (string, required): Natural language description
- `maxResults` (number, optional): Maximum results (default: 5)
- `minConfidence` (number, optional): Minimum confidence 0-1 (default: 0.3)
- `annotateScreenshot` (boolean, optional): Include annotated screenshot
- `includeElementScreenshots` (boolean, optional): Include element screenshots

**Example:**
\`\`\`json
{
  "description": "blue submit button",
  "maxResults": 3
}
\`\`\`

### analyze_screenshot_with_ai

Capture and analyze page screenshot with element detection.

[... continue for other tools ...]
```

## Usage in Existing Code

### From Existing MCP Context

The AI Element Locator integrates seamlessly with existing context:

```typescript
import {ElementLocator} from '../ai-element-locator/index.js';

// In any MCP tool handler
handler: async (request, response, context) => {
  const page = context.getSelectedPage();
  
  const locator = new ElementLocator(page);
  const result = await locator.findElementsByDescription('submit button');
  
  // Use with existing context methods
  if (result.elements.length > 0) {
    const element = result.elements[0];
    response.appendResponseLine(`Found: ${element.selector}`);
  }
}
```

### With Existing Screenshot Tool

You can combine with the existing `take_screenshot` tool:

```typescript
// Take standard screenshot
const screenshot = await page.screenshot({type: 'png'});

// Then analyze with AI
const locator = new ElementLocator(page, {
  annotateScreenshot: true
});
const result = await locator.findElementsByDescription('');
```

### With Existing Snapshot Tool

Complement the text snapshot with visual analysis:

```typescript
// Existing text snapshot
response.setIncludeSnapshot(true);

// Add visual analysis
const analyzer = new VisualElementAnalyzer(page);
const visualProps = await analyzer.analyzeElements(elements);
```

## Configuration

### Environment Variables (Optional)

You can add configuration options via environment variables:

```bash
# .env or similar
AI_ELEMENT_LOCATOR_DEFAULT_CONFIDENCE=0.5
AI_ELEMENT_LOCATOR_MAX_RESULTS=10
AI_ELEMENT_LOCATOR_CACHE_TTL=5000
```

Then in your code:

```typescript
const config = {
  minConfidence: parseFloat(process.env.AI_ELEMENT_LOCATOR_DEFAULT_CONFIDENCE || '0.5'),
  maxResults: parseInt(process.env.AI_ELEMENT_LOCATOR_MAX_RESULTS || '10'),
};
```

### Global Configuration (Optional)

Create a config file for project-wide settings:

```typescript
// src/ai-element-locator/config.ts
export const AI_LOCATOR_CONFIG = {
  defaultMinConfidence: 0.5,
  defaultMaxResults: 10,
  cacheEnabled: true,
  cacheTTL: 5000,
  annotationColor: '#00ff00',
  annotationLineWidth: 2,
};
```

## Backwards Compatibility

The AI Element Locator framework:
- ✅ Does NOT modify existing tools
- ✅ Does NOT change existing APIs
- ✅ Adds new optional tools only
- ✅ Uses existing Puppeteer/CDP infrastructure
- ✅ Integrates with existing McpContext
- ✅ Compatible with existing test infrastructure

Existing code continues to work without modification.

## Migration Path for Existing Selectors

If you have existing code using CSS selectors, you can gradually migrate:

### Before (CSS Selector)
```typescript
const button = await page.$('.submit-btn');
if (button) {
  await button.click();
}
```

### After (AI-Powered)
```typescript
const locator = new ElementLocator(page);
const result = await locator.findElementsByDescription('submit button');
if (result.elements.length > 0) {
  const handle = await locator.getElementHandle(result.elements[0].uid);
  if (handle) {
    await handle.click();
    await handle.dispose();
  }
}
```

### Hybrid Approach (Best of Both)
```typescript
// Try CSS first (fast)
let button = await page.$('.submit-btn');

// Fallback to AI (robust)
if (!button) {
  const locator = new ElementLocator(page);
  const result = await locator.findElementsByDescription('submit button');
  if (result.elements.length > 0) {
    button = await locator.getElementHandle(result.elements[0].uid);
  }
}

if (button) {
  await button.click();
}
```

## Performance Considerations

### When to Use AI Element Locator
- ✅ Complex pages with dynamic selectors
- ✅ When CSS selectors break frequently
- ✅ For user-facing automation tools
- ✅ When visual context matters
- ✅ For accessibility auditing

### When to Use Traditional Selectors
- ✅ Simple, stable selectors
- ✅ Performance-critical code
- ✅ Known element IDs/classes
- ✅ Internal testing

### Optimization Tips

1. **Cache Results**: For multiple operations on same elements
   ```typescript
   const mapper = new ElementCoordinateMapper(page);
   mapper.updateCache(elements);
   // ... multiple queries ...
   ```

2. **Disable Annotations**: When not needed
   ```typescript
   const locator = new ElementLocator(page, {
     annotateScreenshot: false
   });
   ```

3. **Limit Results**: Only get what you need
   ```typescript
   const locator = new ElementLocator(page, {
     maxResults: 1  // Only need the best match
   });
   ```

4. **Use Viewport Screenshots**: Faster than full page
   ```typescript
   const locator = new ElementLocator(page, {
     fullPage: false
   });
   ```

## Troubleshooting Integration

### Import Errors
If you get import errors:
```bash
npm run build  # Rebuild to generate type definitions
```

### Test Failures
If tests fail:
1. Check Puppeteer version compatibility
2. Verify Chrome is installed
3. Check test environment setup
4. Run tests in headful mode for debugging

### Type Errors
If TypeScript complains:
1. Ensure `@types/node` is installed
2. Check `tsconfig.json` includes `DOM` lib
3. Verify Puppeteer types are available

### Runtime Errors
Common issues:
- **"Cannot find module"**: Run `npm run build`
- **"Element not found"**: Lower minConfidence
- **"Page closed"**: Check page lifecycle
- **"Timeout"**: Increase timeout values

## Testing Integration

Add integration tests to verify the framework works with your existing code:

```typescript
// tests/integration/ai-locator-integration.test.ts
import {describe, it} from 'node:test';
import {withBrowser} from '../utils.js';
import {ElementLocator} from '../../src/ai-element-locator/index.js';

describe('AI Locator Integration', () => {
  it('should work with existing MCP context', async () => {
    await withBrowser(async (response, context) => {
      const page = context.getSelectedPage();
      await page.setContent('<button>Click Me</button>');
      
      const locator = new ElementLocator(page);
      const result = await locator.findElementsByDescription('button');
      
      assert(result.elements.length > 0);
    });
  });
});
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Tool reference updated
- [ ] README includes new features
- [ ] CHANGELOG updated
- [ ] Version bumped appropriately
- [ ] Examples tested
- [ ] Performance benchmarked
- [ ] Error handling verified
- [ ] Backwards compatibility confirmed

## Next Steps

1. **Test with Real Pages**: Try the framework on real websites
2. **Gather Feedback**: Get user feedback on accuracy
3. **Tune Defaults**: Adjust default confidence/maxResults
4. **Add Examples**: Create more usage examples
5. **Monitor Performance**: Track processing times
6. **Plan AI Integration**: Prepare for Vision API integration

## Getting Help

- **Documentation**: See `docs/ai-element-locator.md`
- **Examples**: See `docs/ai-element-locator-examples.md`
- **Architecture**: See `docs/ai-element-locator-architecture.md`
- **Tests**: See `tests/ai-element-locator.test.ts`
- **Issues**: File on GitHub repository

## Future Integration Plans

### Phase 1 (Current)
- ✅ Core framework
- ✅ Basic text matching
- ✅ Visual property analysis
- ✅ MCP tools

### Phase 2 (Planned)
- [ ] GPT-4 Vision integration
- [ ] Claude Vision integration
- [ ] Improved confidence scoring
- [ ] Caching layer

### Phase 3 (Future)
- [ ] Custom ML models
- [ ] OCR support
- [ ] Video recording
- [ ] Multi-page tracking

---

**Integration Support**: If you encounter issues integrating the framework, check the troubleshooting section or refer to the test suite for working examples.
