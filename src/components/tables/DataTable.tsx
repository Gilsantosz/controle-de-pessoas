import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  sortKey?: string;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  searchKey?: keyof T;
}

export function DataTable<T extends { id?: string; uid?: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
  searchPlaceholder,
  onRowClick,
  searchKey
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtrar
  const filteredData = React.useMemo(() => {
    if (!searchTerm || !searchKey) return data;
    return data.filter(row => {
      const val = row[searchKey];
      if (typeof val === 'string') {
        return val.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
  }, [data, searchTerm, searchKey]);

  // Ordenar
  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];

      if (aVal === undefined || bVal === undefined) return 0;
      
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="w-full bg-white premium-card overflow-hidden">
      {/* TOOLBAR */}
      {searchPlaceholder && searchKey && (
        <div className="p-5 border-b border-[#E8ECF2] flex items-center justify-between gap-4">
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8A94A6]">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#F6F8FB] border border-transparent rounded-xl text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#E8ECF2] transition-all"
            />
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F7F8FC] border-b border-[#E8ECF2]">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`py-4 px-6 text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider select-none ${col.className || ''}`}
                >
                  {col.sortable && typeof col.accessor === 'string' ? (
                    <button 
                      onClick={() => handleSort(col.accessor as string)}
                      className="flex items-center gap-1.5 font-bold hover:text-[#0F172A] transition-colors"
                    >
                      {col.header}
                      {sortKey === col.accessor ? (
                        sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      ) : (
                        <ChevronDown size={12} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-[#F6F8FB]">
            {loading ? (
              // SKELETON
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="h-16">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-4 px-6">
                      <div className="h-4 bg-[#F6F8FB] rounded animate-pulse w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              // EMPTY STATE
              <tr>
                <td colSpan={columns.length} className="py-12 px-6 text-center text-xs text-[#8A94A6] font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // DATA ROWS
              sortedData.map((row, idx) => (
                <tr 
                  key={row.id || row.uid || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`h-16 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-[#F7F8FC]/50' : ''}`}
                >
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`py-4 px-6 text-xs text-[#0F172A] font-medium ${col.className || ''}`}>
                      {typeof col.accessor === 'function' 
                        ? col.accessor(row) 
                        : (row[col.accessor] as any)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
