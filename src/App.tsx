import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, BadgeDollarSign, CheckSquare, Search, Trash2, RefreshCw, Download, ChevronRight } from 'lucide-react';
import { getStorageData, clearData } from './utils/storage';
import type { StorageShape } from './types/schema';

// --- Styled Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-3 text-[13px] font-medium transition-all relative ${
      active 
        ? 'text-white bg-black border-l-4 border-yellow-500 shadow-[inset_0_1px_0_rgba(234,179,8,0.1)]' 
        : 'text-yellow-200 hover:text-white hover:bg-black'
    }`}
  >
    <Icon size={16} className={active ? 'text-yellow-400' : 'text-yellow-300'} />
    {label}
  </button>
);

const StatCard = ({ label, value, subtext, icon: Icon }: { label: string, value: string, subtext: string, icon: any }) => (
  <div className="bg-black p-4 rounded-xl border border-yellow-500/20 flex flex-col justify-between h-28">
    <div className="flex justify-between items-start">
      <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg">
        <Icon size={16} />
      </div>
      <span className="text-[10px] font-medium text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded-full tracking-wide">
        {subtext}
      </span>
    </div>
    <div className="mt-2">
      <p className="text-yellow-200 text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-0.5 font-['Poppins']">{value}</p>
    </div>
  </div>
);

const TableRow = ({ avatar, title, subtitle, col2, col3, col4, onDelete }: any) => (
  <div className="group grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-yellow-500/10 hover:bg-yellow-500/5 transition-colors last:border-0">
    {/* Col 1: Name & Avatar (Span 4) */}
    <div className="col-span-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-[10px] font-bold text-yellow-200 shrink-0">
        {avatar || title.charAt(0)}
      </div>
      <div className="min-w-0">
        <h4 className="text-[13px] font-semibold text-white truncate">{title}</h4>
        <p className="text-[11px] text-yellow-200 truncate">{subtitle}</p>
      </div>
    </div>
    
    {/* Col 2: Property/Detail (Span 3) */}
    <div className="col-span-3 text-[12px] text-yellow-100 font-medium truncate">
      {col2}
    </div>

    {/* Col 3: Stage/Badge (Span 3) */}
    <div className="col-span-3">
      <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-yellow-500/10 text-yellow-300">
        {col3}
      </span>
    </div>

    {/* Col 4: Value/Action (Span 2) */}
    <div className="col-span-2 text-right flex items-center justify-end gap-2">
      <span className="text-[12px] font-semibold text-white">{col4}</span>
      <button 
        onClick={onDelete} 
        className="opacity-0 group-hover:opacity-100 p-1.5 text-yellow-300 hover:text-yellow-400 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>
);

// --- Main App ---

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

  const totalValue = Object.values(data.opportunities).reduce((acc, curr) => {
    const val = parseFloat(curr.value.replace(/[^0-9.-]+/g,"")) || 0;
    return acc + val;
  }, 0);
  
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="flex w-[800px] h-[520px] bg-black text-white font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-52 bg-black flex flex-col pt-6 pb-4 shadow-[1px_0_30px_rgba(234,179,8,0.2)] z-10 border-r border-yellow-500/20">
        <div className="px-6 mb-6">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-400 font-semibold text-sm shadow-sm border border-yellow-500/30">
            CX
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <SidebarItem icon={Users} label="Contacts" active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} />
          <SidebarItem icon={BadgeDollarSign} label="Pipeline" active={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')} />
          <SidebarItem icon={CheckSquare} label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
        </nav>

        <div className="px-6 mt-auto">
           <button onClick={handleClearAll} className="flex items-center gap-2 text-[11px] font-medium text-yellow-300 hover:text-yellow-400 transition-colors">
            <Trash2 size={12} /> Clear Database
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-black">
        
        {/* Header */}
        <header className="h-16 px-8 flex items-center gap-3 bg-black border-b border-yellow-500/20">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-300 group-focus-within:text-yellow-400 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search leads, deals, tasks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-black rounded-lg text-[12px] border border-yellow-500/30 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/20 focus:outline-none w-full shadow-[0_10px_30px_-20px_rgba(234,179,8,0.3)] transition-all placeholder:text-yellow-300/50 text-white"
            />
          </div>

          <button 
            onClick={handleExtract}
            disabled={loading}
            className={`h-10 px-3 flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-[12px] font-semibold shadow-[0_12px_30px_-18px_rgba(234,179,8,0.7)] transition-all active:translate-y-[1px] ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? <RefreshCw className="animate-spin" size={14}/> : <Download size={14}/>}
            {loading ? 'Processing' : 'Add Lead'}
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
           
           {/* Message Toast */}
           {msg && (
            <div className="mb-4 px-4 py-2 bg-black text-white text-xs rounded-lg shadow-[0_12px_30px_-18px_rgba(234,179,8,0.5)] flex items-center justify-between border border-yellow-500/30">
              <span>{msg}</span>
              <button onClick={() => setMsg('')}>✕</button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Revenue" value={formatter.format(totalValue)} subtext="+12%" icon={BadgeDollarSign} />
                <StatCard label="New Leads" value={contactsList.length.toString()} subtext="+4%" icon={Users} />
                <StatCard label="Pending Tasks" value={tasksList.filter(t => !t.isComplete).length.toString()} subtext="Due Soon" icon={CheckSquare} />
                <StatCard label="Close Rate" value="12" subtext="+9%" icon={RefreshCw} />
              </div>

              {/* Table Section */}
              <div className="bg-black rounded-xl border border-yellow-500/20 overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-yellow-500/20 bg-black">
                  <h3 className="font-bold text-[14px] text-white">Recent Leads</h3>
                  <button onClick={() => setActiveTab('contacts')} className="flex items-center gap-1 text-[11px] font-semibold text-yellow-300 hover:text-yellow-400 transition-colors">
                    View all <ChevronRight size={12}/>
                  </button>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-black border-b border-yellow-500/20 text-[10px] font-bold text-yellow-300 uppercase tracking-wider">
                  <div className="col-span-4">Lead Name</div>
                  <div className="col-span-3">Property / Email</div>
                  <div className="col-span-3">Stage</div>
                  <div className="col-span-2 text-right">Value</div>
                </div>

                {/* Table Body */}
                <div className="max-h-[220px] overflow-y-auto">
                  {contactsList.length === 0 && <div className="p-8 text-center text-xs text-yellow-300/70">No leads found.</div>}
                  {contactsList.slice(0, 5).map(c => (
                    <TableRow 
                      key={c.id}
                      title={c.name}
                      subtitle={c.lead}
                      col2={c.emails[0] || 'No Email'}
                      col3="Potential"
                      col4="--"
                      onDelete={() => handleDelete('contacts', c.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* List Views (Reusing TableRow for consistency) */}
          {activeTab !== 'overview' && (
            <div className="bg-black rounded-xl border border-yellow-500/20 overflow-hidden animate-in fade-in duration-300">
               <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-black border-b border-yellow-500/20 text-[10px] font-bold text-yellow-300 uppercase tracking-wider">
                  <div className="col-span-4">Name / Description</div>
                  <div className="col-span-3">Detail</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
                
                <div className="max-h-[380px] overflow-y-auto">
                  {activeTab === 'contacts' && contactsList.map(c => (
                    <TableRow key={c.id} title={c.name} subtitle={c.lead} col2={c.emails[0]} col3="Lead" col4="Contact" onDelete={() => handleDelete('contacts', c.id)} />
                  ))}
                  {activeTab === 'opportunities' && oppsList.map(o => (
                    <TableRow key={o.id} title={o.name} subtitle={o.closeDate} col2={o.status} col3="Opportunity" col4={o.value} onDelete={() => handleDelete('opportunities', o.id)} />
                  ))}
                  {activeTab === 'tasks' && tasksList.map(t => (
                    <TableRow key={t.id} title={t.description} subtitle={t.assignee} col2={t.dueDate} col3={t.isComplete ? 'Done' : 'Due Soon'} col4="Task" onDelete={() => handleDelete('tasks', t.id)} />
                  ))}
                </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;