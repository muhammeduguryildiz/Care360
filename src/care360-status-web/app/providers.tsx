'use client';

import { ThemeProvider } from '@/lib/theme';
import { LangProvider } from '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LangProvider>
        {children}
      </LangProvider>
    </ThemeProvider>
  );
}
