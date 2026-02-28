'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  FileText,
  Shield,
  Receipt,
  Landmark,
  FileSignature,
  Loader2,
  Download,
  Filter,
} from 'lucide-react';

type DocumentCategory = 'customs' | 'certificate' | 'invoice' | 'contract' | 'other';

interface PartnerDocument {
  id: number;
  title: string;
  category: DocumentCategory;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

const CATEGORY_ICONS: Record<DocumentCategory, React.ElementType> = {
  customs: Landmark,
  certificate: Shield,
  invoice: Receipt,
  contract: FileSignature,
  other: FileText,
};

const CATEGORY_STYLES: Record<DocumentCategory, string> = {
  customs: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  certificate: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  invoice: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  contract: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  other: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALL_CATEGORIES: DocumentCategory[] = ['customs', 'certificate', 'invoice', 'contract', 'other'];

export default function PartnerDocumentsPage() {
  const t = useTranslations('partner');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'all'>('all');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partner/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents ?? []);
      }
    } catch {
      console.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filtered = activeCategory === 'all'
    ? documents
    : documents.filter((d) => d.category === activeCategory);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
          {t('documents.title')}
        </h1>
        {!loading && (
          <p className="text-slate-400 text-sm mt-1">
            {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
          </p>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            activeCategory === 'all'
              ? 'bg-gold/[0.12] text-gold border-gold/30'
              : 'text-slate-400 border-white/[0.08] hover:text-cream hover:border-white/[0.15]'
          }`}
        >
          <Filter className="w-3 h-3 inline mr-1.5 -mt-0.5" />
          All
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeCategory === cat
                  ? 'bg-gold/[0.12] text-gold border-gold/30'
                  : 'text-slate-400 border-white/[0.08] hover:text-cream hover:border-white/[0.15]'
              }`}
            >
              <Icon className="w-3 h-3 inline mr-1.5 -mt-0.5" />
              {t(`documents.categories.${cat}` as any)}
            </button>
          );
        })}
      </div>

      {/* Document List */}
      <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('common.loading')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('documents.noDocuments')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((doc) => {
              const Icon = CATEGORY_ICONS[doc.category] || FileText;
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                        CATEGORY_STYLES[doc.category] || 'bg-slate-400/10 text-slate-400 border-slate-400/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-cream text-sm font-medium truncate">{doc.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${
                            CATEGORY_STYLES[doc.category] || 'bg-slate-400/10 text-slate-400 border-slate-400/20'
                          }`}
                        >
                          {t(`documents.categories.${doc.category}` as any)}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {t('documents.fileSize')}: {formatFileSize(doc.fileSizeBytes)}
                        </span>
                        <span className="text-slate-500 text-[11px] hidden sm:inline">
                          {new Date(doc.uploadedAt).toLocaleDateString(dateLocale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </span>
                        <span className="text-slate-500 text-[11px] hidden md:inline">
                          {t('documents.uploadedBy')}: {doc.uploadedBy}
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`/api/partner/documents/${doc.id}/download`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gold border border-gold/20 hover:bg-gold/[0.08] transition-colors flex-shrink-0 ml-4"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('documents.download')}
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
