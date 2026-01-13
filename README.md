# Close CRM Extractor - Chrome Extension

A Chrome extension that extracts Contacts, Opportunities, and Tasks from Close CRM, stores them locally, and displays them in a popup dashboard.

## Features

✅ **Data Extraction** - Automatically scrape Contacts, Opportunities, and Tasks from Close.com  
✅ **Local Storage** - All data stored securely in Chrome's local storage  
✅ **Live Dashboard** - View, search, and manage extracted data  
✅ **Real-time Sync** - Changes automatically sync across all tabs  
✅ **Status Indicators** - Shadow DOM extraction status overlay  
✅ **Data Export** - Export data as JSON or CSV  
✅ **Pagination Support** - Auto-scroll to load all items  
✅ **Error Handling** - Graceful error recovery and retry logic  

## Installation

### From Source

1. Clone the repository
   ```bash
   git clone <repo-url>
   cd close-extractor
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the extension
   ```bash
   npm run build
   ```

4. Load in Chrome
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

### Extract Data

1. Navigate to any Close.com page (Leads, Opportunities, Tasks, or Dashboard)
2. Click the "Close Extractor" extension icon
3. Click "Add Lead" to trigger extraction
4. Wait for the green success indicator to appear

### View Data

- **Overview**: Summary dashboard with charts and recent leads
- **Contacts**: Full list of extracted contacts with emails, phones, companies
- **Opportunities**: Pipeline opportunities with values, status, close dates
- **Tasks**: Task items with descriptions, due dates, and completion status

### Search & Filter

Use the search bar to filter across all visible data in real-time.

### Delete Records

Hover over any row and click the trash icon to delete that record.

### Export Data

Click the export icons in the header to download data:
- 📄 **JSON**: Full structured data export
- 📊 **CSV**: Spreadsheet-compatible format (all tables)

### Clear All

Click "Clear All" in the sidebar to remove all stored data.

## Storage Schema

Data is stored in `chrome.storage.local` under the key `close_data`:

```typescript
{
  "contacts": {
    "[email]": {
      "id": "email",
      "name": "Person Name",
      "lead": "Company Name",
      "emails": ["person@company.com"],
      "phones": ["+1234567890"]
    }
  },
  "opportunities": {
    "[id]": {
      "id": "unique-id",
      "name": "Opportunity Name",
      "value": "$50,000",
      "status": "Pipeline Stage",
      "closeDate": "dd/mm/yyyy"
    }
  },
  "tasks": {
    "[id]": {
      "id": "unique-id",
      "description": "Task description",
      "dueDate": "yyyy-mm-dd",
      "assignee": "Me",
      "isComplete": false
    }
  },
  "lastSync": 1234567890
}
```

### Deduplication & Updates

- **Contacts**: Keyed by email (primary identifier)
- **Opportunities**: Keyed by generated ID (name + value + date hash)
- **Tasks**: Keyed by generated ID (description + dueDate hash)
- When re-extracting, new data merges with existing; duplicates update in-place

### Race Condition Handling

- Background service worker tracks extraction state per tab
- Only one extraction per tab allowed simultaneously
- Storage changes broadcast to all tabs via `chrome.storage.onChanged`
- Prevents conflicts when multiple tabs extract at the same time

## DOM Selection Strategy

### CSS Selectors vs XPath

We use **CSS selectors** for robustness over XPath:
- More stable across DOM refactors
- Faster evaluation
- Easier to maintain and test

### View Detection

The extension detects the current Close.com view by URL:
- **Leads/Contacts**: `/leads` or `/search` → Scrape contact list table
- **Opportunities**: `/opportunities` → Scrape opportunity cards
- **Tasks/Inbox**: `/tasks` or `/inbox` → Scrape task rows
- **Dashboard**: Fallback scrapes all three if elements are present

### Lazy-Load & Pagination Handling

Close uses infinite scroll and pagination. The extractor:

1. **Auto-scrolls** the list container to trigger lazy loading
2. **Waits** 300ms between scrolls for content to render
3. **Repeats** up to 10 times until no new items load (height stable)
4. **Retries** extraction up to 5 times in case elements are still loading

```typescript
// Example: scrollToLoadAll() function
while (newHeight !== lastHeight && attempts < 10) {
  container.scrollTop = newHeight;
  await sleep(300);
  // Check if scrollHeight increased
}
```

### DOM Change Detection

A MutationObserver monitors the DOM for newly added items and can trigger automatic re-extraction when lazy-loaded content is detected.

### Selectors by Data Type

#### Contacts (List View)
```
thead th                          // Column headers
tbody tr[class*="DataTable_row_"] // Data rows
td a[href^="mailto:"]             // Email links
td a[href^="tel:"]                // Phone links
```

#### Opportunities (Pipeline/Kanban)
```
[class*="OpportunityCard_card_"]     // Card container
.OpportunityCard_leadLink_            // Lead/opportunity name
.OpportunityCard_valueText_           // Dollar value
.OpportunityCard_closeText_           // Close date
[class*="Table_ColumnHeader_"]        // Pipeline stage header
```

#### Tasks (Inbox)
```
div[class*="CollapsedItemLayout_"]    // Task row container
[class*="CollapsedItemLayout_compact_ellipsis"] // Task title
a[href*="/lead/"]                     // Lead link
time                                  // Due date (datetime attribute)
[class*="DateAndAssignee_dateWrapper"] // Date wrapper
```

## Architecture

### Manifest V3 Structure

```
manifest.json           // Extension configuration
├── background/
│   └── index.ts       // Service worker (message routing, state management)
├── content/
│   └── index.ts       // Content script (DOM scraping, storage)
└── src/
    ├── App.tsx        // Popup React app
    ├── components/    // UI components
    ├── utils/
    │   ├── storage.ts // Storage helpers
    │   └── export.ts  // Export utilities
    └── types/
        └── schema.ts  // TypeScript interfaces
