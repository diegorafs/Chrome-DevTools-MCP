# 🚀 Production-Ready Examples - Web App Automation

> **Real-world examples for automating different types of web applications**

This file contains battle-tested patterns for automating various web applications using the AI Element Locator framework.

---

## 📋 Table of Contents

1. [E-Commerce Automation](#e-commerce-automation)
2. [SaaS Application Testing](#saas-application-testing)
3. [Form-Heavy Applications](#form-heavy-applications)
4. [Social Media Automation](#social-media-automation)
5. [Admin Dashboards](#admin-dashboards)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Performance Optimization](#performance-optimization)
8. [Multi-Page Workflows](#multi-page-workflows)

---

## E-Commerce Automation

### Complete Product Purchase Flow

```typescript
import {ElementLocator} from './ai-element-locator';

async function purchaseProduct(page, productName: string, quantity: number = 1) {
  const locator = new ElementLocator(page, {
    maxResults: 3,
    minConfidence: 0.6,
    annotateScreenshot: false, // Faster without annotations
  });

  try {
    // 1. Search for product
    console.log(`Searching for: ${productName}`);
    const searchBox = await locator.findAndInteract(
      'search input at top',
      'click'
    );
    
    await locator.interactWithElement(searchBox.uid, 'type', {
      text: productName,
      delay: 50,
    });

    // Wait for search to execute (press Enter)
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle', {timeout: 5000}).catch(() => {});

    // 2. Click on first product
    console.log('Selecting first product');
    await locator.findAndInteract('first product link', 'click');
    await page.waitForLoadState('networkidle', {timeout: 5000}).catch(() => {});

    // 3. Select quantity if needed
    if (quantity > 1) {
      console.log(`Setting quantity to ${quantity}`);
      const qtyInput = await locator.findAndInteract('quantity input', 'click');
      await locator.interactWithElement(qtyInput.uid, 'type', {
        text: quantity.toString(),
      });
    }

    // 4. Add to cart
    console.log('Adding to cart');
    await locator.findAndInteract('add to cart button', 'click');
    
    // Wait for cart confirmation
    await locator.waitForElement('view cart button', 3000).catch(() => {
      console.warn('Cart confirmation not shown');
    });

    // 5. Go to cart
    console.log('Going to cart');
    await locator.findAndInteract('cart icon', 'click');
    await page.waitForLoadState('networkidle', {timeout: 5000}).catch(() => {});

    // 6. Proceed to checkout
    console.log('Proceeding to checkout');
    await locator.findAndInteract('checkout button', 'click');
    await page.waitForLoadState('networkidle', {timeout: 5000}).catch(() => {});

    console.log('✅ Product purchase flow completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Purchase flow failed:', error);
    throw error;
  }
}
```

### Product Comparison

```typescript
async function compareProducts(page, product1: string, product2: string) {
  const locator = new ElementLocator(page, {
    outputFormat: 'minimal',
    minConfidence: 0.5,
  });

  const results = [];

  for (const productName of [product1, product2]) {
    // Search and navigate to product
    await locator.findAndInteract('search box', 'type', {text: productName});
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    await locator.findAndInteract('first product', 'click');
    await page.waitForLoadState('networkidle', {timeout: 3000}).catch(() => {});

    // Extract product information
    const priceElement = await locator.findElementsByDescription('product price');
    const ratingElement = await locator.findElementsByDescription('product rating');
    
    results.push({
      name: productName,
      price: priceElement.elements[0]?.visual.visibleText || 'N/A',
      rating: ratingElement.elements[0]?.visual.visibleText || 'N/A',
    });

    // Go back
    await page.goBack();
    await page.waitForTimeout(500);
  }

  return results;
}
```

---

## SaaS Application Testing

### Login and Dashboard Navigation

```typescript
async function loginToSaaS(page, email: string, password: string) {
  const locator = new ElementLocator(page, {
    minConfidence: 0.7,
    maxResults: 5,
  });

  try {
    // 1. Navigate to login page (if not already there)
    const hasLoginButton = await locator.elementExists('login button');
    if (hasLoginButton) {
      await locator.findAndInteract('login button', 'click');
      await page.waitForLoadState('networkidle', {timeout: 3000}).catch(() => {});
    }

    // 2. Fill email
    console.log('Entering email');
    const emailInput = await locator.findAndInteract(
      'email input in login form',
      'click'
    );
    await locator.interactWithElement(emailInput.uid, 'type', {text: email});

    // 3. Fill password
    console.log('Entering password');
    const passwordInput = await locator.findAndInteract(
      'password input',
      'click'
    );
    await locator.interactWithElement(passwordInput.uid, 'type', {text: password});

    // 4. Submit
    console.log('Logging in');
    await locator.findAndInteract('login button', 'click');
    
    // 5. Wait for dashboard
    await locator.waitForElement('dashboard', 10000);
    
    console.log('✅ Login successful');
    return true;

  } catch (error) {
    console.error('❌ Login failed:', error);
    
    // Check for error messages
    const errorExists = await locator.elementExists('error message');
    if (errorExists) {
      const errorResult = await locator.findElementsByDescription('error message');
      console.error('Error message:', errorResult.elements[0]?.visual.visibleText);
    }
    
    throw error;
  }
}

### Navigate SaaS Menu

```typescript
async function navigateToSection(page, sectionName: string) {
  const locator = new ElementLocator(page);

  // Open menu if collapsed
  const hasHamburger = await locator.elementExists('menu button');
  if (hasHamburger) {
    await locator.findAndInteract('menu button', 'click');
    await page.waitForTimeout(300);
  }

  // Click on section
  await locator.findAndInteract(`${sectionName} link in navigation`, 'click');
  await page.waitForLoadState('networkidle', {timeout: 5000}).catch(() => {});
}
```

---

## Form-Heavy Applications

### Multi-Step Form Filling

```typescript
interface FormData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  preferences: {
    newsletter: boolean;
    notifications: boolean;
  };
}

async function fillMultiStepForm(page, data: FormData) {
  const locator = new ElementLocator(page, {
    minConfidence: 0.6,
    outputFormat: 'minimal',
  });

  // Step 1: Personal Information
  console.log('📝 Step 1: Personal Information');
  await fillFormFields(locator, {
    'first name input': data.personalInfo.firstName,
    'last name input': data.personalInfo.lastName,
    'email input': data.personalInfo.email,
    'phone input': data.personalInfo.phone,
  });
  
  await locator.findAndInteract('next button', 'click');
  await page.waitForTimeout(500);

  // Step 2: Address
  console.log('📝 Step 2: Address');
  await fillFormFields(locator, {
    'street address input': data.address.street,
    'city input': data.address.city,
    'state input': data.address.state,
    'zip code input': data.address.zip,
  });

  await locator.findAndInteract('next button', 'click');
  await page.waitForTimeout(500);

  // Step 3: Preferences
  console.log('📝 Step 3: Preferences');
  if (data.preferences.newsletter) {
    await locator.findAndInteract('newsletter checkbox', 'click');
  }
  if (data.preferences.notifications) {
    await locator.findAndInteract('notifications checkbox', 'click');
  }

  // Submit
  await locator.findAndInteract('submit button', 'click');
  
  // Wait for confirmation
  await locator.waitForElement('confirmation message', 5000);
  console.log('✅ Form submitted successfully');
}

// Helper function to fill multiple fields
async function fillFormFields(
  locator: ElementLocator,
  fields: Record<string, string>
) {
  for (const [description, value] of Object.entries(fields)) {
    try {
      const element = await locator.findAndInteract(description, 'click');
      await locator.interactWithElement(element.uid, 'type', {
        text: value,
        delay: 30,
      });
    } catch (error) {
      console.warn(`Could not fill field "${description}":`, error);
      // Continue with other fields
    }
  }
}
```

### Dynamic Form with Conditional Fields

```typescript
async function fillDynamicForm(page, formType: 'business' | 'personal') {
  const locator = new ElementLocator(page);

  // Select form type
  await locator.findAndInteract(`${formType} option`, 'click');
  await page.waitForTimeout(500);

  // Fill common fields
  await fillFormFields(locator, {
    'name input': 'John Doe',
    'email input': 'john@example.com',
  });

  // Conditional fields based on form type
  if (formType === 'business') {
    await fillFormFields(locator, {
      'company name input': 'Acme Corp',
      'tax id input': '12-3456789',
    });
  }

  await locator.findAndInteract('submit button', 'click');
}
```

---

## Social Media Automation

### Post Creation and Publishing

```typescript
async function createSocialMediaPost(
  page,
  content: string,
  imageUrl?: string
) {
  const locator = new ElementLocator(page, {
    minConfidence: 0.6,
  });

  try {
    // 1. Click create post button
    console.log('Opening post composer');
    await locator.findAndInteract('create post button', 'click');
    await page.waitForTimeout(500);

    // 2. Enter content
    console.log('Writing post content');
    const textArea = await locator.findAndInteract('post text area', 'click');
    await locator.interactWithElement(textArea.uid, 'type', {
      text: content,
      delay: 20,
    });

    // 3. Add image if provided
    if (imageUrl) {
      console.log('Uploading image');
      const uploadButton = await locator.findElementsByDescription('upload image button');
      
      if (uploadButton.elements.length > 0) {
        // Handle file upload
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(imageUrl);
          await page.waitForTimeout(1000);
        }
      }
    }

    // 4. Publish
    console.log('Publishing post');
    await locator.findAndInteract('publish button', 'click');
    
    // 5. Wait for confirmation
    await locator.waitForElement('post published message', 5000);
    console.log('✅ Post published successfully');

    return true;

  } catch (error) {
    console.error('❌ Failed to create post:', error);
    throw error;
  }
}
```

---

## Admin Dashboards

### Data Table Management

```typescript
async function manageDataTable(
  page,
  actions: {
    search?: string;
    filter?: {column: string; value: string};
    sortBy?: string;
    editRow?: number;
  }
) {
  const locator = new ElementLocator(page);

  // Search
  if (actions.search) {
    console.log(`Searching for: ${actions.search}`);
    await locator.findAndInteract('table search input', 'type', {
      text: actions.search,
    });
    await page.waitForTimeout(1000);
  }

  // Filter
  if (actions.filter) {
    console.log(`Filtering by ${actions.filter.column}: ${actions.filter.value}`);
    await locator.findAndInteract(`${actions.filter.column} filter dropdown`, 'click');
    await page.waitForTimeout(300);
    await locator.findAndInteract(`${actions.filter.value} option`, 'click');
    await page.waitForTimeout(500);
  }

  // Sort
  if (actions.sortBy) {
    console.log(`Sorting by: ${actions.sortBy}`);
    await locator.findAndInteract(`${actions.sortBy} column header`, 'click');
    await page.waitForTimeout(500);
  }

  // Edit row
  if (actions.editRow) {
    console.log(`Editing row: ${actions.editRow}`);
    await locator.findAndInteract(`edit button in row ${actions.editRow}`, 'click');
    await page.waitForTimeout(500);
  }
}
```

---

## Error Handling Patterns

### Robust Error Handling with Retries

```typescript
async function robustAutomation(page, maxRetries: number = 3) {
  const locator = new ElementLocator(page);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);

      // Your automation logic here
      await locator.findAndInteract('submit button', 'click');
      
      // Check for success
      const success = await locator.elementExists('success message');
      if (success) {
        console.log('✅ Operation successful');
        return true;
      }

      // Check for errors
      const hasError = await locator.elementExists('error message');
      if (hasError) {
        const errorResult = await locator.findElementsByDescription('error message');
        const errorText = errorResult.elements[0]?.visual.visibleText || 'Unknown error';
        console.error(`Error: ${errorText}`);
        
        // Handle specific errors
        if (errorText.includes('timeout')) {
          console.log('Timeout error, retrying...');
          await page.waitForTimeout(2000);
          continue;
        }
        
        throw new Error(errorText);
      }

    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw new Error(`All ${maxRetries} attempts failed: ${error}`);
      }

      // Wait before retry with exponential backoff
      await page.waitForTimeout(1000 * attempt);
    }
  }
}
```

### Graceful Degradation

```typescript
async function automateWithFallbacks(page) {
  const locator = new ElementLocator(page);

  // Try primary method
  try {
    await locator.findAndInteract('submit button', 'click');
  } catch (error) {
    console.warn('Primary method failed, trying fallback');

    // Fallback 1: Try alternative description
    try {
      await locator.findAndInteract('confirm button', 'click');
    } catch (error2) {
      console.warn('Fallback 1 failed, trying fallback 2');

      // Fallback 2: Try by position
      try {
        await locator.findAndInteract('button at bottom right', 'click');
      } catch (error3) {
        console.warn('All methods failed, using keyboard shortcut');
        
        // Fallback 3: Keyboard shortcut
        await page.keyboard.press('Enter');
      }
    }
  }
}
```

---

## Performance Optimization

### Batch Operations

```typescript
async function batchProcessItems(page, items: string[]) {
  const locator = new ElementLocator(page, {
    outputFormat: 'minimal', // Minimize token usage
    annotateScreenshot: false, // Skip screenshots
    maxResults: 1, // Only get best match
  });

  console.log(`Processing ${items.length} items...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i + 1}/${items.length}] Processing: ${item}`);

    try {
      // Process item
      await locator.findAndInteract(`${item} checkbox`, 'click');
      
      // No need to wait between items
    } catch (error) {
      console.warn(`Failed to process ${item}:`, error);
      // Continue with next item
    }
  }

  // Submit batch
  await locator.findAndInteract('submit selected items button', 'click');
  console.log('✅ Batch processing complete');
}
```

### Caching Element Locations

```typescript
class CachedLocator {
  private cache: Map<string, string> = new Map();
  private locator: ElementLocator;

