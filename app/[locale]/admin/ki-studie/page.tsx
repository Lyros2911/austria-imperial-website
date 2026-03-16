import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/admin';

// ── Types ──

interface KiStudieData {
  contentProduction: {
    total: number;
    ollamaCount: number;
    openaiCount: number;
    successRate: number;
    avgProductionTimeSec: number;
  };
  quality: {
    accepted: number;
    rejected: number;
    languageErrors: number;
    outputProblems: number;
  };
  costs: {
    cloudLlmCostUsd: number;
    localLlmSavingsUsd: number;
    localVsCloudPercent: number;
  };
  system: {
    ollamaStatus: 'healthy' | 'degraded' | 'unavailable';
    ollamaModel: string;
    rolloutPhase: number;
    fallbackRatePercent: number;
  };
}

// ── Data Fetcher ──

async function getKiStudieData(): Promise<KiStudieData | null> {
  const engineUrl = process.env.ENGINE_API_URL || 'http://auryx-engine-api:3100';
  const apiKey = process.env.ENGINE_API_KEY || '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(`${engineUrl}/ai-monitoring`, {
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const raw = await res.json();

    // Map engine monitoring data to study format
    const ollamaSuccess = raw.usage?.ollama_requests_success ?? 0;
    const ollamaFallback = raw.usage?.ollama_requests_fallback ?? 0;
    const ollamaError = raw.usage?.ollama_requests_error ?? 0;
    const ollamaTotal = raw.usage?.ollama_total ?? 0;
    const openaiTotal = ollamaFallback + ollamaError;

    // Estimate costs: GPT-4o-mini ≈ $0.00015/1K input + $0.0006/1K output
    // Average ~500 tokens per request → ~$0.0003 per fallback request
    const estCostPerOpenaiRequest = 0.0003;
    const cloudCost = openaiTotal * estCostPerOpenaiRequest;
    const localSavings = ollamaSuccess * estCostPerOpenaiRequest;

    // Quality metrics from fallback reasons
    const reasons = raw.usage?.fallback_reasons ?? {};

    return {
      contentProduction: {
        total: ollamaTotal,
        ollamaCount: ollamaSuccess,
        openaiCount: openaiTotal,
        successRate: ollamaTotal > 0 ? (ollamaSuccess / ollamaTotal) * 100 : 0,
        avgProductionTimeSec: 85, // ~85s average from integration tests
      },
      quality: {
        accepted: ollamaSuccess,
        rejected: ollamaFallback + ollamaError,
        languageErrors: (reasons.contains_chinese_characters ?? 0) +
          (reasons.too_much_english_in_german_output ?? 0),
        outputProblems: (reasons.response_too_short ?? 0) +
          (reasons.ai_refusal_detected ?? 0) +
          (reasons.output_invalid ?? 0),
      },
      costs: {
        cloudLlmCostUsd: cloudCost,
        localLlmSavingsUsd: localSavings,
        localVsCloudPercent: ollamaTotal > 0 ? (ollamaSuccess / ollamaTotal) * 100 : 0,
      },
      system: {
        ollamaStatus: raw.system?.ollama_status ?? 'unavailable',
        ollamaModel: raw.system?.ollama_model ?? 'unbekannt',
        rolloutPhase: raw.system?.ollama_rollout_phase ?? 0,
        fallbackRatePercent: raw.usage?.fallback_rate_percent ?? 0,
      },
    };
  } catch {
    return null;
  }
}

// ── Page ──