```

### Message Flow

```
Content Script (Close.com) 
    ↓ chrome.runtime.sendMessage("EXTRACT_DATA")
    ↓
Background Service Worker (tracks state, prevents races)
    ↓
Content Script (scrapes DOM, saves to chrome.storage.local)
    ↓
Popup App (listens to chrome.storage.onChanged, auto-refresh)
```

## Configuration

No configuration needed. The extension works out of the box on all Close.com URLs.

### Environment

- Requires Chrome 88+
- Manifest V3 only
- No external API keys needed

## Troubleshooting

### No data extracted?

1. Make sure you're on close.com in a logged-in session
2. Try scrolling the list first to ensure content is visible
3. Check browser console (`F12` → Console) for error messages
4. Try clicking "Add Lead" again; retries up to 5 times

### Charts empty?

- Charts require **Opportunities** data
- Make sure you've extracted from the Opportunities section
- Opportunities must have valid close dates in `dd/mm/yyyy` format

### Data not syncing across tabs?

- Background service worker must be active
- Check `chrome://extensions/` → Details → "Service Worker" status
- Try reloading the extension (toggle off/on)

### Export not working?

- Make sure you have at least one contact extracted
- Check browser console for download errors
- Verify popup has permission to create files

## Development

### Build

```bash
npm run build
```

### Dev Mode (with HMR)

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

## Performance Considerations

- Storage operations are async; UI responds immediately
- DOM scraping retries with exponential backoff
- MutationObserver uses debouncing to avoid excessive triggers
- Shadow DOM isolation prevents style conflicts
- Message passing between service worker and tabs is optimized

## Security

- No external APIs called; all data stays local
- No credentials stored; uses logged-in session only
- Storage isolated per browser/profile
- Shadow DOM prevents script injection
- Content Security Policy enforced

## License

MIT

## Support

For issues, check:
1. Browser console for errors
2. `chrome://extensions/` service worker logs
3. Ensure you're on a valid Close.com page with data visible
