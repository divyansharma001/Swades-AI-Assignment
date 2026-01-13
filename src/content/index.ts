import type { Contact, Opportunity, Task, StorageShape } from '../types/schema';

console.log("Close Extractor: Content script loaded");

// --- Helper: Sleep ---
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// --- Helper: Column Index Finder ---
const getColumnIndices = () => {
  const headers = Array.from(document.querySelectorAll('thead th'));
  const indices: Record<string, number> = { leadName: 0, contactName: 3 }; 
  headers.forEach((th, index) => {
    const text = th.textContent?.trim().toLowerCase() || "";
    if (text === "name") indices.leadName = index;
    if (text === "contacts") indices.contactName = index;
    if (text === "status") indices.status = index;
  });
  return indices;
};

// --- Scraper: Contacts ---
const scrapeContacts = (): Contact[] => {
  const contacts: Contact[] = [];
  const rows = document.querySelectorAll('tbody tr[class*="DataTable_row_"]');
  const colIndices = getColumnIndices();

  rows.forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) return;

    const leadCell = cells[colIndices.leadName];
    const leadName = leadCell?.querySelector('a')?.textContent?.trim() || leadCell?.textContent?.trim() || "Unknown Lead";
    const contactCell = cells[colIndices.contactName];
    const contactName = contactCell?.textContent?.trim() || "Unknown Contact";

    const emailLinks = Array.from(row.querySelectorAll('a[href^="mailto:"]'));
    const emails = emailLinks.map(a => a.getAttribute('href')?.replace('mailto:', '').trim()).filter((e): e is string => !!e);

    const phoneLinks = Array.from(row.querySelectorAll('a[href^="tel:"]'));
    const phones = phoneLinks.map(a => a.getAttribute('href')?.replace('tel:', '').trim()).filter((p): p is string => !!p);

    const id = emails.length > 0 ? emails[0] : btoa(`${leadName}-${contactName}`).replace(/=/g, '').substring(0, 16);

    if (leadName !== "Unknown Lead" || contactName !== "Unknown Contact") {
      contacts.push({ id, name: contactName, lead: leadName, emails, phones });
    }
  });
  return contacts;
};

// --- Scraper: Opportunities ---
const scrapeOpportunities = (): Opportunity[] => {
  const opps: Opportunity[] = [];
  const columns = document.querySelectorAll('[class*="Table_Column_list_"]');
  
  columns.forEach((col) => {
    if (!(col instanceof HTMLElement)) return;
    const statusHeader = col.parentElement?.querySelector('[class*="Table_ColumnHeader_header_"]');
    const statusText = statusHeader?.textContent?.trim() || "Pipeline Stage"; 
    const status = statusText.split('\n')[0].replace(/\d+ OPPORTUNITIES/i, '').trim();

    const cards = col.querySelectorAll('[class*="OpportunityCard_card_"]');
    cards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const link = card.querySelector('a[class*="OpportunityCard_leadLink_"]');
      const name = link?.textContent?.trim() || "Unknown Opportunity";
      const valueSpan = card.querySelector('[class*="OpportunityCard_valueText_"]');
      const value = valueSpan?.textContent?.trim() || "$0";
      const closeSpan = card.querySelector('[class*="OpportunityCard_closeText_"]');
      const closeTextRaw = closeSpan?.textContent?.trim() || "";
      const closeDateParts = closeTextRaw.split(' on ');
      const closeDate = closeDateParts.length > 1 ? closeDateParts[1].trim() : closeTextRaw;
      const id = btoa(`${name}-${value}-${closeDate}`).replace(/=/g, '').substring(0, 16);

      opps.push({ id, name, value, status, closeDate });
    });
  });
  return opps;
};

