import type { Contact, StorageShape } from '../types/schema';

console.log("Close Extractor: Content script loaded");

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


const scrapeContacts = (): Contact[] => {
  const contacts: Contact[] = [];
  const rows = document.querySelectorAll('tbody tr[class*="DataTable_row_"]');
  const colIndices = getColumnIndices();

  console.log(`[Extractor] Found ${rows.length} rows.`);

  rows.forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) return;

    const leadCell = cells[colIndices.leadName];
    const leadName = leadCell?.querySelector('a')?.textContent?.trim() || leadCell?.textContent?.trim() || "Unknown Lead";

    const contactCell = cells[colIndices.contactName];
    const contactName = contactCell?.textContent?.trim() || "Unknown Contact";

    const emailLinks = Array.from(row.querySelectorAll('a[href^="mailto:"]'));
    const emails = emailLinks
      .map(a => a.getAttribute('href')?.replace('mailto:', '').trim())
      .filter((e): e is string => !!e && e.length > 0);

    const phoneLinks = Array.from(row.querySelectorAll('a[href^="tel:"]'));
    const phones = phoneLinks
      .map(a => a.getAttribute('href')?.replace('tel:', '').trim())
      .filter((p): p is string => !!p && p.length > 0);

    const id = emails.length > 0 
      ? emails[0] 
      : btoa(`${leadName}-${contactName}`).replace(/=/g, '').substring(0, 16);

    if (leadName !== "Unknown Lead" || contactName !== "Unknown Contact") {
      contacts.push({ id, name: contactName, lead: leadName, emails, phones });
    }
  });

  return contacts;
};


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("senderid:", sender.id);
  if (message.type === 'EXTRACT_DATA') {
    const url = window.location.href;
    let newContacts: Contact[] = [];
    let messageText = "";

    if (url.includes('/leads') || url.includes('search')) {
      try {
        newContacts = scrapeContacts();
        messageText = `Extracted ${newContacts.length} contacts.`;
      } catch (e) {
        console.error(e);
        messageText = "Extraction error.";
      }
    } else {
      newContacts = scrapeContacts();
      messageText = `Extracted ${newContacts.length} items (Generic).`;
    }

    chrome.storage.local.get('close_data', (result) => {
      // Explicit cast to fix TS error
      const raw = result.close_data;
      const currentData: StorageShape = (raw as StorageShape) || { 
        contacts: {}, opportunities: {}, tasks: {}, lastSync: 0 
      };

      newContacts.forEach(c => currentData.contacts[c.id] = c);
      currentData.lastSync = Date.now();

      chrome.storage.local.set({ 'close_data': currentData }, () => {
        sendResponse({ success: true, message: messageText, count: newContacts.length });
      });
    });

    return true; 
  }
});