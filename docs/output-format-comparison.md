# Output Format Comparison

This document shows real examples of the three output formats for the same search query.

## Test Query
**Description**: "submit button"  
**Page**: Login form with 5 buttons  
**Found**: 5 matching elements

---

## 1. MINIMAL Format (Recommended for Free Models)

```
✓ Found elements:
1. [element-42] button: "Submit Form"
2. [element-43] button: "Send Message"
3. [element-44] button: "Submit Payment"
4. [element-45] button: "Submit Order"
5. [element-46] button: "Submit Review"
```

**Stats**:
- Lines: 7
- Characters: ~200
- Estimated tokens: ~50-80
- Best for: GitHub Copilot Free, quick actions
- Parsing difficulty: Easy

**What you get**:
- ✅ Element IDs for interaction
- ✅ Element type
- ✅ Brief text content
- ❌ No selectors
- ❌ No confidence scores
- ❌ No positions

---

## 2. CONCISE Format (Balanced)

```
✓ Found 5 elements

1. button: "Submit Form" (85%)
   ID: element-42
   Selector: #submit-form-btn

2. button: "Send Message" (78%)
   ID: element-43
   Selector: button.send-msg

3. button: "Submit Payment" (76%)
   ID: element-44
   Selector: .payment-submit

4. button: "Submit Order" (72%)
   ID: element-45
   Selector: button[type="submit"]

5. button: "Submit Review" (68%)
   ID: element-46
   Selector: .review-form > button

💡 To interact: use uid value (e.g., "element-42")
```

**Stats**:
- Lines: 22
- Characters: ~480
- Estimated tokens: ~120-180
- Best for: Claude Free, balanced usage
- Parsing difficulty: Medium

**What you get**:
- ✅ Element IDs for interaction
- ✅ Element type
- ✅ Full text content
- ✅ CSS selectors
- ✅ Confidence scores
- ❌ No positions
- ✅ Usage hint

---

## 3. DETAILED Format (For Premium Models)

```
✓ Found 5 matching elements (247ms)
  Query: "submit button"

1. BUTTON
   ID: element-42
   Text: "Submit Form"
   Selector: #submit-form-btn
   Match: 85%
   Position: (450,320)

2. BUTTON
   ID: element-43
   Text: "Send Message"
   Selector: button.send-msg
   Match: 78%
   Position: (470,450)

3. BUTTON
   ID: element-44
   Text: "Submit Payment"
   Selector: .payment-submit
   Match: 76%
   Position: (430,580)

4. BUTTON
   ID: element-45
   Text: "Submit Order"
   Selector: button[type="submit"]
   Match: 72%
   Position: (460,650)

5. BUTTON
   ID: element-46
   Text: "Submit Review"
   Selector: .review-form > button
   Match: 68%
   Position: (440,720)

💡 Usage:
   1. Note the ID of the element you want
   2. Use interact_with_element tool with that ID
   3. Example: {"uid": "element-42", "action": "click"}
```

**Stats**:
- Lines: 38
- Characters: ~920
- Estimated tokens: ~300-450
- Best for: GPT-4, Claude Pro, debugging
- Parsing difficulty: Easy (rich structure)

**What you get**:
- ✅ Element IDs for interaction
- ✅ Element type (emphasized)
- ✅ Complete text content
- ✅ CSS selectors
- ✅ Confidence scores
- ✅ Screen positions
- ✅ Processing time
- ✅ Original query
- ✅ Detailed usage instructions

---

## Alternative Formats

### JSON Format (Structured Data)

```json
{
  "found": 5,
  "query": "submit button",
  "time_ms": 247,
  "elements": [
    {
      "uid": "element-42",
      "type": "button",
      "text": "Submit Form",
      "selector": "#submit-form-btn",
      "confidence": 85
    },
    {
      "uid": "element-43",
      "type": "button",
      "text": "Send Message",
      "selector": "button.send-msg",
      "confidence": 78
    }
    // ... more elements
  ]
}
```

**Best for**: Programmatic parsing, API integration

### Compact Lines Format

```
[1] button "Submit Form" id=element-42 conf=85%
[2] button "Send Message" id=element-43 conf=78%
[3] button "Submit Payment" id=element-44 conf=76%
[4] button "Submit Order" id=element-45 conf=72%
[5] button "Submit Review" id=element-46 conf=68%
```

**Best for**: Ultra-minimal token usage, log files

### Table Format (Markdown)

```markdown
| # | Type | Text | ID | Match |
|---|------|------|-------|-------|
| 1 | button | Submit Form | `element-42` | 85% |
| 2 | button | Send Message | `element-43` | 78% |
| 3 | button | Submit Payment | `element-44` | 76% |
| 4 | button | Submit Order | `element-45` | 72% |
| 5 | button | Submit Review | `element-46` | 68% |
```

**Best for**: Documentation, reports, visual clarity

### Action Summary Format

