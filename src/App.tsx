import { useState } from 'react';
import { getStorageData, clearData } from './utils/storage';

function App() {
  const [status, setStatus] = useState('Idle');
  const [lastCount, setLastCount] = useState<number | null>(null);

  const handleExtract = async () => {
    setStatus('Requesting extraction...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setStatus('Error: No active tab found.');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DATA' });
      
      if (response && response.success) {
        setStatus(response.message);
        setLastCount(response.count);
      } else {
        setStatus('Extraction failed or returned no response.');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error: Content script not reachable. Refresh the page?');
    }
  };

  const handleReadStorage = async () => {
    const data = await getStorageData();
    console.log("Current Storage:", data);
    const count = Object.keys(data.contacts).length;
    setStatus(`Storage contains ${count} unique contacts.`);
  };

  return (
    <div className="p-4 w-80 bg-slate-50 min-h-screen text-slate-800 font-sans">
      <h1 className="text-lg font-bold mb-4 border-b border-slate-300 pb-2">Close Extractor</h1>
      
      <div className="flex flex-col gap-4">
        
        {/* Main Action */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xs font-bold text-slate-500 uppercase mb-3">Live Extraction</h2>
          <button 
            onClick={handleExtract}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
          >
            Run Extractor
          </button>
          {lastCount !== null && (
            <p className="text-center text-xs text-green-600 mt-2 font-medium">
              Last run found {lastCount} items
            </p>
          )}
        </div>

        {/* Debug Tools */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xs font-bold text-slate-500 uppercase mb-3">Debug Storage</h2>
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleReadStorage}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-1.5 px-3 rounded text-sm transition-colors"
            >
              Check Storage Count
            </button>
            <button 
              onClick={async () => { await clearData(); setStatus("Storage wiped."); }}
              className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-1.5 px-3 rounded text-sm transition-colors"
            >
              Clear All Data
            </button>
          </div>
        </div>

      </div>

      {/* Status Bar */}
      <div className="mt-6 pt-3 border-t border-slate-200 text-xs text-slate-500">
        <span className="font-semibold">Status:</span> {status}
      </div>
    </div>
  );
}

export default App;