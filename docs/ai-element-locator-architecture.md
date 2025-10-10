# AI Element Locator - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client Layer                         │
│              (Claude, Gemini, Copilot, etc.)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ MCP Tools API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Tools                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │find_element_by   │  │analyze_screenshot│  │interact_with │ │
│  │_description      │  │_with_ai          │  │_element      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│  ┌──────────────────┐                                          │
│  │find_and_click    │                                          │
│  └──────────────────┘                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Framework API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI Element Locator Framework                  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              ElementLocator (Core)                        │ │
│  │  • findElementsByDescription()                           │ │
│  │  • captureScreenshot()                                   │ │
│  │  • extractElementsWithVisualData()                      │ │
│  │  • matchElementsByDescription()                         │ │
│  │  • annotateScreenshot()                                 │ │
│  │  • getElementHandle()                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         VisualElementAnalyzer                            │ │
│  │  • analyzeElements()                                     │ │
│  │  • detectElementGroups()                                │ │
│  │  • highlightElements()                                  │ │
│  │  • captureElementScreenshots()                         │ │
│  │  • getElementViewportPosition()                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         ElementCoordinateMapper                          │ │
│  │  • getElementAtPoint()                                   │ │
│  │  • getElementsInRegion()                                │ │
│  │  • getNearestElement()                                  │ │
│  │  • getElementRelationships()                           │ │
│  │  • getElementsAlongPath()                              │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Puppeteer API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Chrome Browser                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   DOM API    │  │ CDP Protocol │  │ Accessibility API    │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Element Finding Flow

```
User Query: "blue submit button"
        │
        ▼
┌─────────────────────────────────────────────────────┐
│ find_element_by_description(description, config)    │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   Capture Page Screenshot       │
        │   (PNG/JPEG/WebP)               │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Extract Elements with Visual Data│
        │ • DOM Query (interactive els)   │
        │ • Bounding boxes                │
        │ • CSS Selectors                 │
        │ • XPath                         │
        │ • Accessibility info            │
        │ • Visible text                  │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  Match Elements by Description   │
        │  • Text matching                │
        │  • Accessibility name matching  │
        │  • Role matching                │
        │  • Attribute matching           │
        │  • Calculate confidence scores  │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │    Sort by Confidence            │
        │    Filter by minConfidence       │
        │    Limit to maxResults           │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  Annotate Screenshot (optional)  │
        │  • Draw bounding boxes          │
        │  • Add element labels           │
        │  • Show confidence scores       │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │   Return ElementSearchResult     │
        │   • Matched elements            │
        │   • Annotated screenshot        │
        │   • Metadata                    │
        └──────────────────────────────────┘
```

### 2. Visual Analysis Flow

```
Elements List
    │
    ▼
┌──────────────────────────────────────┐
│  VisualElementAnalyzer.analyzeElements│
└───────────────┬──────────────────────┘
                │
                ▼
    ┌───────────────────────────────┐
    │  For Each Element:           │
    │  • Query DOM element         │
    │  • Get computed styles       │
    │  • Extract colors            │
    │  • Extract fonts             │
    │  • Determine category        │
    │  • Check interactivity       │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Return Visual Properties Map │
    │  uid -> ElementVisualProperties│
    └───────────────────────────────┘
```

### 3. Coordinate Mapping Flow

```
Query Point (x, y)
    │
    ▼
┌──────────────────────────────────────┐
│ ElementCoordinateMapper.getElementAtPoint│
└───────────────┬──────────────────────┘
                │
                ▼
    ┌───────────────────────────────┐
    │  For Each Cached Element:    │
    │  • Check if point inside     │
    │  • Calculate distance        │
    │  • Build CoordinateMatch     │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Filter elements containing   │
    │  the point                    │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Sort by element area         │
    │  (smallest = most specific)   │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Return best match            │
    └───────────────────────────────┘
```

## Element Data Structure

