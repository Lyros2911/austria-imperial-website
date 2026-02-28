'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Factory,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Mail,
  Globe,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────

interface Producer {
  id: number;
  slug: string;
  displayName: string;
  displayNameDe: string;
  displayNameEn: string;
  displayNameAr: string | null;
  contactEmail: string | null;
  apiUrl: string | null;
  mode: 'api' | 'email';
  airtableTableName: string | null;
  logoUrl: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  commissionPercent: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  productCount: number;
}

// ─── Auto-slug generation ─────────────────────

function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Component ────────────────────────────────

export default function ProducersPage() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Create form state ─────────────────────
  const [createSlug, setCreateSlug] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createDisplayNameDe, setCreateDisplayNameDe] = useState('');
  const [createDisplayNameEn, setCreateDisplayNameEn] = useState('');
  const [createDisplayNameAr, setCreateDisplayNameAr] = useState('');
  const [createContactEmail, setCreateContactEmail] = useState('');
  const [createMode, setCreateMode] = useState<'email' | 'api'>('email');
  const [createApiUrl, setCreateApiUrl] = useState('');
  const [createApiKey, setCreateApiKey] = useState('');
  const [createAirtableTableName, setCreateAirtableTableName] = useState('');
  const [createCommissionPercent, setCreateCommissionPercent] = useState('0');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // ─── Edit form state ───────────────────────
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDisplayNameDe, setEditDisplayNameDe] = useState('');
  const [editDisplayNameEn, setEditDisplayNameEn] = useState('');
  const [editDisplayNameAr, setEditDisplayNameAr] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editMode, setEditMode] = useState<'email' | 'api'>('email');
  const [editApiUrl, setEditApiUrl] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editAirtableTableName, setEditAirtableTableName] = useState('');
  const [editCommissionPercent, setEditCommissionPercent] = useState('0');

  // ─── Fetch producers ──────────────────────

  const fetchProducers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/producers');
      if (res.ok) {
        const data = await res.json();
        setProducers(data.producers);
      }
    } catch {
      console.error('Failed to fetch producers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducers();
  }, [fetchProducers]);

  // ─── Auto-slug from display name ──────────

  const handleDisplayNameChange = (value: string) => {
    setCreateDisplayName(value);
    if (!slugManuallyEdited) {
      setCreateSlug(generateSlug(value));
    }
  };

  // ─── Reset create form ────────────────────

  const resetCreateForm = () => {
    setCreateSlug('');
    setCreateDisplayName('');
    setCreateDisplayNameDe('');
    setCreateDisplayNameEn('');
    setCreateDisplayNameAr('');
    setCreateContactEmail('');
    setCreateMode('email');
    setCreateApiUrl('');
    setCreateApiKey('');
    setCreateAirtableTableName('');
    setCreateCommissionPercent('0');
    setSlugManuallyEdited(false);
  };

  // ─── Create producer ──────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/producers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: createSlug,
          displayName: createDisplayName,
          displayNameDe: createDisplayNameDe,
          displayNameEn: createDisplayNameEn,
          displayNameAr: createDisplayNameAr || null,
          contactEmail: createContactEmail || null,
          mode: createMode,
          apiUrl: createMode === 'api' ? createApiUrl || null : null,
          apiKey: createMode === 'api' ? createApiKey || null : null,
          airtableTableName: createAirtableTableName || null,
          commissionPercent: createCommissionPercent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setMessage({ type: 'success', text: `Produzent "${createDisplayName}" erfolgreich erstellt.` });
      resetCreateForm();
      setShowCreateForm(false);
      await fetchProducers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Load edit form for a producer ────────

  const openEditForm = (producer: Producer) => {
    if (expandedId === producer.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(producer.id);
    setEditDisplayName(producer.displayName);
    setEditDisplayNameDe(producer.displayNameDe);
    setEditDisplayNameEn(producer.displayNameEn);
    setEditDisplayNameAr(producer.displayNameAr || '');
    setEditContactEmail(producer.contactEmail || '');
    setEditMode(producer.mode);
    setEditApiUrl(producer.apiUrl || '');
    setEditApiKey('');
    setEditAirtableTableName(producer.airtableTableName || '');
    setEditCommissionPercent(producer.commissionPercent);
  };

  // ─── Update producer ──────────────────────

  const handleUpdate = async (e: React.FormEvent, producerId: number) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const body: Record<string, unknown> = {
        id: producerId,
        displayName: editDisplayName,
        displayNameDe: editDisplayNameDe,
        displayNameEn: editDisplayNameEn,
        displayNameAr: editDisplayNameAr || null,
        contactEmail: editContactEmail || null,
        mode: editMode,
        apiUrl: editMode === 'api' ? editApiUrl || null : null,
        airtableTableName: editAirtableTableName || null,
        commissionPercent: editCommissionPercent,
      };

      // Only send apiKey if user entered a new one
      if (editApiKey) {
        body.apiKey = editApiKey;
      }

      const res = await fetch('/api/admin/producers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      setMessage({ type: 'success', text: 'Produzent erfolgreich aktualisiert.' });
      setExpandedId(null);
      await fetchProducers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Toggle active/inactive ───────────────

  const handleToggleActive = async (producer: Producer) => {
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/producers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: producer.id,
          isActive: !producer.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }

      setMessage({
        type: 'success',
        text: producer.isActive
          ? `"${producer.displayName}" deaktiviert.`
          : `"${producer.displayName}" aktiviert.`,
      });
      await fetchProducers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            Produzenten
          </h1>
          <p className="text-muted text-sm mt-1">
            Produzenten verwalten und neue onboarden
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            if (!showCreateForm) resetCreateForm();
          }}
          className="flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 font-semibold text-sm px-4 py-2.5 rounded-lg transition-all duration-300"
        >
          {showCreateForm ? (
            <>
              <X className="w-4 h-4" />
              Abbrechen
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Neuer Produzent
            </>
          )}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-900/20 border border-emerald-800/30 text-emerald-300'
              : 'bg-red-900/20 border border-red-800/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* ─── Create Form ─────────────────────── */}
      {showCreateForm && (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6 mb-6">
          <h3 className="font-[var(--font-heading)] text-cream text-sm font-medium mb-4">
            Neuen Produzenten onboarden
          </h3>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Display Name */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Anzeigename *
                </label>
                <input
                  type="text"
                  value={createDisplayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  required
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="z.B. Kiendler"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Slug *
                </label>
                <input
                  type="text"
                  value={createSlug}
                  onChange={(e) => {
                    setCreateSlug(e.target.value);
                    setSlugManuallyEdited(true);
                  }}
                  required
                  pattern="^[a-z][a-z0-9_-]{1,48}$"
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm font-mono focus:border-gold/40 focus:outline-none"
                  placeholder="z.B. kiendler"
                />
                <p className="text-muted/50 text-[10px] mt-1">
                  Kleinbuchstaben, Zahlen, Bindestrich. Wird als PostgreSQL-Enum-Wert verwendet.
                </p>
              </div>

              {/* Display Name DE */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Anzeigename (DE) *
                </label>
                <input
                  type="text"
                  value={createDisplayNameDe}
                  onChange={(e) => setCreateDisplayNameDe(e.target.value)}
                  required
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="Familie Kiendler"
                />
              </div>

              {/* Display Name EN */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Anzeigename (EN) *
                </label>
                <input
                  type="text"
                  value={createDisplayNameEn}
                  onChange={(e) => setCreateDisplayNameEn(e.target.value)}
                  required
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="Kiendler Family"
                />
              </div>

              {/* Display Name AR */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Anzeigename (AR)
                </label>
                <input
                  type="text"
                  value={createDisplayNameAr}
                  onChange={(e) => setCreateDisplayNameAr(e.target.value)}
                  dir="rtl"
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="Optional"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={createContactEmail}
                  onChange={(e) => setCreateContactEmail(e.target.value)}
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="produzent@example.com"
                />
              </div>

              {/* Mode */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Modus *
                </label>
                <select
                  value={createMode}
                  onChange={(e) => setCreateMode(e.target.value as 'email' | 'api')}
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                >
                  <option value="email">E-Mail-Fallback</option>
                  <option value="api">API</option>
                </select>
              </div>

              {/* Commission % */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Provision %
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={createCommissionPercent}
                  onChange={(e) => setCreateCommissionPercent(e.target.value)}
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                />
              </div>

              {/* API URL (conditional) */}
              {createMode === 'api' && (
                <>
                  <div>
                    <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                      API URL
                    </label>
                    <input
                      type="url"
                      value={createApiUrl}
                      onChange={(e) => setCreateApiUrl(e.target.value)}
                      className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                      placeholder="https://api.example.com/orders"
                    />
                  </div>

                  <div>
                    <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={createApiKey}
                      onChange={(e) => setCreateApiKey(e.target.value)}
                      className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                      placeholder="sk_..."
                    />
                  </div>
                </>
              )}

              {/* Airtable Table Name */}
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Airtable Tabellenname
                </label>
                <input
                  type="text"
                  value={createAirtableTableName}
                  onChange={(e) => setCreateAirtableTableName(e.target.value)}
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Erstelle...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Produzent erstellen
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-muted text-sm hover:text-cream transition-colors px-3 py-2"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Producer Grid ───────────────────── */}
      {loading ? (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl px-6 py-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
          <p className="text-muted text-sm">Lade Produzenten...</p>
        </div>
      ) : producers.length === 0 ? (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl px-6 py-16 text-center">
          <Factory className="w-8 h-8 text-muted/30 mx-auto mb-3" />
          <p className="text-muted text-sm">Noch keine Produzenten angelegt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {producers.map((producer) => {
            const isExpanded = expandedId === producer.id;

            return (
              <div
                key={producer.id}
                className={`bg-[#0e0e0e] border rounded-xl transition-colors ${
                  producer.isActive
                    ? 'border-white/[0.06]'
                    : 'border-red-400/10 opacity-60'
                }`}
              >
                {/* Card Header */}
                <button
                  onClick={() => openEditForm(producer)}
                  className="w-full text-left px-5 py-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gold/10 border border-gold/20">
                        <Factory className="w-4 h-4 text-gold" />
                      </div>

                      {/* Name and slug */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-cream text-sm font-medium">
                            {producer.displayName}
                          </h4>
                          <span className="text-muted/50 text-[11px] font-mono bg-white/[0.03] px-1.5 py-0.5 rounded">
                            {producer.slug}
                          </span>

                          {/* Mode badge */}
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${
                              producer.mode === 'api'
                                ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                                : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                            }`}
                          >
                            {producer.mode === 'api' ? 'API' : 'E-Mail'}
                          </span>

                          {/* Active badge */}
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${
                              producer.isActive
                                ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                                : 'bg-red-400/10 text-red-400 border-red-400/20'
                            }`}
                          >
                            {producer.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 mt-1 text-muted text-[11px]">
                          {producer.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {producer.contactEmail}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {producer.productCount} Produkte
                          </span>
                          <span>
                            Provision: {producer.commissionPercent}%
                          </span>
                          <span>
                            Erstellt am{' '}
                            {new Date(producer.createdAt).toLocaleDateString('de-AT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expand/collapse icon */}
                    <div className="text-muted">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>

                {/* ─── Edit Form (expanded) ──────── */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] px-5 py-5">
                    <form
                      onSubmit={(e) => handleUpdate(e, producer.id)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Slug (readonly) */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Slug
                          </label>
                          <input
                            type="text"
                            value={producer.slug}
                            disabled
                            className="w-full bg-[#080808] border border-white/[0.04] rounded-lg px-3 py-2 text-muted text-sm font-mono cursor-not-allowed"
                          />
                          <p className="text-muted/50 text-[10px] mt-1">
                            Slug kann nicht geaendert werden (PostgreSQL-Enum).
                          </p>
                        </div>

                        {/* Display Name */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Anzeigename
                          </label>
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            required
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          />
                        </div>

                        {/* Display Name DE */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Anzeigename (DE)
                          </label>
                          <input
                            type="text"
                            value={editDisplayNameDe}
                            onChange={(e) => setEditDisplayNameDe(e.target.value)}
                            required
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          />
                        </div>

                        {/* Display Name EN */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Anzeigename (EN)
                          </label>
                          <input
                            type="text"
                            value={editDisplayNameEn}
                            onChange={(e) => setEditDisplayNameEn(e.target.value)}
                            required
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          />
                        </div>

                        {/* Display Name AR */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Anzeigename (AR)
                          </label>
                          <input
                            type="text"
                            value={editDisplayNameAr}
                            onChange={(e) => setEditDisplayNameAr(e.target.value)}
                            dir="rtl"
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="Optional"
                          />
                        </div>

                        {/* Contact Email */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            E-Mail
                          </label>
                          <input
                            type="email"
                            value={editContactEmail}
                            onChange={(e) => setEditContactEmail(e.target.value)}
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          />
                        </div>

                        {/* Mode */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Modus
                          </label>
                          <select
                            value={editMode}
                            onChange={(e) => setEditMode(e.target.value as 'email' | 'api')}
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          >
                            <option value="email">E-Mail-Fallback</option>
                            <option value="api">API</option>
                          </select>
                        </div>

                        {/* Commission % */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Provision %
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editCommissionPercent}
                            onChange={(e) => setEditCommissionPercent(e.target.value)}
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          />
                        </div>

                        {/* API fields (conditional) */}
                        {editMode === 'api' && (
                          <>
                            <div>
                              <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                                API URL
                              </label>
                              <input
                                type="url"
                                value={editApiUrl}
                                onChange={(e) => setEditApiUrl(e.target.value)}
                                className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                                placeholder="https://api.example.com/orders"
                              />
                            </div>

                            <div>
                              <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                                API Key (neu setzen)
                              </label>
                              <input
                                type="password"
                                value={editApiKey}
                                onChange={(e) => setEditApiKey(e.target.value)}
                                className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                                placeholder="Leer lassen um bestehenden Key zu behalten"
                              />
                            </div>
                          </>
                        )}

                        {/* Airtable Table Name */}
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Airtable Tabellenname
                          </label>
                          <input
                            type="text"
                            value={editAirtableTableName}
                            onChange={(e) => setEditAirtableTableName(e.target.value)}
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-300"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Speichere...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Speichern
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(producer)}
                          disabled={submitting}
                          className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border font-medium transition-all duration-300 disabled:opacity-40 ${
                            producer.isActive
                              ? 'text-red-400 border-red-400/20 hover:bg-red-400/10'
                              : 'text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10'
                          }`}
                        >
                          {producer.isActive ? (
                            <>
                              <X className="w-4 h-4" />
                              Deaktivieren
                            </>
                          ) : (
                            <>
                              <Globe className="w-4 h-4" />
                              Aktivieren
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedId(null)}
                          className="text-muted text-sm hover:text-cream transition-colors px-3 py-2"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
