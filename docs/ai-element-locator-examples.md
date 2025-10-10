# AI Element Locator Examples

This directory contains practical examples of using the AI-Powered Element Location Framework.

## Quick Start Example

```typescript
import { Browser } from 'puppeteer-core';
import { ElementLocator, VisualElementAnalyzer } from '../src/ai-element-locator';

async function automateLogin(page: Page) {
  // 1. Find the email input field
  const locator = new ElementLocator(page, {
    minConfidence: 0.5,
    annotateScreenshot: true
  });
  
  const emailResult = await locator.findElementsByDescription('email input field');
  
  if (emailResult.elements.length === 0) {
    throw new Error('Email field not found');
  }
  
  const emailField = emailResult.elements[0];
  console.log(`Found email field: ${emailField.selector}`);
  
  // 2. Type email address
  const emailHandle = await locator.getElementHandle(emailField.uid);
  if (emailHandle) {
    await emailHandle.type('user@example.com');
    await emailHandle.dispose();
  }
  
  // 3. Find password field
  const passwordResult = await locator.findElementsByDescription('password input');
  const passwordField = passwordResult.elements[0];
  
  if (passwordField) {
    const passwordHandle = await locator.getElementHandle(passwordField.uid);
    if (passwordHandle) {
      await passwordHandle.type('secret123');
      await passwordHandle.dispose();
    }
  }
  
  // 4. Find and click login button
  const buttonResult = await locator.findElementsByDescription('login button');
  const loginButton = buttonResult.elements[0];
  
  if (loginButton) {
    const buttonHandle = await locator.getElementHandle(loginButton.uid);
    if (buttonHandle) {
      await buttonHandle.click();
      await buttonHandle.dispose();
    }
  }
  
  console.log('Login automation complete!');
}
```

## Example 2: Visual Analysis for Testing

```typescript
async function analyzePageLayout(page: Page) {
  const locator = new ElementLocator(page);
  const analyzer = new VisualElementAnalyzer(page, {
    includeColors: true,
    detectGroups: true
  });
  
  // Get all elements
  const allElements = await locator.findElementsByDescription('');
  
  // Analyze visual properties
  const visualProps = await analyzer.analyzeElements(allElements.elements);
  
  // Check for accessibility issues
  const interactiveElements = Array.from(visualProps.entries())
    .filter(([_, props]) => props.isInteractive);
  
  console.log(`Total elements: ${allElements.elements.length}`);
  console.log(`Interactive elements: ${interactiveElements.length}`);
  
  // Detect button color consistency
  const buttons = Array.from(visualProps.entries())
    .filter(([_, props]) => props.category === 'button');
  
  const buttonColors = new Set(
    buttons.map(([_, props]) => props.backgroundColor)
  );
  
  if (buttonColors.size > 3) {
    console.warn(`Warning: ${buttonColors.size} different button colors found`);
  }
  
  // Highlight problematic elements
  const smallText = allElements.elements.filter(el => {
    const props = visualProps.get(el.uid);
    return props && props.fontSize < 12;
  });
  
  if (smallText.length > 0) {
    console.warn(`Found ${smallText.length} elements with small text`);
    await analyzer.highlightElements(smallText, 3000);
  }
}
```

## Example 3: Smart Form Filling

```typescript
async function fillFormIntelligently(page: Page, formData: Record<string, string>) {
  const locator = new ElementLocator(page, { minConfidence: 0.4 });
  
  for (const [fieldName, value] of Object.entries(formData)) {
    // Try to find field by name
    const result = await locator.findElementsByDescription(
      `${fieldName} input field`
    );
    
    if (result.elements.length > 0) {
      const field = result.elements[0];
      console.log(`Filling ${fieldName}: ${field.selector}`);
      
      const handle = await locator.getElementHandle(field.uid);
      if (handle) {
        // Clear existing value
        await handle.click({ clickCount: 3 });
        await handle.press('Backspace');
        
        // Type new value
        await handle.type(value);
        await handle.dispose();
      }
    } else {
      console.warn(`Field not found: ${fieldName}`);
    }
  }
}

// Usage
await fillFormIntelligently(page, {
  'first name': 'John',
  'last name': 'Doe',
  'email': 'john@example.com',
  'phone': '555-0123'
});
```