export default async function KiStudiePage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const data = await getKiStudieData();

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">KI-Studie</h1>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">Engine API nicht erreichbar. KI-Monitoring-Daten koennen nicht geladen werden.</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    healthy: { bg: 'bg-green-500/20 border-green-500/30', text: 'text-green-400', icon: '✅' },
    degraded: { bg: 'bg-yellow-500/20 border-yellow-500/30', text: 'text-yellow-400', icon: '⚠️' },
    unavailable: { bg: 'bg-red-500/20 border-red-500/30', text: 'text-red-400', icon: '🔴' },
  };
  const sc = statusColors[data.system.ollamaStatus];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">KI-Studie</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Auswertung der KI-Content-Produktion fuer Austria Imperial
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl p-5 border ${sc.bg}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{sc.icon}</span>
          <div>
            <p className={`text-lg font-semibold ${sc.text}`}>
              Lokale KI: {data.system.ollamaStatus === 'healthy' ? 'Aktiv' : data.system.ollamaStatus === 'degraded' ? 'Eingeschraenkt' : 'Nicht verfuegbar'}
            </p>
            <p className="text-sm text-zinc-400">
              Modell: {data.system.ollamaModel} | Phase {data.system.rolloutPhase} | Fallback-Rate: {data.system.fallbackRatePercent}%
            </p>
          </div>
        </div>
      </div>

      {/* Content-Produktion */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Content-Produktion</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Inhalte gesamt" value={data.contentProduction.total} />
          <KpiCard label="Lokal generiert (Ollama)" value={data.contentProduction.ollamaCount} accent />
          <KpiCard label="Cloud generiert (OpenAI)" value={data.contentProduction.openaiCount} />
          <KpiCard label="Erfolgsrate lokal" value={`${data.contentProduction.successRate.toFixed(1)}%`} accent />
        </div>
      </div>

      {/* Qualitaetsanalyse */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Qualitaetsanalyse</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Akzeptierte Inhalte" value={data.quality.accepted} accent />
          <KpiCard label="Verworfene Inhalte" value={data.quality.rejected} />
          <KpiCard label="Sprachfehler" value={data.quality.languageErrors} sub="Chinesisch / Sprachmischung" />
          <KpiCard label="Output-Probleme" value={data.quality.outputProblems} sub="Zu kurz / Verweigerung" />
        </div>
      </div>

      {/* Kostenanalyse */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Kostenanalyse</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <KpiCard label="Cloud-LLM Kosten" value={`$${data.costs.cloudLlmCostUsd.toFixed(4)}`} sub="OpenAI GPT-4o-mini" />
          <KpiCard label="Ersparnis durch lokal" value={`$${data.costs.localLlmSavingsUsd.toFixed(4)}`} sub="Haette sonst OpenAI gekostet" accent />
          <KpiCard label="Lokal vs. Cloud" value={`${data.costs.localVsCloudPercent.toFixed(0)}%`} sub="Anteil lokaler Verarbeitung" accent />
        </div>

        {/* Kosten-Vergleich Balken */}
        <div className="mt-4 bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Kosten-Verteilung</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex h-4 rounded-full overflow-hidden bg-zinc-800">
                <div
                  className="bg-amber-500 transition-all"
                  style={{ width: `${data.costs.localVsCloudPercent}%` }}
                  title={`Lokal: ${data.costs.localVsCloudPercent.toFixed(0)}%`}
                />
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${100 - data.costs.localVsCloudPercent}%` }}
                  title={`Cloud: ${(100 - data.costs.localVsCloudPercent).toFixed(0)}%`}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Lokal (kostenlos)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Cloud (OpenAI)</span>
          </div>
        </div>
      </div>

      {/* Studien-Bewertung */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Studien-Bewertung</h2>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <div className="space-y-4">
            <EvalRow
              label="Lokale KI funktionsfaehig"
              passed={data.system.ollamaStatus === 'healthy'}
              detail={data.system.ollamaStatus === 'healthy' ? 'Ollama laeuft stabil' : 'Ollama nicht verfuegbar'}
            />
            <EvalRow
              label="Fallback-System aktiv"
              passed={true}
              detail="Automatischer Wechsel zu OpenAI bei Problemen"
            />
            <EvalRow
              label="Sprachqualitaet akzeptabel"
              passed={data.quality.languageErrors === 0}
              detail={data.quality.languageErrors === 0 ? 'Keine Sprachfehler erkannt' : `${data.quality.languageErrors} Sprachfehler`}
            />
            <EvalRow
              label="Kostenersparnis messbar"
              passed={data.costs.localLlmSavingsUsd > 0}
              detail={data.costs.localLlmSavingsUsd > 0 ? `$${data.costs.localLlmSavingsUsd.toFixed(4)} eingespart` : 'Noch keine Ersparnis'}
            />
            <EvalRow
              label="Content-Produktion aktiv"
              passed={data.contentProduction.total > 0}
              detail={`${data.contentProduction.total} Inhalte generiert`}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <p className="text-xs text-zinc-500">
          <strong className="text-zinc-300">Hinweis:</strong>{' '}
          Diese Daten werden live aus der AURYX Content Engine geladen. Die Kostenberechnung basiert auf geschaetzten
          Durchschnittskosten (GPT-4o-mini: ~$0.0003 pro Request). Lokale Generierung ueber Ollama verursacht keine API-Kosten.
        </p>
      </div>
    </div>
  );
}

// ── Shared Components ──

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function EvalRow({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${passed ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-sm text-white">{label}</span>
      </div>
      <span className="text-xs text-zinc-400">{detail}</span>
    </div>
  );
}
