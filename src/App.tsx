import { useState, useEffect } from 'react';
import { getStorageData, clearData } from './utils/storage';
import type { StorageShape } from './types/schema';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ListView } from './components/ListView';


function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'opportunities' | 'tasks'>('overview');
  const [data, setData] = useState<StorageShape>({ contacts: {}, opportunities: {}, tasks: {}, lastSync: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const refreshData = async () => {
    const stored = await getStorageData();
    setData(stored);
  };

  useEffect(() => { refreshData(); }, []);

  const handleExtract = async () => {
    setLoading(true);
    setMsg('Connecting...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab");
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DATA' });
      if (response && response.success) {
        setMsg(`Success: ${response.message}`);
        await refreshData();
      } else {
        setMsg("Extraction failed.");
      }
    } catch (e) {
      setMsg("Please open Close.com");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleDelete = async (type: 'contacts' | 'opportunities' | 'tasks', id: string) => {
    const newData = { ...data };
    delete newData[type][id];
    newData.lastSync = Date.now();
    await chrome.storage.local.set({ 'close_data': newData });
    setData(newData);
  };

  const handleClearAll = async () => {
    if(confirm("Clear all data?")) {
      await clearData();
      await refreshData();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterList = (list: any[]) => {
    if (!search) return list;
    const lower = search.toLowerCase();
    return list.filter(item => 
      item.name?.toLowerCase().includes(lower) || 
      item.lead?.toLowerCase().includes(lower) ||
      item.description?.toLowerCase().includes(lower)
    );
  };

  const contactsList = filterList(Object.values(data.contacts));
  const oppsList = filterList(Object.values(data.opportunities));
  const tasksList = filterList(Object.values(data.tasks));

  return (
    <div className="flex w-[800px] h-[520px] bg-black text-white font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onClearAll={handleClearAll} />

      <main className="flex-1 flex flex-col relative bg-black">
        <Header search={search} setSearch={setSearch} onExtract={handleExtract} loading={loading} />

        <div className="flex-1 overflow-y-auto">
          {msg && (
            <div className="m-4 px-4 py-2 bg-black text-white text-xs rounded-lg flex items-center justify-between border border-white/20">
              <span>{msg}</span>
              <button onClick={() => setMsg('')}>✕</button>
            </div>
          )}

          {activeTab === 'overview' && (
            <Dashboard 
              contacts={contactsList} 
              opportunities={oppsList} 
              onDeleteContact={(id) => handleDelete('contacts', id)} 
            />
          )}

          {activeTab === 'contacts' && (
            <ListView
              title="Contacts"
              data={contactsList}
              columns={[
                { label: 'Name', key: 'name' },
                { label: 'Email', key: 'emails' },
                { label: 'Phone', key: 'phones' },
                { label: 'Lead', key: 'lead' }
              ]}
              onDelete={(id) => handleDelete('contacts', id)}
            />
          )}

          {activeTab === 'opportunities' && (
            <ListView
              title="Opportunities"
              data={oppsList}
              columns={[
                { label: 'Name', key: 'name' },
                { label: 'Value', key: 'value' },
                { label: 'Status', key: 'status' },
                { label: 'Close Date', key: 'closeDate' }
              ]}
              onDelete={(id) => handleDelete('opportunities', id)}
            />
          )}

          {activeTab === 'tasks' && (
            <ListView
              title="Tasks"
              data={tasksList}
              columns={[
                { label: 'Description', key: 'description' },
                { label: 'Assignee', key: 'assignee' },
                { label: 'Status', key: 'status' },
                { label: 'Due Date', key: 'dueDate' }
              ]}
              onDelete={(id) => handleDelete('tasks', id)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;