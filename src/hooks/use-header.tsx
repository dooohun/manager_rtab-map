import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface HeaderConfig {
  title?: string;
  subtitle?: string;
  backTo?: string;
  actions?: ReactNode;
}

interface HeaderContextValue extends HeaderConfig {
  setHeader: (config: HeaderConfig) => void;
  resetHeader: () => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>({});

  const setHeader = useCallback((c: HeaderConfig) => setConfig(c), []);
  const resetHeader = useCallback(() => setConfig({}), []);

  return (
    <HeaderContext.Provider value={{ ...config, setHeader, resetHeader }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeader must be used within HeaderProvider");
  return ctx;
}
