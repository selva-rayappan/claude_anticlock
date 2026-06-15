'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { forgotPasswordSchema } from '@opsnext/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, paths } from '@/lib/api';

type FormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await api.post(paths.auth.forgotPassword, values);
    } catch { /* same response regardless */ }
    finally {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div>
              <h2 className="text-xl font-semibold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground mt-1">
                If an account exists for that email, you&apos;ll receive a password reset link within 5 minutes.
              </p>
            </div>
            <Link href="/login" className="text-sm text-primary hover:underline">Back to sign in</Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>Enter your work email and we&apos;ll send a reset link</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link>
        </div>
      </CardContent>
    </Card>
  );
}
