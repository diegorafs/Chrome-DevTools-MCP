# AI Element Locator - Free Model Optimization Guide

This guide explains how to use the AI Element Locator Framework efficiently with **free AI models** like GitHub Copilot Free, Claude on free tier, and other token-limited models.

## 🎯 Key Optimizations for Free Models

### 1. **Concise Output Formats**

The framework supports three output verbosity levels:

| Format | Tokens Used | Best For | Response Time |
|--------|-------------|----------|---------------|
| **minimal** | ~50-100 | Free models, quick actions | Fastest |
| **concise** | ~100-200 | Balanced usage | Fast |
| **detailed** | ~300-500 | Premium models, debugging | Slower |

### 2. **Recommended Settings for Free Models**

```json
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "login button",
    "outputFormat": "minimal",
    "annotateScreenshot": false,
    "maxResults": 3,
    "minConfidence": 0.5
  }
}
```

**Why these settings?**
- `minimal` output = fewer tokens consumed
- No screenshot = faster response, less data transfer
- `maxResults: 3` = enough options without overwhelming
- Higher confidence = more accurate results

## 📊 Output Format Examples

### Minimal Output (Recommended for Free Models)

```
✓ Found elements:
1. [element-42] button: "Submit Form"
2. [element-43] button: "Cancel"
3. [element-44] button: "Reset"
+ 2 more
```

**Tokens**: ~50-80  
**Parsing**: Simple, pattern-based  
**Information**: Essential only (uid, type, text)

### Concise Output (Balanced)

```
✓ Found 5 elements

1. button: "Submit Form" (85%)
   ID: element-42
   Selector: #submit-btn

2. button: "Cancel Operation" (72%)
   ID: element-43
   Selector: .cancel-button

3. button: "Reset Fields" (68%)
   ID: element-44
   Selector: button.reset

💡 To interact: use uid value (e.g., "element-42")
```

**Tokens**: ~150-200  
**Parsing**: Structured, readable  
**Information**: Includes selectors and confidence

### Detailed Output (For Premium Models)

```
✓ Found 5 matching elements (247ms)
  Query: "submit button"

1. BUTTON
   ID: element-42
   Text: "Submit Form"
   Selector: #submit-btn
   Match: 85%
   Position: (450,320)

[... more details ...]

💡 Usage:
   1. Note the ID of the element you want
   2. Use interact_with_element tool with that ID
   3. Example: {"uid": "element-42", "action": "click"}
```

**Tokens**: ~400-500  
**Parsing**: Rich structured data  
**Information**: Complete details

## 🚀 Workflow for Free Models

### Pattern 1: Quick Click (Most Efficient)

```json
// Step 1: Find and click in one call
{
  "tool": "find_and_click",
  "arguments": {
    "description": "login button",
    "verbose": false
  }
}

// Response (minimal):
✓ Clicked: "login button"
```

**Total tokens**: ~30-50  
**Actions**: 1 tool call  
**Best for**: Simple interactions

### Pattern 2: Find Then Interact

```json
// Step 1: Find with minimal output
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "email input",
    "outputFormat": "minimal",
    "annotateScreenshot": false,
    "maxResults": 1
  }
}

// Response:
✓ Found elements:
1. [element-55] textbox: "Email address"

// Step 2: Interact
{
  "tool": "interact_with_element",
  "arguments": {
    "uid": "element-55",
    "action": "type",
    "text": "user@example.com"
  }
}
```

**Total tokens**: ~80-120  
**Actions**: 2 tool calls  
**Best for**: Multiple actions on same element

### Pattern 3: Multi-Step Forms (Optimized)

```json
// 1. Find all fields at once with minimal output
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "input field",
    "outputFormat": "minimal",
    "maxResults": 5,
    "minConfidence": 0.3
  }
}

// Response:
✓ Found elements:
1. [element-55] textbox: "Email"
2. [element-56] textbox: "Password"
3. [element-57] textbox: "Name"

// 2-4. Type in each field (compact responses)
// 5. Click submit
```

**Total tokens**: ~200-300  
**Actions**: 5-6 tool calls  
**Best for**: Complex forms

## 💡 Token Optimization Strategies

### Strategy 1: Disable Screenshots

Screenshots consume the most tokens:

```json
{
  "annotateScreenshot": false,        // Save ~5000 tokens
  "includeElementScreenshots": false  // Save ~1000 tokens per element
}
```

**When to enable screenshots:**
- Debugging only
- When free model struggles to find elements
- Visual verification needed

### Strategy 2: Use Specific Descriptions

More specific = fewer results = fewer tokens:

```
❌ "button" 
   → Returns 20+ buttons, uses many tokens

✓ "blue submit button at bottom"
   → Returns 1-3 buttons, minimal tokens
```

### Strategy 3: Adjust maxResults

```json
{
  "maxResults": 1  // Fastest, least tokens (if you know it's unique)
  "maxResults": 3  // Balanced (recommended for free models)
  "maxResults": 10 // More options but uses more tokens
}
```

### Strategy 4: Use find_and_click for Simple Actions

```json
// ✓ EFFICIENT (1 call, ~40 tokens)
{
  "tool": "find_and_click",
  "arguments": {"description": "submit button"}
}

// ❌ INEFFICIENT (2 calls, ~150 tokens)
{
  "tool": "find_element_by_description",
  "arguments": {"description": "submit button"}
}
// ... then interact_with_element ...
```

### Strategy 5: Higher Confidence Threshold

```json
{
  "minConfidence": 0.6  // Fewer but better matches
  // vs
  "minConfidence": 0.2  // Many matches, more tokens
}
```

## 📋 Quick Reference: Tool Parameters for Free Models

### find_element_by_description

