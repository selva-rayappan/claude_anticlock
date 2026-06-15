'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { tenantRegisterSchema } from '@opsnext/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, paths, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/toaster';

type RegisterFormValues = z.infer<typeof tenantRegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(tenantRegisterSchema),
    defaultValues: {
      orgName: '',
      adminEmail: '',
      adminPassword: '',
      adminFirstName: '',
      adminLastName: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setLoading(true);
    try {
      await api.post(paths.tenant.register, values);
      toast({ title: 'Account created!', description: 'Please check your email to verify your account.', variant: 'success' });
      router.push('/login');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      toast({ title: 'Registration failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your workspace</CardTitle>
        <CardDescription>Start your 14-day free trial — no credit card required</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organisation name</Label>
            <Input id="orgName" placeholder="Acme Corp" {...form.register('orgName')} />
            {form.formState.errors.orgName && <p className="text-xs text-destructive">{form.formState.errors.orgName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...form.register('adminFirstName')} />
              {form.formState.errors.adminFirstName && <p className="text-xs text-destructive">{form.formState.errors.adminFirstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...form.register('adminLastName')} />
              {form.formState.errors.adminLastName && <p className="text-xs text-destructive">{form.formState.errors.adminLastName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...form.register('adminEmail')} />
            {form.formState.errors.adminEmail && <p className="text-xs text-destructive">{form.formState.errors.adminEmail.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register('adminPassword')} />
            {form.formState.errors.adminPassword && <p className="text-xs text-destructive">{form.formState.errors.adminPassword.message}</p>}
            <p className="text-xs text-muted-foreground">Min. 8 chars with uppercase, number, and special character.</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create workspace
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </div>
      </CardContent>
    </Card>
  );
}
