'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Building2, DollarSign, CheckSquare, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, paths } from '@/lib/api';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

interface SalesOverview {
  totalRevenueMtd: number;
  dealsWonMtd: number;
  dealsLostMtd: number;
  openPipelineValue: number;
  newLeadsMtd: number;
  activitiesThisWeek: number;
  conversionRate: number;
  avgDealSize: number;
  revenueByMonth: { month: string; revenue: number; deals: number }[];
  topOwners: { name: string; revenue: number; deals: number }[];
}

function StatCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; trend?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <Badge variant={trend >= 0 ? 'success' : 'destructive'} className="mt-2 text-xs">
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last month
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'sales-overview'],
    queryFn: () => api.get<SalesOverview>(paths.reports.salesOverview),
  });

  return (
    <>
      <Topbar title={`Welcome back, ${user?.firstName ?? ''}!`} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* KPI Row */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : error ? (
            <div className="col-span-4 flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              Failed to load dashboard metrics.
            </div>
          ) : data ? (
            <>
              <StatCard title="Revenue MTD" value={formatCurrency(data.totalRevenueMtd)} icon={DollarSign} />
              <StatCard title="Open Pipeline" value={formatCurrency(data.openPipelineValue)} icon={TrendingUp} subtitle={`Avg deal: ${formatCurrency(data.avgDealSize)}`} />
              <StatCard title="New Leads MTD" value={formatNumber(data.newLeadsMtd)} icon={Users} subtitle={`${data.conversionRate.toFixed(1)}% conversion rate`} />
              <StatCard title="Activities This Week" value={formatNumber(data.activitiesThisWeek)} icon={CheckSquare} subtitle={`${data.dealsWonMtd} deals closed`} />
            </>
          ) : null}
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={256}>
                  <AreaChart data={data?.revenueByMonth ?? []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v: number) => `$${formatNumber(v)}`} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Sales Reps</CardTitle>
              <CardDescription>Revenue closed this month</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={data?.topOwners ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${formatNumber(v)}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
