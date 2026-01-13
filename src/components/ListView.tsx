import { TableRow } from './TableRow';

export const ListView = ({ 
  title, 
  data, 
  columns, 
  onDelete 
}: { 
  title: string; 
  data: any[]; 
  columns: { label: string; key: string }[]; 
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
      {/* Header */}
      <h2 className="text-[16px] font-semibold text-white mb-4">{title}</h2>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 mb-2 border-b border-white/20 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        <div className="col-span-4">Name</div>
        <div className="col-span-3">{columns[1]?.label || 'Property'}</div>
        <div className="col-span-3">{columns[2]?.label || 'Status'}</div>
        <div className="col-span-2 text-right">{columns[3]?.label || 'Value'}</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-[13px]">
            No data available
          </div>
        ) : (
          data.map((row: any) => {
            const getColumnValue = (key: string) => {
              const value = row[key];
              if (Array.isArray(value)) {
                return value.length > 0 ? value[0] : '-';
              }
              return value || '-';
            };

            return (
              <TableRow
                key={row.id}
                avatar={row.name?.charAt(0) || '?'}
                title={row.lead || row.name || 'Unknown'}
                subtitle={row.name || ''}
                col2={getColumnValue(columns[1]?.key) || '-'}
                col3={getColumnValue(columns[2]?.key) || '-'}
                col4={getColumnValue(columns[3]?.key) || '-'}
                onDelete={() => onDelete(row.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
