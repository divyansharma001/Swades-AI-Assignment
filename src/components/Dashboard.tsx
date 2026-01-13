import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from './StatCard';
import { TableRow } from './TableRow';
import { Users, BadgeDollarSign, TrendingUp } from 'lucide-react';
import type { Contact, Opportunity } from '../types/schema';

export const Dashboard = ({ 
  contacts, 
  opportunities, 
  onDeleteContact 
}: { 
  contacts: Contact[]; 
  opportunities: Opportunity[]; 
  onDeleteContact?: (id: string) => void;
}) => {
  // Calculate metrics from opportunities
  const totalContacts = contacts.length;
  const totalValue = opportunities.reduce((sum, opp) => {
    const numValue = typeof opp.value === 'string'
      ? parseFloat(opp.value.replace(/[^0-9.-]/g, '')) || 0
      : opp.value || 0;
    return sum + numValue;
  }, 0);
  
  const wonOpportunities = opportunities.filter(opp => 
    opp.status?.toLowerCase().includes('won')
  ).length;
  const conversionRate = opportunities.length > 0 ? wonOpportunities / opportunities.length : 0;

  // Support parsing Close.com dates like "16/1/2026" (dd/mm/yyyy) or any ISO-compatible format
  const parseCloseDate = (value: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const iso = Date.parse(trimmed);
    if (!Number.isNaN(iso)) return new Date(iso);

    const parts = trimmed.split(/[\/\-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts.map(p => parseInt(p, 10));
      const year = y < 100 ? 2000 + y : y;
      const dt = new Date(year, m - 1, d);
      if (!Number.isNaN(dt.getTime())) return dt;
    }

    return null;
  };

  // Generate dynamic revenue trend data from opportunities
  const generateRevenueData = () => {
    const now = new Date();
    const weeks = [];
    
    // Get last 5 weeks
    for (let i = 4; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const weekValue = opportunities
        .filter(opp => {
          const closeDate = parseCloseDate(opp.closeDate);
          if (!closeDate) return false;
          return closeDate >= weekStart && closeDate < weekEnd;
        })
        .reduce((sum, opp) => {
          const numValue = typeof opp.value === 'string'
            ? parseFloat(opp.value.replace(/[^0-9.-]/g, '')) || 0
            : opp.value || 0;
          return sum + numValue;
        }, 0);
      
      weeks.push({
        week: `W${5 - i}`,
        value: weekValue
      });
    }
    
    return weeks;
  };

  const revenueData = generateRevenueData();

  // Generate dynamic stage data from opportunities
  const stageMapping: Record<string, string> = {
    'prospect': 'Prospect',
    'qualified': 'Qualified',
    'negotiating': 'Negotiating',
    'won': 'Won'
  };

  const stageData = Object.entries(stageMapping).map(([key, label]) => ({
    stage: label,
    count: opportunities.filter(opp => 
      opp.status?.toLowerCase().includes(key)
    ).length
  }));

  // Bucket any unknown statuses (e.g., "Pipeline Stage") into Prospect so the chart is not empty
  const unmatched = opportunities.filter(opp => {
    const norm = (opp.status || '').toLowerCase();
    return !Object.keys(stageMapping).some(key => norm.includes(key));
  }).length;
  stageData[0].count += unmatched;

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard 
          icon={Users} 
          label="Total Contacts" 
          value={totalContacts.toString()} 
          subtext="Active leads" 
        />
        <StatCard 
          icon={BadgeDollarSign} 
          label="Pipeline Value" 
          value={formatter.format(totalValue)} 
          subtext="Total opportunity" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Conversion Rate" 
          value={`${(conversionRate * 100).toFixed(1)}%`} 
          subtext="Win rate" 
        />
      </div>

      {/* Charts Container */}
      <div className="grid grid-cols-2 gap-3">
        {/* Revenue Trend */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <h3 className="text-[12px] font-semibold text-white mb-3">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Line type="monotone" dataKey="value" stroke="rgba(255,255,255,0.8)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Stage */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <h3 className="text-[12px] font-semibold text-white mb-3">Leads by Stage</h3>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="stage" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar dataKey="count" fill="rgba(255,255,255,0.6)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-[12px] font-semibold text-white">Recent Leads</h3>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <div className="col-span-4">Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-3">Stage</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Table Body */}
        <div className="max-h-[150px] overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-[12px] text-gray-500">No leads found</div>
          ) : (
            contacts.slice(0, 5).map(c => {
              const email = Array.isArray(c.emails) && c.emails.length > 0 ? c.emails[0] : 'No Email';
              const matchedOpp = opportunities.find(o =>
                (o.id === c.id) ||
                (o.name && c.lead && o.name.toLowerCase() === c.lead.toLowerCase())
              );

              return (
                <TableRow 
                  key={c.id}
                  avatar={c.name?.charAt(0) || '?'}
                  title={c.name || c.lead || 'Unknown'}
                  subtitle={c.lead || ''}
                  col2={email}
                  col3={matchedOpp?.status || 'Prospect'}
                  col4={matchedOpp?.value || '--'}
                  onDelete={() => onDeleteContact?.(c.id)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
