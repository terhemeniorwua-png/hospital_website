'use client';

import { useEffect, useRef, useState } from 'react';
import RequireAuth from '../../components/dashboard/RequireAuth';
import DashboardShell from '../../components/dashboard/DashboardShell';
import { AsyncView } from '../../components/dashboard/primitives';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Avatar, Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Form';
import { IconArrowRight, IconChat, IconMailbox } from '../../components/ui/Icon';
import { CardSkeleton, EmptyState, ErrorState, ListSkeleton, Notice } from '../../components/ui/States';
import { cn, timeAgo } from '../../lib/utils';
import { useAuth } from '../../components/providers/AuthProvider';
import { useRealtime } from '../../components/providers/RealtimeProvider';
import { useAsync, useSubmit } from '../../hooks/useAsync';
import {
  conversationPreview,
  conversationTitle,
  getConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from '../../lib/services/messaging';

function Composer({ conversationId, onSent }) {
  const [body, setBody] = useState('');
  const { submit, pending, error } = useSubmit(async () => {
    const text = body.trim();
    if (!text) return;
    await sendMessage(conversationId, { body: text });
    setBody('');
    onSent?.();
  });

  return (
    <div className="border-t border-line p-4">
      <Textarea
        aria-label="Message"
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a message to the care team"
        maxLength={4000}
      />
      {error ? <p className="mt-2 text-sm text-danger-600">{error.message}</p> : null}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          loading={pending}
          disabled={!body.trim()}
          onClick={() => submit().catch(() => {})}
        >
          <IconArrowRight className="mr-1.5 size-4" /> Send
        </Button>
      </div>
    </div>
  );
}

function Thread({ conversationId, onSent }) {
  const { user } = useAuth();
  const { revision } = useRealtime();
  const bottomRef = useRef(null);

  const detail = useAsync(() => getConversation(conversationId), [conversationId]);
  const messages = useAsync(() => listMessages(conversationId, { limit: 100 }), [conversationId, revision]);

  useEffect(() => {
    if (!conversationId) return;
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId, revision]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.data]);

  if (detail.loading) return <Card><CardSkeleton lines={6} /></Card>;
  if (detail.error) {
    return <ErrorState title="Could not open this conversation" description={detail.error?.message} onRetry={detail.reload} />;
  }

  const conversation = detail.data?.data;

  return (
    <Card className="flex min-h-[28rem] flex-col">
      <CardHeader
        icon={<IconChat className="size-5" />}
        title={conversationTitle(conversation) || 'Conversation'}
        description={conversation?.type ? conversation.type.toLowerCase() : undefined}
        action={<Badge tone="muted" size="sm">{conversation?.participants?.length ?? 0} people</Badge>}
      />

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.loading ? (
          <ListSkeleton count={4} />
        ) : messages.error ? (
          <ErrorState compact title="Could not load messages" description={messages.error?.message} onRetry={messages.reload} />
        ) : (messages.data?.data || []).length === 0 ? (
          <EmptyState compact icon={<IconMailbox className="size-6" />} title="No messages yet" description="Start the conversation below." />
        ) : (
          (messages.data?.data || []).map((message) => {
            const mine = String(message.senderId ?? message.userId) === String(user?.id);
            return (
              <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                    mine ? 'bg-primary-600 text-white' : 'bg-canvas text-ink',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body || message.message}</p>
                  <p className={cn('mt-1 text-[11px]', mine ? 'text-white/70' : 'text-muted')}>
                    {message.senderName ? `${message.senderName} · ` : ''}
                    {timeAgo(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <Composer conversationId={conversationId} onSent={() => { onSent?.(); messages.reload(); }} />
    </Card>
  );
}

export default function MessagesPage() {
  const [activeId, setActiveId] = useState(null);
  const { revision } = useRealtime();

  return (
    <RequireAuth>
      <DashboardShell title="Messages" description="Conversations with your care team" wide>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <AsyncView
            fetcher={() => listConversations({ limit: 30 })}
            deps={[revision, activeId]}
            skeleton={<ListSkeleton count={5} />}
            empty={
              <EmptyState
                icon={<IconMailbox className="size-7" />}
                title="No conversations yet"
                description="Messages with the clinic will be listed here."
              />
            }
          >
            {(response) => (
              <Card>
                <CardHeader icon={<IconMailbox className="size-5" />} title="Inbox" description={`${response.pagination?.total ?? response.data.length} conversations`} />
                <CardBody className="space-y-2">
                  {response.data.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setActiveId(thread.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition',
                        activeId === thread.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-line hover:border-primary-300 hover:bg-canvas',
                      )}
                    >
                      <Avatar firstName={thread.participants?.[0]?.user?.firstName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{conversationTitle(thread)}</span>
                          <span className="shrink-0 text-[11px] text-muted">
                            {timeAgo(thread.lastMessageAt || thread.updatedAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {conversationPreview(thread) || 'No messages yet'}
                        </span>
                      </span>
                    </button>
                  ))}
                </CardBody>
              </Card>
            )}
          </AsyncView>

          {activeId ? (
            <Thread conversationId={activeId} onSent={() => {}} />
          ) : (
            <Card>
              <CardHeader icon={<IconChat className="size-5" />} title="Conversation" />
              <CardBody>
                <EmptyState
                  icon={<IconChat className="size-7" />}
                  title="Pick a conversation"
                  description="Select a thread from the inbox to read and reply."
                />
                <Notice tone="info" className="mt-4" title="Who can see this?">
                  Conversations are visible only to you and the staff invited into the thread.
                </Notice>
              </CardBody>
            </Card>
          )}
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}
