export const dynamic = 'force-dynamic';

import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { adminUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Bot, ExternalLink, Camera, Mic, FileText, Sun, Car, UtensilsCrossed, Globe, Moon, BarChart3 } from 'lucide-react';
import TelegramBotClient from './client';

export default async function TelegramBotPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const t = await getTranslations('admin.telegramBot');

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, session.userId),
    columns: { telegramChatId: true },
  });

  const connected = !!user?.telegramChatId;
  const chatId = user?.telegramChatId ?? null;

  const commands = [
    {
      name: '/tasting',
      description: t('commands.tasting.description'),
      syntax: '/tasting [Stadt], [Ort-Typ], [Produkte], [Bewertung 1-5], [Notiz]',
      example: '/tasting Wien, Restaurant, Kernoel + Kren, 4, Super Reaktion',
      table: 'Expedition_Tastings',
    },
    {
      name: '/translation',
      description: t('commands.translation.description'),
      syntax: '/translation [Sprache], [Tool], [Situation], [Score 1-10], [Notiz]',
      example: '/translation Slowenisch, DeepL, Tasting, 7, Offline gut',
      table: 'KI_Uebersetzung_Tests',
    },
    {
      name: '/ausgabe',
      description: t('commands.ausgabe.description'),
      syntax: '/ausgabe [Betrag] [Waehrung] [Kategorie], [Land]',
      example: '/ausgabe 45 EUR Diesel, Kroatien',
      table: 'Budget_Tracking',
    },
    {
      name: '/performance',
      description: t('commands.performance.description'),
      syntax: '/performance [HRV] [Schlaf] [Schritte] [Training Ja/Nein] [Wohlbefinden 1-5]',
      example: '/performance 65 82 8500 Ja 4',
      table: 'Performance_Tracking',
    },
    {
      name: '/exp_status',
      description: t('commands.expStatus.description'),
      syntax: '/exp_status',
      example: '/exp_status',
      table: null,
    },
    {
      name: '/content',
      description: t('commands.content.description'),
      syntax: '/content [Thema]',
      example: '/content Kuerbiskernoel-Tasting in Istanbul',
      table: 'Content_Log',
    },
    {
      name: '/report',
      description: t('commands.report.description'),
      syntax: '/report',
      example: '/report',
      table: null,
    },
    {
      name: '/exp_help',
      description: t('commands.expHelp.description'),
      syntax: '/exp_help',
      example: '/exp_help',
      table: null,
    },
  ];

  const workflow = [
    { icon: Sun, time: t('workflow.morning.time'), title: t('workflow.morning.title'), description: t('workflow.morning.description'), command: '/exp_status' },
    { icon: Car, time: t('workflow.driving.time'), title: t('workflow.driving.title'), description: t('workflow.driving.description'), command: '/ausgabe' },
    { icon: UtensilsCrossed, time: t('workflow.tasting.time'), title: t('workflow.tasting.title'), description: t('workflow.tasting.description'), command: '/tasting' },
    { icon: Globe, time: t('workflow.translation.time'), title: t('workflow.translation.title'), description: t('workflow.translation.description'), command: '/translation' },
    { icon: Moon, time: t('workflow.evening.time'), title: t('workflow.evening.title'), description: t('workflow.evening.description'), command: '/performance' },
    { icon: BarChart3, time: t('workflow.weekly.time'), title: t('workflow.weekly.title'), description: t('workflow.weekly.description'), command: '/report' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
              {t('title')}
            </h1>
            <p className="text-muted text-sm">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* ─── A) Activation Section ─── */}
      <section className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-cream font-medium text-base">{t('activation.title')}</h2>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            connected
              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
              : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {connected ? t('activation.connected') : t('activation.notConnected')}
          </span>
        </div>

        {/* 3-Step Activation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold">1</span>
              <span className="text-cream text-sm font-medium">{t('activation.step1')}</span>
            </div>
            <p className="text-muted text-xs mb-3">{t('activation.step1Desc')}</p>
            <a
              href="https://t.me/auryx_ai_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc] text-xs font-medium hover:bg-[#0088cc]/20 transition-colors"
            >
              {t('activation.openBot')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold">2</span>
              <span className="text-cream text-sm font-medium">{t('activation.step2')}</span>
            </div>
            <p className="text-muted text-xs">{t('activation.step2Desc')}</p>
            <code className="block mt-2 text-gold text-xs bg-white/[0.04] rounded px-2 py-1">/start</code>
          </div>
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold">3</span>
              <span className="text-cream text-sm font-medium">{t('activation.step3')}</span>
            </div>
            <p className="text-muted text-xs">{t('activation.step3Desc')}</p>
          </div>
        </div>

        {/* Client Component for interaction */}
        <TelegramBotClient initialConnected={connected} initialChatId={chatId} />
      </section>

      {/* ─── B) Expedition Commands (8 Cards Grid) ─── */}
      <section>
        <h2 className="text-cream font-medium text-base mb-1">{t('commands.title')}</h2>
        <p className="text-muted text-xs mb-4">{t('commands.subtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commands.map((cmd) => (
            <div key={cmd.name} className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <code className="text-gold font-bold text-sm">{cmd.name}</code>
                {cmd.table && (
                  <span className="text-[10px] text-muted/50 bg-white/[0.04] rounded px-1.5 py-0.5">
                    {cmd.table}
                  </span>
                )}
              </div>
              <p className="text-cream text-xs mb-3">{cmd.description}</p>
              <div className="space-y-1.5">
                <div>
                  <span className="text-muted text-[10px] uppercase tracking-wider">Syntax</span>
                  <code className="block text-[11px] text-muted bg-white/[0.04] rounded px-2 py-1.5 mt-0.5 break-all">
                    {cmd.syntax}
                  </code>
                </div>
                <div>
                  <span className="text-muted text-[10px] uppercase tracking-wider">{t('commands.exampleLabel')}</span>
                  <code className="block text-[11px] text-gold/80 bg-gold/[0.04] border border-gold/10 rounded px-2 py-1.5 mt-0.5 break-all">
                    {cmd.example}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── C) Multimedia Features ─── */}
      <section>
        <h2 className="text-cream font-medium text-base mb-1">{t('multimedia.title')}</h2>
        <p className="text-muted text-xs mb-4">{t('multimedia.subtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
              <Camera className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-cream text-sm font-medium mb-1">{t('multimedia.photo.title')}</h3>
            <p className="text-muted text-xs leading-relaxed">{t('multimedia.photo.description')}</p>
          </div>
          <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
              <Mic className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-cream text-sm font-medium mb-1">{t('multimedia.voice.title')}</h3>
            <p className="text-muted text-xs leading-relaxed">{t('multimedia.voice.description')}</p>
          </div>
          <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-cream text-sm font-medium mb-1">{t('multimedia.documents.title')}</h3>
            <p className="text-muted text-xs leading-relaxed">{t('multimedia.documents.description')}</p>
          </div>
        </div>
      </section>

      {/* ─── D) Daily Workflow Timeline ─── */}
      <section className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-cream font-medium text-base mb-1">{t('workflow.title')}</h2>
        <p className="text-muted text-xs mb-6">{t('workflow.subtitle')}</p>
        <div className="relative">
          {/* Gold timeline line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gold/20" />
          <div className="space-y-5">
            {workflow.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 z-10">
                    <StepIcon className="w-4 h-4 text-gold" />
                  </div>
                  <div className="pt-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gold text-[10px] font-semibold uppercase tracking-wider">{step.time}</span>
                      <span className="text-cream text-sm font-medium">{step.title}</span>
                    </div>
                    <p className="text-muted text-xs mt-0.5">{step.description}</p>
                    <code className="inline-block mt-1.5 text-[11px] text-gold/70 bg-gold/[0.04] border border-gold/10 rounded px-2 py-0.5">
                      {step.command}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
