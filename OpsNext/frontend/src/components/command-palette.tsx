'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Users, Building2, TrendingUp, CheckSquare, BarChart3, Settings } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api, paths } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'contact' | 'account' | 'lead' | 'opportunity';
  title: string;
  subtitle?: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  contact: Users,
  account: Building2,
  lead: TrendingUp,
  opportunity: BarChart3,
};

const TYPE_PATH: Record<string, (id: string) => string> = {
  contact: (id) => `/contacts/${id}`,
  account: (id) => `/accounts/${id}`,
  lead: (id) => `/leads/${id}`,
  opportunity: (id) => `/opportunities/${id}`,
};

const NAV_SHORTCUTS = [
  { label: 'Contacts', icon: Users, path: '/contacts' },
  { label: 'Accounts', icon: Building2, path: '/accounts' },
  { label: 'Leads', icon: TrendingUp, path: '/leads' },
  { label: 'Opportunities', icon: BarChart3, path: '/opportunities' },
  { label: 'Tasks', icon: CheckSquare, path: '/tasks' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  React.useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<{ results: SearchResult[] }>(paths.search(query));
        setResults(data.results ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function navigate(path: string) {
    router.push(path);
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-2xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Search contacts, accounts, leads..."
              value={query}
              onValueChange={setQuery}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {loading ? 'Searching...' : 'No results found.'}
            </Command.Empty>

            {results.length > 0 && (
              <Command.Group heading="Search Results">
                {results.map((result) => {
                  const Icon = TYPE_ICON[result.type] ?? Search;
                  return (
                    <Command.Item
                      key={`${result.type}-${result.id}`}
                      onSelect={() => navigate(TYPE_PATH[result.type]?.(result.id) ?? '/')}
                      className={cn('flex items-center gap-2 rounded-md cursor-pointer')}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm">{result.title}</span>
                        {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">{result.type}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            <Command.Group heading="Navigate">
              {NAV_SHORTCUTS.map((item) => (
                <Command.Item key={item.path} onSelect={() => navigate(item.path)} className="flex items-center gap-2 cursor-pointer">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