// --- Scraper: Tasks (Fluid & Compact) ---
const scrapeTasks = (): Task[] => {
  const tasks: Task[] = [];
  
  // Selector for the generic row wrapper (works for Fluid and Compact based on naming convention)
  // We match any class that has "CollapsedItemLayout" AND "afterCheckboxWrapper"
  const rows = document.querySelectorAll('div[class*="CollapsedItemLayout_"][class*="afterCheckboxWrapper"]');

  console.log(`[Extractor] Scanning Tasks (Fluid/Compact): Found ${rows.length} rows.`);

  rows.forEach((row) => {
    if (!(row instanceof HTMLElement)) return;

    // 1. Description
    // Fluid: div[class*="CollapsedItemLayout_fluid_title_"]
    // Compact: div[class*="CollapsedItemLayout_compact_titleWrapper_"]
    const titleEl = row.querySelector('[class*="_title_"], [class*="_titleWrapper_"]');
    // For Fluid, the text is direct. For Compact, it might be nested, but textContent handles both.
    // We clean it by taking the first line to avoid grabbing secondary titles if they are nested.
    const rawDesc = titleEl?.textContent?.trim() || "No Description";
    const description = rawDesc.split('\n')[0].trim();

    // 2. Lead Name
    // Look for link to lead inside the row info wrapper
    const leadLink = row.querySelector('a[href*="/lead/"]');
    const leadName = leadLink?.textContent?.trim() || "";
    
    // 3. Due Date
    const timeEl = row.querySelector('time');
    const dueDate = timeEl?.getAttribute('datetime')?.split('T')[0] || timeEl?.textContent?.trim() || "No Date";

    // Format for ID
    const fullDescription = leadName ? `${description} (${leadName})` : description;
    const id = btoa(fullDescription + dueDate).replace(/=/g, '').substring(0, 16);

    tasks.push({
      id,
      description: fullDescription,
      dueDate,
      assignee: "Me", 
      isComplete: false 
    });
  });
  return tasks;
};

// --- Main Handler ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(sender)
  if (message.type === 'EXTRACT_DATA') {
    const url = window.location.href;
    console.log("[Extractor] Triggered on:", url);

    const performExtraction = async () => {
      let newContacts: Contact[] = [];
      let newOpps: Opportunity[] = [];
      let newTasks: Task[] = [];
      let attempt = 0;
      let totalCount = 0;

      // Retry loop (wait for lazy loading)
      while (attempt < 5 && totalCount === 0) {
        if (attempt > 0) await sleep(500);

        if (url.includes('/leads') || url.includes('search')) {
           newContacts = scrapeContacts();
        } else if (url.includes('/opportunities')) {
           newOpps = scrapeOpportunities();
        } else if (url.includes('/tasks') || url.includes('/inbox')) {
           newTasks = scrapeTasks();
        } else {
           // Fallback / Dashboard
           newContacts = scrapeContacts();
           if (document.querySelector('[class*="OpportunityCard_card_"]')) newOpps = scrapeOpportunities();
           if (document.querySelector('[class*="CollapsedItemLayout_"]')) newTasks = scrapeTasks();
        }

        totalCount = newContacts.length + newOpps.length + newTasks.length;
        attempt++;
      }

      // Save
      chrome.storage.local.get('close_data', (result) => {
        const raw = result.close_data;
        const currentData: StorageShape = (raw as StorageShape) || { 
          contacts: {}, opportunities: {}, tasks: {}, lastSync: 0 
        };

        newContacts.forEach(c => currentData.contacts[c.id] = c);
        newOpps.forEach(o => currentData.opportunities[o.id] = o);
        newTasks.forEach(t => currentData.tasks[t.id] = t);
        
        currentData.lastSync = Date.now();

        console.log("[Extractor] Saving data:", currentData);

        chrome.storage.local.set({ 'close_data': currentData }, () => {
          console.log(`[Extractor] Saved. Count: ${totalCount}`);
          sendResponse({ 
            success: true, 
            message: totalCount > 0 ? `Successfully extracted ${totalCount} items.` : "No items found. Try scrolling?",
            count: totalCount
          });
        });
      });
    };

    performExtraction();
    return true; // Async
  }
});