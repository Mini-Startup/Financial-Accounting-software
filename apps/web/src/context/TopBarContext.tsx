'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TopBarConfig {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

interface TopBarContextType {
  config: TopBarConfig;
  setTopBar: (config: TopBarConfig) => void;
  resetTopBar: () => void;
}

const TopBarContext = createContext<TopBarContextType>({
  config: {},
  setTopBar: () => {},
  resetTopBar: () => {},
});

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TopBarConfig>({});

  const setTopBar = useCallback((newConfig: TopBarConfig) => {
    setConfig(newConfig);
  }, []);

  const resetTopBar = useCallback(() => {
    setConfig({});
  }, []);

  return (
    <TopBarContext.Provider value={{ config, setTopBar, resetTopBar }}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBar() {
  return useContext(TopBarContext);
}
