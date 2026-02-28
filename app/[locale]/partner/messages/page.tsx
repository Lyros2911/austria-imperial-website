'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  MessageSquare,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';

interface PartnerMessage {
  id: number;
  senderName: string;
  senderType: 'partner' | 'admin';
  subject: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export default function PartnerMessagesPage() {
  const t = useTranslations('partner');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  const [messages, setMessages] = useState<PartnerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  // Compose form state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partner/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      console.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleExpand = async (msg: PartnerMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg.id);

    // Mark as read if admin message and unread
    if (msg.senderType === 'admin' && !msg.readAt) {
      try {
        await fetch(`/api/partner/messages/${msg.id}/read`, { method: 'POST' });
        // Update local state
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m
          )
        );
      } catch {
        // Silently fail — not critical
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setSendError('');

    try {
      const res = await fetch('/api/partner/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim() || null,
          body: body.trim(),
        }),
      });

      if (res.ok) {
        setSubject('');
        setBody('');
        setShowCompose(false);
        await fetchMessages();
      } else {
        const data = await res.json().catch(() => ({}));
        setSendError(data.error || 'Failed to send message');
      }
    } catch {
      setSendError('Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {t('messages.title')}
          </h1>
        </div>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gold/[0.12] text-gold border border-gold/30 hover:bg-gold/[0.2] transition-colors"
        >
          {showCompose ? (
            <>
              <X className="w-4 h-4" />
              {t('messages.compose.cancel' as any) || 'Cancel'}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {t('messages.newMessage')}
            </>
          )}
        </button>
      </div>

      {/* Compose Form */}
      {showCompose && (
        <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl p-6 mb-6">
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t('messages.compose.subject')}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('messages.compose.subjectPlaceholder')}
                className="w-full bg-[#060e1a] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-slate-600 focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t('messages.compose.body')} *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('messages.compose.bodyPlaceholder')}
                rows={4}
                required
                className="w-full bg-[#060e1a] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-slate-600 focus:outline-none focus:border-gold/30 transition-colors resize-none"
              />
            </div>
            {sendError && (
              <p className="text-red-400 text-xs">{sendError}</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gold text-[#060e1a] hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sending ? t('messages.compose.sending') : t('messages.compose.send')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Messages List */}
      <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('common.loading')}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('messages.noMessages')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {messages.map((msg) => {
              const isExpanded = expandedId === msg.id;
              const isUnread = msg.senderType === 'admin' && !msg.readAt;
              const bodyPreview = msg.body.length > 100 ? msg.body.slice(0, 100) + '...' : msg.body;

              return (
                <div key={msg.id}>
                  <button
                    onClick={() => handleExpand(msg)}
                    className="w-full flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    {/* Unread indicator */}
                    <div className="flex-shrink-0 mt-1.5">
                      {isUnread ? (
                        <div className="w-2 h-2 rounded-full bg-gold" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-cream text-sm font-medium truncate">
                          {msg.senderName}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${
                            msg.senderType === 'admin'
                              ? 'bg-gold/10 text-gold border-gold/20'
                              : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                          }`}
                        >
                          {msg.senderType === 'admin' ? t('messages.admin') : t('messages.you')}
                        </span>
                        <span className="text-slate-500 text-[11px] ml-auto flex-shrink-0">
                          {new Date(msg.createdAt).toLocaleDateString(dateLocale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {msg.subject && (
                        <p className={`text-sm truncate ${isUnread ? 'text-cream font-semibold' : 'text-slate-300'}`}>
                          {msg.subject}
                        </p>
                      )}
                      {!isExpanded && (
                        <p className="text-slate-500 text-xs mt-0.5 truncate">{bodyPreview}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0 mt-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="px-6 pb-5 bg-white/[0.01]">
                      <div className="ml-6 pl-4 border-l border-white/[0.06]">
                        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.body}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