```json
{
  "description": "your search",
  "outputFormat": "minimal",           // ⭐ KEY: Use "minimal"
  "annotateScreenshot": false,         // ⭐ KEY: Disable screenshots
  "includeElementScreenshots": false,  // ⭐ KEY: Disable screenshots
  "maxResults": 3,                     // ⭐ KEY: Limit results
  "minConfidence": 0.5                 // Higher = fewer results
}
```

### find_and_click

```json
{
  "description": "your target",
  "verbose": false  // ⭐ KEY: Minimal output
}
```

### interact_with_element

```json
{
  "uid": "element-42",
  "action": "click|type|hover|focus|scroll_into_view",
  "text": "optional for type action"
}
```

## 🎯 Example Workflows

### Login Automation (Optimized)

```json
// 1. Type email (find + interact)
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "email input",
    "outputFormat": "minimal",
    "maxResults": 1
  }
}
// Note the uid, then:
{
  "tool": "interact_with_element",
  "arguments": {
    "uid": "element-55",
    "action": "type",
    "text": "user@example.com"
  }
}

// 2. Type password (reuse pattern)
// 3. Click login button
{
  "tool": "find_and_click",
  "arguments": {
    "description": "login button",
    "verbose": false
  }
}
```

**Total tokens**: ~150-200 (vs 800+ with detailed output)

### Form Filling (Super Efficient)

```json
// Strategy: Find once, interact multiple times
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "input",
    "outputFormat": "minimal",
    "maxResults": 10
  }
}

// Response shows all inputs with IDs
// Then interact with each by UID
```

### Search and Navigate

```json
// 1. Find search box and type
{
  "tool": "find_and_click",
  "arguments": {"description": "search input"}
}

// 2. Type search query
{
  "tool": "interact_with_element",
  "arguments": {
    "uid": "element-XX",
    "action": "type",
    "text": "my search"
  }
}

// 3. Submit
{
  "tool": "find_and_click",
  "arguments": {"description": "search button"}
}
```

## 📊 Token Usage Comparison

| Task | Standard Output | Minimal Output | Savings |
|------|----------------|----------------|---------|
| Find 5 buttons | 450 tokens | 80 tokens | **82%** |
| Find + click | 200 tokens | 50 tokens | **75%** |
| Form (3 fields) | 800 tokens | 200 tokens | **75%** |
| With screenshot | 6000 tokens | 200 tokens | **97%** |

## 🔧 Configuration for Different AI Models

### GitHub Copilot Free

```json
{
  "outputFormat": "minimal",
  "annotateScreenshot": false,
  "maxResults": 3,
  "verbose": false
}
```

**Why**: Limited context window, needs concise responses

### Claude Free Tier

```json
{
  "outputFormat": "concise",
  "annotateScreenshot": false,
  "maxResults": 5,
  "verbose": false
}
```

**Why**: Better at parsing structured text, can handle slightly more

### GPT-3.5 (Free APIs)

```json
{
  "outputFormat": "minimal",
  "annotateScreenshot": false,
  "maxResults": 3
}
```

**Why**: Token limits, benefits from minimal output

### Local Models (Ollama, etc.)

```json
{
  "outputFormat": "minimal",
  "annotateScreenshot": false,
  "maxResults": 1,
  "minConfidence": 0.7
}
```

**Why**: Smaller context, needs very concise info

## 🎓 Best Practices for Free Models

### ✅ DO:
- Use `outputFormat: "minimal"` by default
- Disable screenshots unless debugging
- Use specific element descriptions
- Limit `maxResults` to 1-3
- Use `find_and_click` for simple actions
- Increase `minConfidence` for cleaner results
- Cache element IDs to reuse

### ❌ DON'T:
- Request screenshots by default
- Use vague descriptions like "button"
- Set `maxResults` > 10
- Use detailed output unless needed
- Request element screenshots
- Lower confidence below 0.3
- Re-find elements unnecessarily

## 🚀 Performance Tips

### 1. Batch Operations
```json
// Find all inputs once
{"description": "input", "maxResults": 10}
// Then interact with each by UID
```

### 2. Reuse UIDs
```json
// Save UIDs in your context
const emailField = "element-55";
const passwordField = "element-56";
// Reuse them
```

### 3. Progressive Search
```json
// Start specific
{"description": "blue submit button", "minConfidence": 0.7}
// If not found, broaden
{"description": "submit button", "minConfidence": 0.5}
// Last resort
{"description": "button", "minConfidence": 0.3}
```

## 📈 Monitoring Token Usage

The framework provides timing information:

```
✓ Found 3 elements
  Time: 247ms
  Elements: 3
  Format: minimal
  Est. tokens: ~80
```

Use this to optimize your workflows!

## 🆘 Troubleshooting with Free Models

### "Not enough tokens" error
- Switch to `outputFormat: "minimal"`
- Disable screenshots
- Reduce `maxResults`

### "Too slow" responses
- Disable `annotateScreenshot`
- Use `find_and_click` for simple actions
- Increase `minConfidence`

### "Can't find element"
- Lower `minConfidence` slightly
- Use more specific description
- Temporarily enable screenshot for debugging

## 🎯 Summary

**For optimal free model usage:**

```json
// Your default config
{
  "outputFormat": "minimal",
  "annotateScreenshot": false,
  "includeElementScreenshots": false,
  "maxResults": 3,
  "minConfidence": 0.5,
  "verbose": false
}
```

**This gives you:**
- ✅ 75-85% fewer tokens
- ✅ Faster responses
- ✅ Clearer, more actionable output
- ✅ Better parsing by weaker models
- ✅ More requests within free tier limits

---

**Remember**: The framework is designed to work efficiently with ANY AI model, from premium GPT-4 to free Copilot. Adjust the settings based on your needs!
