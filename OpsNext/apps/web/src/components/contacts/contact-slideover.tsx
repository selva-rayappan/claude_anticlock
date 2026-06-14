'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { createContactSchema } from '@opsnext/shared';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, paths } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type FormValues = z.infer<typeof createContactSchema>;

interface ContactSlideOverProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValues?: Partial<FormValues>;
}

export function ContactSlideOver({ open, onClose, onSuccess, defaultValues }: ContactSlideOverProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      title: '',
      company: '',
      leadStatus: 'NEW',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open) form.reset({ firstName: '', lastName: '', email: '', title: '', company: '', leadStatus: 'NEW', ...defaultValues });
  }, [open]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.post(paths.contacts.create, values),
    onSuccess: () => {
      toast({ title: 'Contact created', variant: 'success' });
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create contact', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn('fixed inset-0 bg-black/40 z-40 transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50 flex flex-col',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">New contact</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 space-y-4">
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
            <Label>Email</Label>
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
            <Label>Lead status</Label>
            <Select onValueChange={(v) => form.setValue('leadStatus', v as FormValues['leadStatus'])} defaultValue="NEW">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'].map((s) => (
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
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            className="flex-1"
            disabled={mutation.isPending}
            onClick={form.handleSubmit((v) => mutation.mutate(v))}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create contact
          </Button>
        </div>
      </div>
    </>
  );
}
