import { useState } from 'react';
import { saveExtractedData, getStorageData, clearData } from './utils/storage';

function App() {
  const [status, setStatus] = useState('Idle');

  const handleTestSave = async () => {
    setStatus('Saving...');
    // Simulate scraping 2 contacts
    await saveExtractedData([
      { id: '1', name: 'Alice', email: 'alice@test.com', phone: '123', company: 'A-Corp' },
      { id: '2', name: 'Bob', email: 'bob@test.com', phone: '456', company: 'B-Corp' }
    ], [], []);
    setStatus('Saved! Check Console.');
  };

  const handleTestRead = async () => {
    const data = await getStorageData();
    console.log("Read from Storage:", data);
    setStatus(`Read ${Object.keys(data.contacts).length} contacts.`);
  };

  return (
    <div className="p-4 w-64">
      <h1 className="text-xl font-bold mb-4">Storage Test</h1>
      <div className="flex flex-col gap-2">
        <button onClick={handleTestSave} className="bg-blue-500 text-white p-2 rounded">1. Test Save</button>
        <button onClick={handleTestRead} className="bg-green-500 text-white p-2 rounded">2. Test Read</button>
        <button onClick={() => { clearData(); setStatus("Cleared"); }} className="bg-red-500 text-white p-2 rounded">3. Clear Data</button>
      </div>
      <p className="mt-4 text-gray-600">{status}</p>
    </div>
  );
}

export default App;