## Example 4: Spatial Navigation

```typescript
import { ElementCoordinateMapper } from '../src/ai-element-locator';

async function navigateMenu(page: Page) {
  const locator = new ElementLocator(page);
  const mapper = new ElementCoordinateMapper(page);
  
  // Find main menu
  const menuResult = await locator.findElementsByDescription('main navigation menu');
  const menu = menuResult.elements[0];
  
  if (!menu) {
    throw new Error('Menu not found');
  }
  
  // Get all elements
  const allElements = await locator.findElementsByDescription('');
  mapper.updateCache(allElements.elements);
  
  // Find elements to the right of the menu (submenu items)
  const relationships = await mapper.getElementRelationships(
    menu,
    allElements.elements
  );
  
  console.log(`Found ${relationships.right.length} items to the right`);
  console.log(`Found ${relationships.below.length} items below`);
  
  // Click the first item to the right
  if (relationships.right.length > 0) {
    const firstItem = relationships.right[0];
    if (firstItem) {
      const handle = await locator.getElementHandle(firstItem.uid);
      if (handle) {
        await handle.click();
        await handle.dispose();
      }
    }
  }
}
```

## Example 5: Multi-Step Workflow with Verification

```typescript
async function purchaseProduct(page: Page) {
  const locator = new ElementLocator(page, {
    minConfidence: 0.6,
    annotateScreenshot: true
  });
  
  // Step 1: Find and click "Add to Cart"
  console.log('Step 1: Adding to cart...');
  let result = await locator.findElementsByDescription('add to cart button');
  
  if (result.elements.length === 0) {
    throw new Error('Add to cart button not found');
  }
  
  let handle = await locator.getElementHandle(result.elements[0]!.uid);
  if (handle) {
    await handle.click();
    await handle.dispose();
  }
  
  // Wait for cart update
  await page.waitForTimeout(1000);
  
  // Step 2: Navigate to cart
  console.log('Step 2: Opening cart...');
  result = await locator.findElementsByDescription('view cart');
  
  if (result.elements.length > 0) {
    handle = await locator.getElementHandle(result.elements[0]!.uid);
    if (handle) {
      await handle.click();
      await handle.dispose();
    }
  }
  
  // Wait for page load
  await page.waitForTimeout(1000);
  
  // Step 3: Proceed to checkout
  console.log('Step 3: Proceeding to checkout...');
  result = await locator.findElementsByDescription('checkout button');
  
  if (result.elements.length > 0) {
    handle = await locator.getElementHandle(result.elements[0]!.uid);
    if (handle) {
      await handle.click();
      await handle.dispose();
    }
  }
  
  // Verify checkout page loaded
  await page.waitForTimeout(1000);
  result = await locator.findElementsByDescription('payment method');
  
  if (result.elements.length === 0) {
    throw new Error('Failed to reach checkout page');
  }
  
  console.log('Successfully navigated to checkout!');
}
```

## Example 6: Screenshot-Based Debugging

```typescript
import fs from 'fs/promises';

async function debugPageElements(page: Page, outputDir: string) {
  const locator = new ElementLocator(page, {
    annotateScreenshot: true,
    includeElementScreenshots: true,
    maxResults: 20
  });
  
  const analyzer = new VisualElementAnalyzer(page);
  
  // Get all interactive elements
  const result = await locator.findElementsByDescription('');
  
  // Save annotated full page screenshot
  if (result.annotatedScreenshot) {
    await fs.writeFile(
      `${outputDir}/page-annotated.png`,
      result.annotatedScreenshot,
      'base64'
    );
    console.log('Saved annotated screenshot');
  }
  
  // Highlight elements temporarily
  await analyzer.highlightElements(result.elements, 2000);
  
  // Save individual element screenshots
  const screenshots = await analyzer.captureElementScreenshots(result.elements);
  
  for (const [uid, screenshot] of screenshots) {
    const element = result.elements.find(e => e.uid === uid);
    if (element) {
      const filename = `${outputDir}/element-${uid}-${element.accessibility.role}.png`;
      await fs.writeFile(filename, screenshot, 'base64');
    }
  }
  
  console.log(`Saved ${screenshots.size} element screenshots`);
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    url: page.url(),
    totalElements: result.elements.length,
    elements: result.elements.map(el => ({
      uid: el.uid,
      role: el.accessibility.role,
      text: el.visual.visibleText.slice(0, 50),
      selector: el.selector,
      position: el.boundingBox
    }))
  };
  
  await fs.writeFile(
    `${outputDir}/report.json`,
    JSON.stringify(report, null, 2)
  );
  
  console.log('Debug report generated');
}
```

