# Prompt: Create a UI Component or Page

Use this when adding a new page, slide-over panel, form, or reusable component to the Next.js frontend (`frontend/`).

---

## Instruction Template

```
Create a [component type: page / slide-over / form / table / card] for [purpose].

Route (if page): /[route-path]
Route group: [(auth) / (app)]
Auth required: [yes/no]
API endpoint(s) consumed: [e.g., GET /api/v1/contacts, POST /api/v1/contacts]

Data shape:
[describe the fields displayed or captured]

User interactions:
[describe what users can do — create, edit, delete, search, filter, paginate, etc.]

Design notes:
[slide-over vs full page, table vs card grid, any special behaviour]
```

---

## Standard Implementation Order

1. **TanStack Query hook** in `src/hooks/use-{resource}.ts`
   - `useQuery` for read operations
   - `useMutation` with `onSuccess` cache invalidation for writes
2. **Zod schema** in `packages/shared/src/schemas/{resource}.schema.ts` (if not already exists)
3. **Component file** in `src/components/{module}/{component-name}.tsx` or page in `src/app/(app)/{route}/page.tsx`
4. **Server Component vs Client Component** decision:
   - Data-fetching list pages with no interactivity → Server Component
   - Forms, real-time updates, event handlers → Client Component (`"use client"`)
5. **Form** (if applicable): React Hook Form + `zodResolver` + shadcn/ui form primitives
6. **Error and loading states**: use `Skeleton` component during load, `toast` for errors
7. **Accessibility check**: keyboard navigation, ARIA labels on interactive elements

---

## Code Patterns

### TanStack Query Hook

```typescript
// src/hooks/use-contacts.ts
export function useContacts(filters: ContactFilters) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => api.get<PageResponse<Contact>>('/api/v1/contacts', { params: filters }),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContactRequest) => api.post<Contact>('/api/v1/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact created');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
```

### Slide-over Panel (preferred for create/edit)

```typescript
"use client";
// Use Dialog from src/components/ui/dialog.tsx
// Trigger from list page — do not navigate to a separate URL for inline edits
```

### Form with Zod

```typescript
const form = useForm<CreateContactRequest>({
  resolver: zodResolver(createContactSchema), // from @opsnext/shared
  defaultValues: { firstName: '', lastName: '', email: '' },
});
```

---

## shadcn/ui Component Reference

| Use case | Component |
|----------|-----------|
| Modal / slide-over | `Dialog` from `src/components/ui/dialog.tsx` |
| Dropdown menus | `DropdownMenu` |
| Select inputs | `Select` |
| Data tables | `TanStack Table` + `ScrollArea` |
| Loading placeholder | `Skeleton` |
| Status badge | `Badge` |
| User avatar | `Avatar` |
| Tabs | `Tabs` |
| Progress bar | `Progress` |

---

## Constraints

- All API calls via `src/lib/api.ts` — never `fetch` directly.
- All form schemas from `@opsnext/shared` — never duplicate Zod schemas in the frontend.
- Tenant brand colour via CSS var `--primary` only — never hardcode hex values.
- URL filter/sort state synced to search params via `useSearchParams` — never store in component state.
- Mobile-first Tailwind: base styles for mobile, `md:` / `lg:` for larger screens.
