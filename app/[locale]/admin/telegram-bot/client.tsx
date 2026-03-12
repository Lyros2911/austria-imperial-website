'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, Unlink } from 'lucide-react';

interface Props {
  initialConnected: boolean;
  initialChatId: string | null;
}

export default function TelegramBotClient({ initialConnected, initialChatId }: Props) {
  const t = useTranslations('admin.telegramBot');
  const [connected, setConnected] = useState(initialConnected);
  const [chatId, setChatId] = useState(initialChatId ?? '');
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !/^\d{1,20}$/.test(trimmed)) {
      setError(t('activation.invalidChatId'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/telegram-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Fehler');
        return;
      }

      const data = await res.json();
      setConnected(data.connected);
      setChatId(data.chatId);
      setInputValue('');
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/telegram-bot', { method: 'DELETE' });
      if (res.ok) {
        setConnected(false);
        setChatId('');
      }
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setSaving(false);
    }
  };

  if (connected) {
    return (
      <div className="flex items-center justify-between bg-emerald-400/[0.04] border border-emerald-400/10 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-cream text-sm font-medium">{t('activation.connectedAs')}</p>
            <p className="text-muted text-xs">Chat-ID: <code className="text-emerald-400/80">{chatId}</code></p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-400/20 text-red-400 text-xs font-medium hover:bg-red-400/10 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
          {t('activation.disconnect')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError('');
          }}
          placeholder={t('activation.chatIdPlaceholder')}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/40 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        {error && (
          <p className="absolute -bottom-5 left-0 text-red-400 text-[10px]">{error}</p>
        )}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || !inputValue.trim()}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        {t('activation.save')}
      </button>
    </div>
  );
}
