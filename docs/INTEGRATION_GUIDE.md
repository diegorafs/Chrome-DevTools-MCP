# 🔌 Integration Guide - Adding AI Element Locator to MCP Server

This guide shows how to integrate the AI Element Locator framework into your existing Chrome DevTools MCP server.

---

## 📋 Prerequisites

- Existing Chrome DevTools MCP server setup
- TypeScript project with Puppeteer
- MCP SDK installed

---

## 🚀 Step-by-Step Integration

### Step 1: Verify File Structure

Ensure these files exist:
```
src/
├── ai-element-locator/
│   ├── ElementLocator.ts              ✅ Core locator
│   ├── VisualElementAnalyzer.ts       ✅ Visual analysis
│   ├── ElementCoordinateMapper.ts     ✅ Coordinate mapping
│   ├── ConciseOutputFormatter.ts      ✅ Output formatting
│   └── index.ts                       ✅ Exports
└── tools/
    └── ai-automation.ts               ✅ MCP tools
```

### Step 2: Register MCP Tools

#### Option A: In existing `src/index.ts` or `src/main.ts`

```typescript
// Add imports at the top
import {
  findElementByDescriptionTool,
  interactWithElementTool,
  findAndClickTool,
  analyzeScreenshotWithAITool,
} from './tools/ai-automation.js';

// In your server setup, add to tools list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... your existing tools (e.g., navigateTool, screenshotTool)
      
      // Add AI automation tools
      findElementByDescriptionTool,
      interactWithElementTool,
      findAndClickTool,
      analyzeScreenshotWithAITool,
    ],
  };
});

// Add to tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const {name, arguments: args} = request.params;

  switch (name) {
    // ... your existing tool cases
    
    case 'find_element_by_description':
      return await findElementByDescription(args, context);
    
    case 'interact_with_element':
      return await interactWithElement(args, context);
    
    case 'find_and_click':
      return await findAndClick(args, context);
    
    case 'analyze_screenshot_with_ai':
      return await analyzeScreenshotWithAI(args, context);
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

#### Option B: Separate tool registration file

Create `src/tools/registry.ts`:

```typescript
import {
  findElementByDescriptionTool,
  interactWithElementTool,
  findAndClickTool,
  analyzeScreenshotWithAITool,
} from './ai-automation.js';

// Import your other tools
import {navigateTool, screenshotTool, /* ... */} from './existing-tools.js';

export const allTools = [
  // Existing tools
  navigateTool,
  screenshotTool,
  // ... other existing tools
  
  // AI automation tools
  findElementByDescriptionTool,
  interactWithElementTool,
  findAndClickTool,
  analyzeScreenshotWithAITool,
];

export {
  findElementByDescription,
  interactWithElement,
  findAndClick,
  analyzeScreenshotWithAI,
} from './ai-automation.js';
```

Then in your main server file:

```typescript
import {allTools} from './tools/registry.js';
import * as toolHandlers from './tools/registry.js';

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {tools: allTools};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const {name, arguments: args} = request.params;
  const handlerName = name.replace(/_/g, '') + 'Handler';
  
  if (toolHandlers[name]) {
    return await toolHandlers[name](args, context);
  }
  
  throw new Error(`Unknown tool: ${name}`);
});
```

### Step 3: Update Tool Reference Documentation (Optional)

Add to `docs/tool-reference.md`:

```markdown
## AI-Powered Element Location

### find_element_by_description

Find elements on the page using natural language descriptions.

**Arguments:**
- `description` (string, required): Natural language description of the element
- `outputFormat` (string, optional): Output format (minimal, concise, detailed)
- `maxResults` (number, optional): Maximum number of results to return
- `minConfidence` (number, optional): Minimum confidence threshold (0-1)
- `annotateScreenshot` (boolean, optional): Include annotated screenshot

**Example:**
```json
{
  "description": "blue submit button",
  "outputFormat": "minimal",
  "maxResults": 3,
  "minConfidence": 0.5
}
```

### interact_with_element

Interact with an element found by `find_element_by_description`.

**Arguments:**
- `uid` (string, required): Element UID from find_element_by_description
- `action` (string, required): Action type (click, type, hover, focus, scroll_into_view)
- `text` (string, optional): Text to type (required for 'type' action)

**Example:**
```json
{
  "uid": "element-42",
  "action": "click"
}
```

