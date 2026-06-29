import * as React from 'react';
import { ChevronDown, Search, ArrowUp } from 'lucide-react';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;
  onFilterChange?: (filter: string) => void;
  activeFilter?: string;
  filters?: { id: string, label: string }[];
}

const DataTable = <T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  isLoading,
  onLoadMore,
  hasMore,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  onFilterChange,
  activeFilter,
  filters
}: DataTableProps<T>) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {(onSearchChange !== undefined) && (
          <div className="relative group w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors" size={16} />
            <input
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-surface-bright border border-border-bright rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
            />
          </div>
        )}

        {filters && onFilterChange && (
          <div className="flex bg-surface-bright p-1 rounded-xl border border-border overflow-x-auto no-scrollbar">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeFilter === f.id ? "bg-primary text-text-primary shadow-lg shadow-primary/20" : "text-text-tertiary hover:text-text-primary"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-0">
            <thead>
              <tr className="bg-surface-bright border-b border-border whitespace-nowrap">
                {columns.map((col, idx) => (
                  <th key={idx} className={cn("p-4 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary", col.className)}>
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && <ArrowUp size={10} className="opacity-30" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              <AnimatePresence mode="popLayout">
                {isLoading && data.length === 0 ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      {columns.map((_, idx) => (
                        <td key={idx} className="p-8">
                          <div className="h-4 bg-surface-bright rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="p-20 text-center text-text-tertiary/50 uppercase font-black text-xs tracking-widest">
                      No Records Found
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        "group hover:bg-surface-bright/50 transition-colors whitespace-nowrap cursor-pointer",
                        onRowClick && "active:scale-[0.995]"
                      )}
                    >
                      {columns.map((col, idx) => (
                        <td key={idx} className={cn("p-4 md:p-8", col.className)}>
                          {typeof col.accessor === 'function'
                            ? col.accessor(item)
                            : (item[col.accessor] as React.ReactNode)}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="p-6 md:p-8 border-t border-border bg-surface-bright/30 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="px-8 py-3 bg-surface-bright border border-border-bright text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-accent disabled:opacity-50 transition-all flex items-center gap-3"
            >
              {isLoading ? (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronDown size={14} />
              )}
              Load More Records
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;
