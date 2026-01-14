
console.log("Background service worker initialized");

const extractionStates = new Map<number, boolean>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Message received:", message.type, "from tab:", sender.tab?.id);

  try {
    if (message.type === 'EXTRACT_STATUS') {
      const tabId = sender.tab?.id;
      const isExtracting = tabId ? extractionStates.get(tabId) ?? false : false;
      sendResponse({ isExtracting });
      return true;
    }

    if (message.type === 'EXTRACTION_STARTED') {
      const tabId = sender.tab?.id;
      if (tabId) {
        extractionStates.set(tabId, true);
        console.log(`[Background] Extraction started on tab ${tabId}`);
      }
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'EXTRACTION_COMPLETED') {
      const tabId = sender.tab?.id;
      if (tabId) {
        extractionStates.delete(tabId);
        console.log(`[Background] Extraction completed on tab ${tabId}. Count: ${message.count}`);
      }
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'CLEAR_DATA') {

      chrome.storage.local.remove('close_data', () => {
        console.log("[Background] Data cleared");
        sendResponse({ success: true });
      
        notifyAllTabs({ type: 'DATA_CLEARED' });
      });
      return true;
    }

 
    sendResponse({ error: 'Unknown message type' });
  } catch (error) {
    console.error("[Background] Error handling message:", error);
    sendResponse({ error: String(error) });
  }
});


const notifyAllTabs = (message: any) => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not be reachable; ignore
        });
      }
    });
  });
};


chrome.tabs.onRemoved.addListener((tabId) => {
  extractionStates.delete(tabId);
  console.log(`[Background] Cleaned up extraction state for closed tab ${tabId}`);
});