### find_and_click

Find and click an element in one step.

**Arguments:**
- `description` (string, required): Natural language description
- `verbose` (boolean, optional): Include detailed output

**Example:**
```json
{
  "description": "login button",
  "verbose": false
}
```

### analyze_screenshot_with_ai

Analyze the page for all interactive elements.

**Arguments:**
- `fullPage` (boolean, optional): Capture full page or viewport only
- `includeVisualProperties` (boolean, optional): Include color, font analysis
- `detectGroups` (boolean, optional): Group related elements
- `highlightElements` (boolean, optional): Highlight elements in screenshot

**Example:**
```json
{
  "fullPage": false,
  "includeVisualProperties": true
}
```
```

### Step 4: Build the Project

```bash
npm run build
```

Expected output:
```
> chrome-devtools-mcp@1.0.0 build
> tsc

✓ TypeScript compilation successful
```

### Step 5: Test the Integration

```bash
npm test
```

Or test specific file:
```bash
npm test tests/ai-element-locator.test.ts
```

---

## 🧪 Testing the Tools

### Test with MCP Client

Once integrated, test with your MCP client (Claude, Copilot, etc.):

```json
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "submit button",
    "outputFormat": "minimal"
  }
}
```

Expected response:
```json
{
  "content": [
    {
      "type": "text",
      "text": "✓ Found elements:\n1. [element-42] button: \"Submit Form\"\n2. [element-43] button: \"Submit Payment\""
    }
  ]
}
```

### Test Interaction

```json
{
  "tool": "interact_with_element",
  "arguments": {
    "uid": "element-42",
    "action": "click"
  }
}
```

Expected response:
```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Successfully clicked element element-42"
    }
  ]
}
```

### Test Find and Click

```json
{
  "tool": "find_and_click",
  "arguments": {
    "description": "login button"
  }
}
```

Expected response:
```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Clicked: login button"
    }
  ]
}
```

---

## 🔍 Troubleshooting

### Issue: Tools not showing up

**Solution**: Check tool registration

```typescript
// Verify tools are imported
import {findElementByDescriptionTool} from './tools/ai-automation.js';

// Verify tools are in array
console.log('Registered tools:', allTools.map(t => t.name));
```

### Issue: Import errors

**Solution**: Check file paths

```typescript
// Ensure .js extension for ESM
import {ElementLocator} from './ai-element-locator/index.js';

// Not .ts, even in TypeScript files
```

### Issue: Type errors

**Solution**: Ensure types are exported

```typescript
// In src/ai-element-locator/index.ts
export type {
  LocatedElement,
  ElementSearchResult,
  ElementLocatorConfig,
} from './ElementLocator.js';
```

### Issue: Tools work but are slow

**Solution**: Optimize configuration

```typescript
// In ai-automation.ts, update defaults
const locator = new ElementLocator(page, {
  annotateScreenshot: false, // Disable by default
  maxResults: 5, // Reduce if not needed
  minConfidence: 0.5, // Adjust as needed
  fullPage: false, // Viewport only
});
```

---

## 📊 Verification Checklist

After integration, verify:

- [ ] `npm run build` succeeds
- [ ] `npm test` passes (or runs without errors)
- [ ] Tools appear in MCP client
- [ ] `find_element_by_description` returns results
- [ ] `interact_with_element` performs actions
- [ ] `find_and_click` works end-to-end
- [ ] `analyze_screenshot_with_ai` provides analysis
- [ ] Error handling works (try invalid inputs)
- [ ] Configuration changes take effect
- [ ] Documentation is updated

---

## 🚀 Deployment

### Local Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Start server
npm start
```

### With MCP Client

Update your MCP client config:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "node",
      "args": ["./dist/index.js"]
    }
  }
}
```

---

## 📚 Additional Resources

- **[Production Examples](./PRODUCTION_EXAMPLES.md)** - Real-world usage patterns
- **[API Reference](./ai-element-locator.md)** - Complete API documentation
- **[Quick Reference](./QUICK_REFERENCE.md)** - Command cheat sheet
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

---

## ✅ Integration Complete!

Your MCP server now has AI-powered element location capabilities!

**Next steps:**
1. Test with real web pages
2. Try the production examples
3. Optimize configuration for your use case
4. Share with your team

**Happy automating!** 🎉
