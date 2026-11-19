'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface TableColumnOption {
  key: string;
  label: string;
}

export interface ActiveTableRegistration {
  id: string;
  tableName: string;
  columns: TableColumnOption[];
  records?: any[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchColumn?: string;
  onSearchColumnChange?: (col: string) => void;
  selectedColumns?: string[];
  onSelectedColumnsChange?: (cols: string[]) => void;
  advancedConditions?: any[];
  onAdvancedConditionsChange?: (conditions: any[]) => void;
  searchMatchMode?: 'AND' | 'OR';
  onSearchMatchModeChange?: (mode: 'AND' | 'OR') => void;
  onSelectRow?: (row: any) => void;
  totalItems?: number;
  filteredItems?: number;
}

export type SearchPaletteMode = 'app' | 'table';

interface TableSearchContextType {
  // Modal visibility & mode
  isOpen: boolean;
  mode: SearchPaletteMode;
  openModal: (mode?: SearchPaletteMode) => void;
  closeModal: () => void;
  toggleModal: (mode?: SearchPaletteMode) => void;
  setMode: (mode: SearchPaletteMode) => void;

  // Active table state
  activeTable: ActiveTableRegistration | null;
  registerTable: (table: ActiveTableRegistration) => () => void;
  updateActiveTable: (updates: Partial<ActiveTableRegistration>) => void;
}

const TableSearchContext = createContext<TableSearchContextType | null>(null);

export function TableSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SearchPaletteMode>('app');
  const [activeTable, setActiveTable] = useState<ActiveTableRegistration | null>(null);

  const openModal = useCallback((targetMode?: SearchPaletteMode) => {
    if (targetMode) {
      setMode(targetMode);
    } else if (activeTable) {
      setMode('table');
    } else {
      setMode('app');
    }
    setIsOpen(true);
  }, [activeTable]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleModal = useCallback((targetMode?: SearchPaletteMode) => {
    setIsOpen((prev) => {
      if (!prev) {
        if (targetMode) setMode(targetMode);
        else if (activeTable) setMode('table');
        else setMode('app');
        return true;
      }
      // If already open and clicked same mode, close; if different mode, switch mode and stay open
      if (targetMode && targetMode !== mode) {
        setMode(targetMode);
        return true;
      }
      return false;
    });
  }, [mode, activeTable]);

  const registerTable = useCallback((table: ActiveTableRegistration) => {
    setActiveTable(table);
    return () => {
      setActiveTable((current) => (current?.id === table.id ? null : current));
    };
  }, []);

  const updateActiveTable = useCallback((updates: Partial<ActiveTableRegistration>) => {
    setActiveTable((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  // Global Keyboard Listener for Ctrl+K, Ctrl+F, Tab, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Check if user is typing in an active text input or textarea (unless modal is open)
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Ctrl + K -> Open App-Wide Search
      if (isCtrlOrMeta && key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => {
          if (!prev) {
            setMode('app');
            return true;
          }
          if (mode === 'table') {
            setMode('app');
            return true;
          }
          return false;
        });
        return;
      }

      // Ctrl + F -> Open Current Table Search (prevent browser native search)
      if (isCtrlOrMeta && key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => {
          if (!prev) {
            setMode(activeTable ? 'table' : 'app');
            return true;
          }
          if (mode === 'app' && activeTable) {
            setMode('table');
            return true;
          }
          return false;
        });
        return;
      }

      // When modal is open:
      if (isOpen) {
        // Tab key: Toggle between App and Table mode
        if (e.key === 'Tab' && !e.shiftKey && activeTable) {
          // Allow tab navigation inside input if focused, but if user presses Alt+Tab or Ctrl+Tab or on header buttons
          // We handle Tab toggle at modal level when desired
        }

        // Escape: Close modal
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, mode, activeTable]);

  return (
    <TableSearchContext.Provider
      value={{
        isOpen,
        mode,
        openModal,
        closeModal,
        toggleModal,
        setMode,
        activeTable,
        registerTable,
        updateActiveTable,
      }}
    >
      {children}
    </TableSearchContext.Provider>
  );
}

export function useTableSearch() {
  const context = useContext(TableSearchContext);
  if (!context) {
    throw new Error('useTableSearch must be used within a TableSearchProvider');
  }
  return context;
}