```
LocatedElement {
  uid: "element-42"
  
  boundingBox: {
    x: 100,
    y: 200,
    width: 120,
    height: 40
  }
  
  selector: "button.submit-btn"
  xpath: "//button[@class='submit-btn']"
  
  accessibility: {
    role: "button",
    name: "Submit Form"
  }
  
  visual: {
    visibleText: "Submit Form",
    isVisible: true,
    confidence: 0.85,
    regionScreenshot?: "base64..."
  }
  
  attributes: {
    type: "submit",
    class: "submit-btn",
    id: "submit"
  }
  
  parentContext: "form"
}
```

## Confidence Scoring Algorithm

```
Confidence = (TextMatch * 3 + NameMatch * 2 + RoleMatch + AttrMatch) 
             / (Keywords * 3)

Where:
  TextMatch = # keywords in visible text
  NameMatch = # keywords in accessibility name
  RoleMatch = 1 if role matches, 0 otherwise
  AttrMatch = # keywords in attributes
  Keywords = # keywords in query

Example:
  Query: "blue submit button"
  Element: <button class="blue-btn">Submit Form</button>
  
  Keywords: ["blue", "submit", "button"]
  TextMatch: 1 ("submit" in "Submit Form")
  NameMatch: 1 ("submit" in name)
  RoleMatch: 1 ("button" matches role)
  AttrMatch: 1 ("blue" in class)
  
  Confidence = (1*3 + 1*2 + 1 + 1) / (3*3) = 7/9 = 0.78
```

## Integration Points for AI Services

```
┌─────────────────────────────────────────────────────────┐
│         AI Integration Points                           │
└─────────────────────────────────────────────────────────┘

1. Vision APIs (Future)
   ├── Screenshot → GPT-4 Vision
   ├── Screenshot → Claude Vision
   ├── Screenshot → Gemini Vision
   └── Returns: Element descriptions, locations

2. Language Models (Future)
   ├── Query → LLM for understanding
   ├── LLM → Refined search terms
   └── Returns: Better match criteria

3. Custom ML Models (Future)
   ├── Screenshots → Trained model
   ├── Model → Element classifications
   └── Returns: High-confidence matches

Current Implementation:
   └── Rule-based text/attribute matching
       (Foundation for AI integration)
```

## Performance Characteristics

```
Operation                    Time      Notes
─────────────────────────────────────────────────────────
captureScreenshot()         ~50ms     Viewport only
captureScreenshot(fullPage) ~200ms    Full page
extractElements()           ~100ms    10-50 elements
extractElements()           ~300ms    100+ elements
matchByDescription()        ~10ms     Simple matching
annotateScreenshot()        ~150ms    Canvas operations
getElementHandle()          ~20ms     DOM query
highlightElements()         ~50ms     Style injection

Total: find_element_by_description
  Without annotation:       ~180ms
  With annotation:          ~350ms
  With element screenshots: ~500ms+
```

## Error Handling Strategy

```
┌─────────────────────────────────────────┐
│ Error Type        │ Handling            │
├───────────────────┼─────────────────────┤
│ No elements found │ Return empty array  │
│ Element removed   │ Return null handle  │
│ Invalid selector  │ Try XPath fallback  │
│ Page navigation   │ Clear cache         │
│ Timeout           │ Throw error         │
│ Screenshot fail   │ Continue without    │
└─────────────────────────────────────────┘
```

## Caching Strategy

```
ElementCoordinateMapper Cache:
├── TTL: 5 seconds
├── Invalidation: Manual or automatic
├── Size: All elements from last query
└── Use case: Multiple spatial queries

No caching in:
├── ElementLocator (always fresh)
└── VisualElementAnalyzer (always fresh)
```

## Thread Safety

```
All operations are async and non-blocking
No shared mutable state across instances
Each instance has its own configuration
Safe for concurrent use with different pages
```

---

This architecture provides a solid foundation for AI-powered element detection while maintaining:
- **Modularity**: Each component has clear responsibilities
- **Extensibility**: Easy to add AI integrations
- **Performance**: Optimized for common operations
- **Reliability**: Graceful error handling
- **Testability**: Isolated components
