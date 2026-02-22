import { Search, Filter, LayoutGrid, LayoutList, X } from 'lucide-react';
import { useState } from 'react';
import type { CardDensity } from '../../hooks/useCardDensity';

interface BoardToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  filters: { priorities: string[]; labelIds: string[] };
  onTogglePriority: (priority: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  density: CardDensity;
  onToggleDensity: () => void;
}

export function BoardToolbar({
  search, onSearchChange, filters, onTogglePriority, onClearFilters,
  hasActiveFilters, density, onToggleDensity,
}: BoardToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  return (
    <div data-testid="board-toolbar" className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
      {/* Search */}
      <div className="relative flex items-center">
        {searchOpen ? (
          <div className="flex items-center gap-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              data-testid="board-search"
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks..."
              className="w-48 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <button data-testid="search-close" onClick={() => { onSearchChange(''); setSearchOpen(false); }} className="p-1 hover:bg-muted rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button data-testid="search-toggle" onClick={() => setSearchOpen(true)} className="p-2 hover:bg-muted rounded-md text-muted-foreground" title="Search (/)">
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="relative">
        <button data-testid="filter-toggle" onClick={() => setFilterOpen(!filterOpen)} className={`p-2 hover:bg-muted rounded-md ${hasActiveFilters ? 'text-primary' : 'text-muted-foreground'}`}>
          <Filter className="w-4 h-4" />
        </button>
        {filterOpen && (
          <>
            <div data-testid="filter-backdrop" className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
            <div data-testid="filter-dropdown" className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-lg p-3 w-48">
              <p className="text-xs font-medium text-muted-foreground mb-2">Priority</p>
              {priorities.map(p => (
                <label key={p} className="flex items-center gap-2 py-1 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={filters.priorities.includes(p)} onChange={() => onTogglePriority(p)} className="rounded" />
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Density toggle */}
      <button data-testid="density-toggle" onClick={onToggleDensity} className="p-2 hover:bg-muted rounded-md text-muted-foreground" title={density === 'comfortable' ? 'Compact view' : 'Comfortable view'}>
        {density === 'comfortable' ? <LayoutList className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
      </button>

      {/* Filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 ml-2">
          {filters.priorities.map(p => (
            <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {p.charAt(0) + p.slice(1).toLowerCase()}
              <button onClick={() => onTogglePriority(p)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <button onClick={onClearFilters} className="text-xs text-muted-foreground hover:text-foreground ml-1">Clear all</button>
        </div>
      )}
    </div>
  );
}
