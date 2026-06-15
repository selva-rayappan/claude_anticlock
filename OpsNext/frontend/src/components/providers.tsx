'use client';

import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/toaster';
import { CommandPalette } from '@/components/command-palette';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <CommandPalette />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