```
✓ BEST MATCH:
  Type: button
  Text: "Submit Form"
  ID: element-42
  Confidence: 85%

🎯 TO CLICK THIS ELEMENT:
   {"uid": "element-42", "action": "click"}

📝 TO TYPE IN THIS ELEMENT:
   {"uid": "element-42", "action": "type", "text": "your text"}

ℹ️  4 more similar elements available
```

**Best for**: Next action suggestions, AI guidance

---

## Token Usage Comparison

| Format | Characters | Est. Tokens | Relative Cost | Speed |
|--------|-----------|-------------|---------------|-------|
| Minimal | ~200 | 50-80 | 1x (baseline) | Fastest |
| Concise | ~480 | 120-180 | 2-3x | Fast |
| Detailed | ~920 | 300-450 | 5-8x | Moderate |
| JSON | ~400 | 100-150 | 2x | Fast |
| Compact | ~280 | 70-100 | 1.5x | Fastest |
| Table | ~350 | 90-120 | 2x | Fast |
| Action | ~250 | 60-90 | 1.2x | Fast |

---

## When to Use Each Format

### Use MINIMAL when:
- ✅ Using free AI models (Copilot, Claude Free)
- ✅ Token limits are strict
- ✅ You just need the element IDs
- ✅ Performing simple click actions
- ✅ Speed is critical

### Use CONCISE when:
- ✅ Need selectors for debugging
- ✅ Want confidence scores
- ✅ Balanced token usage
- ✅ Mid-tier AI models
- ✅ Most common use case

### Use DETAILED when:
- ✅ Premium AI models (GPT-4, Claude Pro)
- ✅ Debugging issues
- ✅ Need complete context
- ✅ Position information matters
- ✅ Learning/documentation

### Use JSON when:
- ✅ Programmatic processing
- ✅ API integration
- ✅ Structured data needed
- ✅ Automation pipelines

### Use COMPACT when:
- ✅ Ultra-minimal tokens
- ✅ Log file output
- ✅ Quick scanning
- ✅ One-line per element

### Use TABLE when:
- ✅ Documentation
- ✅ Reports
- ✅ Visual comparison
- ✅ Markdown output

### Use ACTION when:
- ✅ Single best result needed
- ✅ Next action guidance
- ✅ AI assistance for next step
- ✅ Clear action templates

---

## Real-World Example: Complete Workflow

### Scenario: Login to website (using FREE model)

#### Step 1: Find email input (MINIMAL format)
```
Request:
{
  "description": "email input",
  "outputFormat": "minimal",
  "maxResults": 1
}

Response:
✓ Found elements:
1. [element-55] textbox: "Email address"

Tokens used: ~40
```

#### Step 2: Type email
```
Request:
{
  "uid": "element-55",
  "action": "type",
  "text": "user@example.com"
}

Response:
✅ Typed "user@example.com" into element element-55

Tokens used: ~30
```

#### Step 3: Find password input (MINIMAL format)
```
Request:
{
  "description": "password input",
  "outputFormat": "minimal",
  "maxResults": 1
}

Response:
✓ Found elements:
1. [element-56] textbox: "Password"

Tokens used: ~40
```

#### Step 4: Type password
```
Request:
{
  "uid": "element-56",
  "action": "type",
  "text": "secret123"
}

Response:
✅ Typed "[hidden]" into element element-56

Tokens used: ~25
```

#### Step 5: Click login (MINIMAL + click)
```
Request:
{
  "tool": "find_and_click",
  "description": "login button",
  "verbose": false
}

Response:
✓ Clicked: "login button"

Tokens used: ~30
```

**Total tokens: ~165**

### Same scenario with DETAILED format: ~850 tokens
**Savings: 80%** 🎉

---

## Configuration Tips

### For maximum efficiency:
```typescript
const minimalConfig = {
  outputFormat: 'minimal',
  annotateScreenshot: false,
  includeElementScreenshots: false,
  maxResults: 3,
  minConfidence: 0.5
};
```

### For balanced usage:
```typescript
const conciseConfig = {
  outputFormat: 'concise',
  annotateScreenshot: false,
  includeElementScreenshots: false,
  maxResults: 5,
  minConfidence: 0.4
};
```

### For full features:
```typescript
const detailedConfig = {
  outputFormat: 'detailed',
  annotateScreenshot: true,
  includeElementScreenshots: true,
  maxResults: 10,
  minConfidence: 0.3
};
```

---

## Summary

Choose your format based on your AI model and needs:

- **Free models** → MINIMAL (75-85% token savings)
- **Mid-tier models** → CONCISE (balanced)
- **Premium models** → DETAILED (full features)
- **Automation** → JSON (structured)
- **Logging** → COMPACT (ultra-minimal)
- **Docs** → TABLE (visual)
- **Assistance** → ACTION (next-step)

The framework automatically adjusts output to match your needs while maintaining full functionality!
