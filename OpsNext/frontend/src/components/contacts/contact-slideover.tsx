'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { createContactSchema, updateContactSchema } from '@opsnext/shared';
import type { Contact } from '@opsnext/shared';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, paths } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type CreateValues = z.infer<typeof createContactSchema>;
type UpdateValues = z.infer<typeof updateContactSchema>;

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] as const;

const EMPTY_DEFAULTS: CreateValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  title: '',
  company: '',
  website: '',
  leadStatus: 'NEW',
  phones: [],
  tags: [],
  customFields: {},
};

function safeParseJSON<T>(val: any, fallback: T): T {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch (e) {
      return fallback;
    }
  }
  return val ?? fallback;
}

function contactToFormValues(contact: Contact): CreateValues {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone ?? '',
    title: contact.title ?? '',
    company: contact.company ?? '',
    website: contact.website ?? '',
    leadStatus: (contact.leadStatus as CreateValues['leadStatus']) ?? 'NEW',
    phones: safeParseJSON(contact.phones, []),
    tags: contact.tags ?? [],
    customFields: safeParseJSON(contact.customFields, {}),
  };
}

interface ContactSlideOverProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contact?: Contact | undefined;
}

export function ContactSlideOver({ open, onClose, onSuccess, contact }: ContactSlideOverProps) {
  const isEdit = !!contact;

  const form = useForm<CreateValues>({
    resolver: zodResolver(isEdit ? updateContactSchema : createContactSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(isEdit ? contactToFormValues(contact) : EMPTY_DEFAULTS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact?.id]);

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) => api.post(paths.contacts.create, values),
    onSuccess: () => {
      toast({ title: 'Contact created', variant: 'success' });
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create contact', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: UpdateValues) => api.put(paths.contacts.update(contact!.id), values),
    onSuccess: () => {
      toast({ title: 'Contact updated', variant: 'success' });
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update contact', description: err.message, variant: 'destructive' });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: CreateValues) {
    if (isEdit) {
      // For updates: don't send empty-string optional fields — keep existing values
      const updatePayload: Record<string, unknown> = { ...values };
      if (!updatePayload.company) delete updatePayload.company;
      if (!updatePayload.title) delete updatePayload.title;
      if (!updatePayload.website) delete updatePayload.website;
      if (!updatePayload.phone) delete updatePayload.phone;
      updateMutation.mutate(updatePayload as UpdateValues);
    } else {
      createMutation.mutate(values);
    }
  }

  const leadStatusValue = form.watch('leadStatus');

  return (
    <>
      <div
        className={cn('fixed inset-0 bg-black/40 z-40 transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50 flex flex-col',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit contact' : 'New contact'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>First name *</Label>
              <Input {...form.register('firstName')} />
              {form.formState.errors.firstName && <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Last name *</Label>
              <Input {...form.register('lastName')} />
              {form.formState.errors.lastName && <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Email {!isEdit && '*'}</Label>
            <Input type="email" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Job title</Label>
            <Input placeholder="e.g. VP of Engineering" {...form.register('title')} />
          </div>

          <div className="space-y-1">
            <Label>Company</Label>
            <Input placeholder="Company name" {...form.register('company')} />
          </div>

          <div className="space-y-1">
            <Label>Website</Label>
            <Input type="url" placeholder="https://example.com" {...form.register('website')} />
            {form.formState.errors.website && <p className="text-xs text-destructive">{form.formState.errors.website.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Lead status</Label>
            <Select
              value={leadStatusValue ?? 'NEW'}
              onValueChange={(v) => form.setValue('leadStatus', v as CreateValues['leadStatus'], { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Phone</Label>
            <Input type="tel" placeholder="+1 (555) 000-0000" {...form.register('phone')} />
          </div>
        </form>

        <div className="flex items-center gap-3 px-6 py-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button
            type="button"
            className="flex-1"
            disabled={isPending}
            onClick={form.handleSubmit(onSubmit, (errors) => console.error('Form validation errors:', errors))}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create contact'}
          </Button>
        </div>
      </div>
    </>
  );
}
