'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef, type SortingState, getSortedRowModel,
} from '@tanstack/react-table';
import { Plus, Search, Trash2, Tag, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { api, paths } from '@/lib/api';
import { formatDate, initials } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { ContactSlideOver } from '@/components/contacts/contact-slideover';
import type { Contact } from '@opsnext/shared';

function SortIcon({ sort }: { sort: 'asc' | 'desc' | false }) {
  if (sort === 'asc') return <ChevronUp className="ml-1 h-3 w-3" />;
  if (sort === 'desc') return <ChevronDown className="ml-1 h-3 w-3" />;
  return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-30" />;
}

export default function ContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), limit: '50', ...(search ? { search } : {}) }).toString();
  const { data, isLoading } = useQuery({
    queryKey: ['contacts', query],
    queryFn: () => api.get<{ items: Contact[]; total: number; page: number; totalPages: number }>(paths.contacts.list(query)),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(paths.contacts.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact deleted' });
    },
  });

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const columns: ColumnDef<Contact>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-input"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-input"
        />
      ),
      size: 40,
    },
    {
      accessorKey: 'firstName',
      header: ({ column }) => (
        <button className="flex items-center font-medium" onClick={() => column.toggleSorting()}>
          Name <SortIcon sort={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials(row.original.firstName, row.original.lastName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm">{row.original.firstName} {row.original.lastName}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? '—'}</span>,
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? '—'}</span>,
    },
    {
      accessorKey: 'leadScore',
      header: ({ column }) => (
        <button className="flex items-center font-medium" onClick={() => column.toggleSorting()}>
          Score <SortIcon sort={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const score = getValue() as number ?? 0;
        return (
          <Badge variant={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'secondary'}>
            {score}
          </Badge>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ getValue }) => {
        const tags = (getValue() as string[]) ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
            {tags.length > 3 && <Badge variant="outline" className="text-xs">+{tags.length - 3}</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button className="flex items-center font-medium" onClick={() => column.toggleSorting()}>
          Created <SortIcon sort={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{formatDate(getValue() as string)}</span>,
      size: 120,
    },
  ];

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    pageCount: data?.totalPages ?? 1,
  });

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  return (
    <>
      <Topbar title="Contacts">
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add contact
        </Button>
      </Topbar>

      <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-9" value={search} onChange={handleSearch} />
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <Badge variant="secondary">{selectedIds.length} selected</Badge>
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => {
                if (confirm(`Delete ${selectedIds.length} contacts?`)) {
                  selectedIds.forEach((id) => deleteMutation.mutate(id));
                  setRowSelection({});
                }
              }}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </div>
          )}
          <div className="ml-auto text-sm text-muted-foreground">
            {data?.total ?? 0} contacts
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider" style={{ width: h.getSize() }}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? `No contacts matching "${search}"` : 'No contacts yet. Add your first contact!'}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/contacts/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <ContactSlideOver open={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => {
        setShowCreate(false);
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      }} />
    </>
  );
}
