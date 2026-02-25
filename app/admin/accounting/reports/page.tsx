'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Download,
  RefreshCw,
  Shield,
  Clock,
  Archive,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Report {
  id: string;
  year: number;
  month: number;
  totalRevenueCents: number;
  totalGrossProfitCents: number;
  totalPeterCents: number;
  totalAiggCents: number;
  ledgerEntriesCount: number;
  reportHash: string;
  generatedAt: string;
  generatedBy: string;
  status: string;
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reports/list');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
      }
    } catch {
      console.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    // Check admin role
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.role === 'admin'))
      .catch(() => {});
  }, [fetchReports]);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: genYear, month: genMonth }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler bei der Generierung');
      }

      setMessage({
        type: 'success',
        text: `Report ${genYear}-${String(genMonth).padStart(2, '0')} generiert. Hash: ${data.hash.substring(0, 16)}...`,
      });

      // Refresh list
      await fetchReports();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/accounting"
          className="inline-flex items-center gap-1.5 text-muted text-xs hover:text-cream transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Zurück zu Accounting
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-gold" />
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            Monatsberichte
          </h1>
        </div>
        <p className="text-muted text-sm">
          Revisionssichere Reports mit SHA256-Integrität. Basiert ausschließlich auf dem Financial Ledger.
        </p>
      </div>

      {/* Generate Form — nur für Admins */}
      {isAdmin && (
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6 mb-6">
        <h3 className="text-cream text-sm font-medium mb-4">Neuen Report generieren</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
              Monat
            </label>
            <select
              value={genMonth}
              onChange={(e) => setGenMonth(parseInt(e.target.value))}
              className="bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('de-AT', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
              Jahr
            </label>
            <select
              value={genYear}
              onChange={(e) => setGenYear(parseInt(e.target.value))}
              className="bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-gold hover:bg-gold-light disabled:bg-gold/40 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-300"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Generieren
              </>
            )}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
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

        <p className="text-muted/50 text-[10px] mt-3">
          Bei Neugenerierung wird der vorherige Report archiviert (nie gelöscht). Der neue Report bekommt einen neuen SHA256-Hash.
        </p>
      </div>
      )}

      {/* Reports List */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-cream text-sm font-medium">Alle Reports</h3>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
            <p className="text-muted text-sm">Lade Reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">Noch keine Reports generiert</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {reports.map((report) => {
              const isArchived = report.status === 'archived';
              const monthName = new Date(report.year, report.month - 1).toLocaleDateString(
                'de-AT',
                { month: 'long', year: 'numeric' }
              );

              return (
                <div
                  key={report.id}
                  className={`px-5 py-4 ${isArchived ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-cream text-sm font-medium">{monthName}</h4>
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-gray-400/10 text-gray-400 border border-gray-400/20">
                            <Archive className="w-2.5 h-2.5" />
                            Archiviert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Aktuell
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-muted">
                        <span>Umsatz: {formatEur(report.totalRevenueCents)}</span>
                        <span>Gewinn: {formatEur(report.totalGrossProfitCents)}</span>
                        <span>Peter: {formatEur(report.totalPeterCents)}</span>
                        <span>{report.ledgerEntriesCount} Einträge</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted/50">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(report.generatedAt).toLocaleString('de-AT')}
                        </span>
                        <span>von {report.generatedBy}</span>
                        <span className="font-mono">SHA256: {report.reportHash.substring(0, 16)}...</span>
                      </div>
                    </div>

                    {/* Downloads */}
                    <div className="flex gap-2">
                      <a
                        href={`/api/admin/reports/${report.id}/csv?type=summary`}
                        className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 text-gold rounded px-3 py-1.5 text-[10px] hover:bg-gold/20 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Summary CSV
                      </a>
                      <a
                        href={`/api/admin/reports/${report.id}/csv?type=detailed`}
                        className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] text-cream rounded px-3 py-1.5 text-[10px] hover:bg-white/[0.06] transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Ledger CSV
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