  constructor(page) {
    this.locator = new ElementLocator(page);
  }

  async findAndCache(description: string): Promise<string> {
    // Check cache first
    if (this.cache.has(description)) {
      const uid = this.cache.get(description)!;
      
      // Verify element still exists
      const handle = await this.locator.getElementHandle(uid);
      if (handle) {
        await handle.dispose();
        return uid;
      }
      
      // Element gone, remove from cache
      this.cache.delete(description);
    }

    // Find and cache
    const result = await this.locator.findElementsByDescription(description);
    if (result.elements.length > 0) {
      const uid = result.elements[0].uid;
      this.cache.set(description, uid);
      return uid;
    }

    throw new Error(`Element not found: ${description}`);
  }

  clearCache() {
    this.cache.clear();
  }
}
```

---

## Multi-Page Workflows

### Complete User Journey

```typescript
async function completeUserJourney(page) {
  const locator = new ElementLocator(page, {
    minConfidence: 0.6,
  });

  // Page 1: Home -> Login
  console.log('📄 Page 1: Navigating to login');
  await locator.findAndInteract('login link', 'click');
  await page.waitForLoadState('networkidle').catch(() => {});

  // Page 2: Login -> Dashboard
  console.log('📄 Page 2: Logging in');
  await fillFormFields(locator, {
    'email input': 'user@example.com',
    'password input': 'password123',
  });
  await locator.findAndInteract('login button', 'click');
  await locator.waitForElement('dashboard', 10000);

  // Page 3: Dashboard -> Settings
  console.log('📄 Page 3: Going to settings');
  await locator.findAndInteract('settings link', 'click');
  await page.waitForLoadState('networkidle').catch(() => {});

  // Page 4: Update Settings
  console.log('📄 Page 4: Updating settings');
  await locator.findAndInteract('notifications toggle', 'click');
  await locator.findAndInteract('save settings button', 'click');
  await locator.waitForElement('settings saved message', 5000);

  console.log('✅ User journey completed successfully');
}
```

---

## 🎯 Best Practices Summary

### DO ✅

1. **Use appropriate confidence thresholds**
   ```typescript
   // Login forms: high confidence
   new ElementLocator(page, {minConfidence: 0.7});
   
   // Dynamic content: lower confidence
   new ElementLocator(page, {minConfidence: 0.5});
   ```

2. **Handle errors gracefully**
   ```typescript
   try {
     await locator.findAndInteract('button', 'click');
   } catch (error) {
     console.warn('Primary action failed, trying fallback');
     // Fallback logic
   }
   ```

3. **Wait for page state**
   ```typescript
   await locator.findAndInteract('submit', 'click');
   await page.waitForLoadState('networkidle').catch(() => {});
   ```

4. **Use descriptive element descriptions**
   ```typescript
   // Good
   await locator.findAndInteract('blue submit button at bottom', 'click');
   
   // Better
   await locator.findAndInteract('submit button', 'click');
   ```

5. **Optimize for performance**
   ```typescript
   new ElementLocator(page, {
     outputFormat: 'minimal',
     annotateScreenshot: false,
     maxResults: 1,
   });
   ```

### DON'T ❌

1. **Don't use overly vague descriptions**
   ```typescript
   // Bad
   await locator.findAndInteract('button', 'click');
   
   // Good
   await locator.findAndInteract('submit button', 'click');
   ```

2. **Don't ignore errors**
   ```typescript
   // Bad
   await locator.findAndInteract('button', 'click').catch(() => {});
   
   // Good
   await locator.findAndInteract('button', 'click').catch((error) => {
     console.error('Button click failed:', error);
     throw error;
   });
   ```

3. **Don't skip page load waits**
   ```typescript
   // Bad
   await locator.findAndInteract('submit', 'click');
   await locator.findAndInteract('next button', 'click'); // Might not exist yet!
   
   // Good
   await locator.findAndInteract('submit', 'click');
   await page.waitForLoadState('networkidle').catch(() => {});
   await locator.findAndInteract('next button', 'click');
   ```

4. **Don't request unnecessary screenshots**
   ```typescript
   // Bad (slow and token-heavy)
   new ElementLocator(page, {annotateScreenshot: true});
   
   // Good (fast and efficient)
   new ElementLocator(page, {annotateScreenshot: false});
   ```

5. **Don't use high maxResults unnecessarily**
   ```typescript
   // Bad (slow and expensive)
   new ElementLocator(page, {maxResults: 50});
   
   // Good (fast and sufficient)
   new ElementLocator(page, {maxResults: 5});
   ```

---

## 🚀 Ready for Production

These examples are production-ready and can be adapted for:
- E-commerce sites (Amazon, eBay, Shopify)
- SaaS platforms (Salesforce, HubSpot, Jira)
- Social media (Twitter, LinkedIn, Facebook)
- Admin dashboards (custom applications)
- Form-heavy applications (surveys, registrations)
- Any modern web application

**Copy, adapt, and deploy with confidence!** 🎉
