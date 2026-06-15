'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Phone, Building2, Globe, MapPin, Tag, Edit2, Trash2,
  ArrowLeft, ChevronRight, Plus, CheckSquare, Calendar, MessageSquare,
} from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api, paths } from '@/lib/api';
import { formatDate, formatRelativeTime, initials } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { ContactSlideOver } from '@/components/contacts/contact-slideover';
import type { Contact } from '@opsnext/shared';

interface Activity {
  id: string; type: string; subject: string; body?: string;
  scheduledAt?: string; completedAt?: string; createdAt: string;
  createdBy: { firstName: string; lastName: string };
}

const LEAD_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  NEW: 'secondary',
  CONTACTED: 'info' as 'default',
  QUALIFIED: 'success',
  UNQUALIFIED: 'destructive',
  CONVERTED: 'default',
};

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  EMAIL: Mail,
  CALL: Phone,
  MEETING: Calendar,
  NOTE: MessageSquare,
  TASK: CheckSquare,
};

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = ACTIVITY_ICON[activity.type] ?? MessageSquare;
  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{activity.subject}</p>
          <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(activity.createdAt)}</span>
        </div>
        {activity.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.body}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          {activity.createdBy.firstName} {activity.createdBy.lastName}
        </p>
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contacts', id],
    queryFn: () => api.get<Contact>(paths.contacts.get(id)),
  });

  const { data: activities } = useQuery({
    queryKey: ['activities', 'contact', id],
    queryFn: () => api.get<{ items: Activity[] }>(paths.activities.list('contact', id)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(paths.contacts.delete(id)),
    onSuccess: () => {
      toast({ title: 'Contact deleted' });
      router.push('/contacts');
    },
  });

  if (isLoading) {
    return (
      <>
        <Topbar />
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-1" />
            <Skeleton className="h-64 col-span-2" />
          </div>
        </div>
      </>
    );
  }

  if (!contact) return null;

  const leadStatusVariant = LEAD_STATUS_VARIANT[contact.leadStatus ?? 'NEW'] ?? 'secondary';

  return (
    <>
      <Topbar>
        <Button variant="ghost" size="sm" onClick={() => router.push('/contacts')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Contacts
        </Button>
      </Topbar>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column — contact info */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-3 mb-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl font-semibold">
                      {initials(contact.firstName, contact.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{contact.firstName} {contact.lastName}</h2>
                    {contact.title && <p className="text-sm text-muted-foreground">{contact.title}</p>}
                    {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
                  </div>
                  <Badge variant={leadStatusVariant}>{contact.leadStatus ?? 'NEW'}</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                      <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                      <Phone className="h-4 w-4 shrink-0" /> <span>{contact.phone}</span>
                    </a>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" /> <span>{contact.company}</span>
                    </div>
                  )}
                  {contact.website && (
                    <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                      <Globe className="h-4 w-4 shrink-0" /> <span className="truncate">{contact.website}</span>
                    </a>
                  )}
                </div>

                {contact.tags && contact.tags.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator className="my-4" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Created: {formatDate(contact.createdAt)}</div>
                  <div>Updated: {formatDate(contact.updatedAt)}</div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowEdit(true)}>
                    <Edit2 className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10"
                    onClick={() => { if (confirm('Delete this contact?')) deleteMutation.mutate(); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lead score */}
            {contact.leadScore != null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lead Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">{contact.leadScore}</div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${contact.leadScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — timeline + linked records */}
          <div className="xl:col-span-2 space-y-4">
            <Tabs defaultValue="activity">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" /> Log activity
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {!activities?.items?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No activities logged yet.</p>
                    ) : (
                      <div>
                        {activities.items.map((a) => <ActivityItem key={a.id} activity={a} />)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="opportunities" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center py-8">No linked opportunities.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center py-8">No tasks assigned.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <ContactSlideOver
        open={showEdit}
        contact={contact}
        onClose={() => setShowEdit(false)}
        onSuccess={() => {
          setShowEdit(false);
          queryClient.invalidateQueries({ queryKey: ['contacts', id] });
        }}
      />
    </>
  );
}