## Example 7: Accessibility Audit

```typescript
async function auditAccessibility(page: Page) {
  const locator = new ElementLocator(page);
  const analyzer = new VisualElementAnalyzer(page, {
    includeColors: true
  });
  
  const result = await locator.findElementsByDescription('');
  const visualProps = await analyzer.analyzeElements(result.elements);
  
  const issues: string[] = [];
  
  // Check for buttons without labels
  result.elements.forEach(el => {
    if (el.accessibility.role === 'button') {
      if (!el.accessibility.name && !el.visual.visibleText) {
        issues.push(`Button without label: ${el.selector}`);
      }
    }
  });
  
  // Check for inputs without labels
  result.elements.forEach(el => {
    const role = el.accessibility.role;
    if (role === 'textbox' || role === 'input') {
      if (!el.accessibility.name) {
        issues.push(`Input without label: ${el.selector}`);
      }
    }
  });
  
  // Check for low contrast text
  visualProps.forEach((props, uid) => {
    if (props.category === 'text' && props.fontSize < 14) {
      issues.push(`Small text (${props.fontSize}px): uid ${uid}`);
    }
  });
  
  // Check for non-interactive elements with pointer cursor
  visualProps.forEach((props, uid) => {
    const element = result.elements.find(e => e.uid === uid);
    if (element && !props.isInteractive) {
      // Would need to check cursor style from element
    }
  });
  
  // Report issues
  if (issues.length === 0) {
    console.log('✅ No accessibility issues found');
  } else {
    console.log(`⚠️ Found ${issues.length} accessibility issues:`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  return issues;
}
```

## Running Examples

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run examples (you'll need to create a runner script)
node examples/run-example.js login
node examples/run-example.js analyze
node examples/run-example.js audit
```

## Integration with MCP

These examples can be adapted to work with MCP tools:

```json
{
  "tool": "find_element_by_description",
  "arguments": {
    "description": "login button",
    "maxResults": 1,
    "minConfidence": 0.6
  }
}
```

Then use the returned `uid` with `interact_with_element`:

```json
{
  "tool": "interact_with_element",
  "arguments": {
    "uid": "element-42",
    "action": "click"
  }
}
```

## Tips for Writing Descriptions

1. **Be specific**: "blue submit button" > "button"
2. **Include context**: "email input in login form" > "email input"
3. **Use visual cues**: "red error message" > "error message"
4. **Mention position**: "navigation menu at top" > "navigation menu"
5. **Include text**: "button with text 'Sign Up'" > "signup button"

## Common Patterns

### Retry with Lower Confidence
```typescript
async function findWithRetry(description: string, page: Page) {
  const confidenceLevels = [0.8, 0.6, 0.4, 0.2];
  
  for (const confidence of confidenceLevels) {
    const locator = new ElementLocator(page, { minConfidence: confidence });
    const result = await locator.findElementsByDescription(description);
    
    if (result.elements.length > 0) {
      console.log(`Found with confidence ${confidence}`);
      return result.elements[0];
    }
  }
  
  throw new Error(`Element not found: ${description}`);
}
```

### Wait for Element
```typescript
async function waitForElement(description: string, page: Page, timeout = 5000) {
  const start = Date.now();
  const locator = new ElementLocator(page);
  
  while (Date.now() - start < timeout) {
    const result = await locator.findElementsByDescription(description);
    if (result.elements.length > 0) {
      return result.elements[0];
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Timeout waiting for: ${description}`);
}
```
