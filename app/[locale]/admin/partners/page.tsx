'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Globe,
  Users,
  FileText,
  MessageSquare,
  ShoppingCart,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Upload,
  Send,
  Plus,
  ChevronDown,
  ChevronUp,
  UserX,
  UserCheck,
  Tag,
  Clock,
  Mail,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────

interface Partner {
  id: number;
  partnerCode: string;
  partnerName: string;
  commissionPercent: string;
  stripeConnectedAccountId: string | null;
  isPlatformOwner: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  documentCount: number;
  messageCount: number;
  orderCount: number;
  lastActivity: string | null;
}

interface PartnerUser {
  id: number;
  email: string;
  name: string | null;
  companyName: string | null;
  partnerConfigId: number;
  locale: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

interface PartnerDocument {
  id: number;
  partnerConfigId: number;
  title: string;
  category: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string;
  createdAt: string;
}

interface PartnerMsg {
  id: number;
  partnerConfigId: number;
  senderType: string;
  senderName: string;
  subject: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface PartnerOrder {
  id: number;
  partnerConfigId: number;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  notes: string | null;
  submittedBy: string | null;
  confirmedBy: string | null;
  createdAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

interface PriceListEntry {
  id: number;
  partnerConfigId: number;
  productVariantId: number;
  exportPriceCents: number;
  currency: string;
  minOrderQuantity: number;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
  variantName: string;
  variantSku: string;
  productName: string;
  productId: number;
}

interface ProductVariantOption {
  id: number;
  nameEn: string;
  sku: string;
  priceCents: number;
  productName: string;
}

// ─── Helper Components ───────────────────────────

function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-white/[0.04] text-muted border-white/[0.08]',
    submitted: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    confirmed: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    processing: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    shipped: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    delivered: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    cancelled: 'bg-red-400/10 text-red-400 border-red-400/20',
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${colors[status] || 'bg-white/[0.04] text-muted border-white/[0.08]'} ${className}`}
    >
      {status}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    customs: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    certificate: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    invoice: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    contract: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    other: 'bg-white/[0.04] text-muted border-white/[0.08]',
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${colors[category] || colors.other}`}
    >
      {category}
    </span>
  );
}

function SenderBadge({ type }: { type: string }) {
  if (type === 'admin') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-medium bg-gold/10 text-gold border border-gold/20">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-medium bg-blue-400/10 text-blue-400 border border-blue-400/20">
      Partner
    </span>
  );
}

// ─── Main Page Component ─────────────────────────

export default function PartnersPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  // Data state
  const [partners, setPartners] = useState<Partner[]>([]);
  const [users, setUsers] = useState<PartnerUser[]>([]);
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [messages, setMessages] = useState<PartnerMsg[]>([]);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListEntry[]>([]);
  const [productVariantOptions, setProductVariantOptions] = useState<ProductVariantOption[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>('users');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [showMsgForm, setShowMsgForm] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);

  // User form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserLocale, setNewUserLocale] = useState('de');

  // Document form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<string>('other');
  const [newDocFileName, setNewDocFileName] = useState('');

  // Message form
  const [newMsgSubject, setNewMsgSubject] = useState('');
  const [newMsgBody, setNewMsgBody] = useState('');

  // Price form
  const [newPriceVariantId, setNewPriceVariantId] = useState<number>(0);
  const [newPriceAmount, setNewPriceAmount] = useState('');
  const [newPriceMinQty, setNewPriceMinQty] = useState('1');
  const [newPriceCurrency, setNewPriceCurrency] = useState('EUR');

  // ─── Data Fetching ─────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/partners');
      if (res.ok) {
        const data = await res.json();
        setPartners(data.partners || []);
        setUsers(data.users || []);
        setDocuments(data.documents || []);
        setMessages(data.messages || []);
        setOrders(data.orders || []);
        setPriceLists(data.priceLists || []);
        setProductVariantOptions(data.productVariants || []);
      }
    } catch {
      console.error('Failed to fetch partner data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Helpers ───────────────────────────────────

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (cents: number, currency = 'EUR') => {
    return new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);
  const partnerUsers_ = users.filter((u) => u.partnerConfigId === selectedPartnerId);
  const partnerDocs = documents.filter((d) => d.partnerConfigId === selectedPartnerId);
  const partnerMsgs = messages.filter((m) => m.partnerConfigId === selectedPartnerId);
  const partnerOrders_ = orders.filter((o) => o.partnerConfigId === selectedPartnerId);
  const partnerPrices = priceLists.filter((p) => p.partnerConfigId === selectedPartnerId);

  // ─── API Calls ─────────────────────────────────

  const apiPost = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Unknown error');
      }
      return result;
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unknown error',
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) return;

    const result = await apiPost({
      action: 'create_user',
      email: newUserEmail,
      password: newUserPassword,
      name: newUserName,
      companyName: newUserCompany || undefined,
      partnerConfigId: selectedPartnerId,
      locale: newUserLocale,
    });

    if (result?.success) {
      setMessage({ type: 'success', text: t('partners.userCreated') });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserCompany('');
      setNewUserPassword('');
      setNewUserLocale('de');
      setShowUserForm(false);
      await fetchData();
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    const result = await apiPost({
      action: 'deactivate_user',
      userId,
    });

    if (result?.success) {
      setMessage({
        type: 'success',
        text: result.active ? t('partners.userActivated') : t('partners.userDeactivated'),
      });
      await fetchData();
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) return;

    const result = await apiPost({
      action: 'upload_document',
      partnerConfigId: selectedPartnerId,
      title: newDocTitle,
      category: newDocCategory,
      fileName: newDocFileName,
    });

    if (result?.success) {
      setMessage({ type: 'success', text: t('partners.docUploaded') });
      setNewDocTitle('');
      setNewDocCategory('other');
      setNewDocFileName('');
      setShowDocForm(false);
      await fetchData();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) return;

    const result = await apiPost({
      action: 'send_message',
      partnerConfigId: selectedPartnerId,
      subject: newMsgSubject || undefined,
      body: newMsgBody,
    });

    if (result?.success) {
      setMessage({ type: 'success', text: t('partners.messageSent') });
      setNewMsgSubject('');
      setNewMsgBody('');
      setShowMsgForm(false);
      await fetchData();
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId || !newPriceVariantId) return;

    const result = await apiPost({
      action: 'add_price',
      partnerConfigId: selectedPartnerId,
      productVariantId: newPriceVariantId,
      exportPriceCents: Math.round(parseFloat(newPriceAmount) * 100),
      currency: newPriceCurrency,
      minOrderQuantity: parseInt(newPriceMinQty) || 1,
    });

    if (result?.success) {
      setMessage({ type: 'success', text: t('partners.priceAdded') });
      setNewPriceVariantId(0);
      setNewPriceAmount('');
      setNewPriceMinQty('1');
      setShowPriceForm(false);
      await fetchData();
    }
  };

  const handleTogglePriceActive = async (priceId: number, currentActive: boolean) => {
    const result = await apiPost({
      action: 'update_price',
      id: priceId,
      active: !currentActive,
    });

    if (result?.success) {
      await fetchData();
    }
  };

  // ─── Render ────────────────────────────────────

  const sections = [
    { key: 'users', label: t('partners.users'), icon: Users, count: partnerUsers_.length },
    { key: 'documents', label: t('partners.documents'), icon: FileText, count: partnerDocs.length },
    { key: 'priceList', label: t('partners.priceList'), icon: DollarSign, count: partnerPrices.length },
    { key: 'messages', label: t('partners.messages'), icon: MessageSquare, count: partnerMsgs.length },
    { key: 'orders', label: t('partners.orders'), icon: ShoppingCart, count: partnerOrders_.length },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
          {t('partners.title')}
        </h1>
        <p className="text-muted text-sm mt-1">
          {t('partners.subtitle')}
        </p>
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

      {/* Loading */}
      {loading ? (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl px-6 py-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
          <p className="text-muted text-sm">{t('partners.loading')}</p>
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl px-6 py-16 text-center">
          <Globe className="w-8 h-8 text-muted/30 mx-auto mb-3" />
          <p className="text-muted text-sm">{t('partners.noPartners')}</p>
        </div>
      ) : (
        <>
          {/* Partner Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {partners.map((partner) => (
              <button
                key={partner.id}
                onClick={() => {
                  setSelectedPartnerId(partner.id === selectedPartnerId ? null : partner.id);
                  setActiveSection('users');
                }}
                className={`text-left bg-[#0e0e0e] border rounded-xl p-5 transition-all duration-200 ${
                  selectedPartnerId === partner.id
                    ? 'border-gold/30 ring-1 ring-gold/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-[var(--font-heading)] text-cream text-sm font-medium">
                      {partner.partnerName}
                    </h3>
                    <p className="text-muted text-[11px] mt-0.5">{partner.partnerCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${
                        partner.active
                          ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                          : 'bg-red-400/10 text-red-400 border-red-400/20'
                      }`}
                    >
                      {partner.active ? 'Active' : 'Inactive'}
                    </span>
                    {selectedPartnerId === partner.id ? (
                      <ChevronUp className="w-4 h-4 text-gold" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-muted text-[10px] tracking-wider uppercase">Commission</p>
                    <p className="text-cream text-sm font-medium">{partner.commissionPercent}%</p>
                  </div>
                  <div>
                    <p className="text-muted text-[10px] tracking-wider uppercase">Users</p>
                    <p className="text-cream text-sm font-medium">{partner.userCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-muted/60">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {partner.documentCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {partner.messageCount > 0 ? (
                      <span className="text-amber-400">{partner.messageCount} unread</span>
                    ) : (
                      '0'
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    {partner.orderCount}
                  </span>
                </div>

                {partner.lastActivity && (
                  <p className="text-muted/40 text-[10px] mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last activity: {formatDate(partner.lastActivity)}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Partner Detail Section */}
          {selectedPartner && (
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
              {/* Detail Header */}
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-[var(--font-heading)] text-cream text-lg font-semibold">
                  {selectedPartner.partnerName}
                </h2>
                <p className="text-muted text-[11px] mt-0.5">
                  {selectedPartner.partnerCode} — {selectedPartner.commissionPercent}% commission
                  {selectedPartner.isPlatformOwner && ' — Platform Owner'}
                </p>
              </div>

              {/* Section Tabs */}
              <div className="flex border-b border-white/[0.06] overflow-x-auto">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key)}
                      className={`flex items-center gap-2 px-4 py-3 text-xs whitespace-nowrap transition-colors border-b-2 ${
                        activeSection === section.key
                          ? 'text-gold border-gold'
                          : 'text-muted hover:text-cream border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {section.label}
                      {section.count > 0 && (
                        <span className="bg-white/[0.06] px-1.5 py-0.5 rounded text-[9px]">
                          {section.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ─── Users Section ─────────────────── */}
              {activeSection === 'users' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-cream text-sm font-medium">{t('partners.users')}</h3>
                    <button
                      onClick={() => setShowUserForm(!showUserForm)}
                      className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {t('partners.addUser')}
                    </button>
                  </div>

                  {/* Add User Form */}
                  {showUserForm && (
                    <form onSubmit={handleCreateUser} className="bg-[#080808] border border-white/[0.06] rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            required
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="partner@company.com"
                          />
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            required
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Company
                          </label>
                          <input
                            type="text"
                            value={newUserCompany}
                            onChange={(e) => setNewUserCompany(e.target.value)}
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="Company name"
                          />
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Password *
                          </label>
                          <input
                            type="password"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="Min. 8 characters"
                          />
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Locale
                          </label>
                          <select
                            value={newUserLocale}
                            onChange={(e) => setNewUserLocale(e.target.value)}
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          >
                            <option value="de">Deutsch</option>
                            <option value="en">English</option>
                            <option value="ar">Arabic</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center gap-2 bg-gold hover:bg-gold-light disabled:bg-gold/40 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-xs px-4 py-2 rounded-lg transition-all duration-300"
                        >
                          {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          {t('partners.addUser')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowUserForm(false)}
                          className="text-muted text-xs hover:text-cream transition-colors px-3 py-2"
                        >
                          {t('partners.cancel')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Users List */}
                  {partnerUsers_.length === 0 ? (
                    <p className="text-muted text-sm py-4">{t('partners.noUsers')}</p>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {partnerUsers_.map((user) => {
                        const isDeactivated = !!user.deletedAt || !user.active;
                        return (
                          <div
                            key={user.id}
                            className={`py-3 flex items-center justify-between flex-wrap gap-3 ${
                              isDeactivated ? 'opacity-50' : ''
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-cream text-sm font-medium">
                                  {user.name || user.email}
                                </h4>
                                {isDeactivated && (
                                  <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-medium bg-red-400/10 text-red-400 border border-red-400/20">
                                    {t('partners.inactive')}
                                  </span>
                                )}
                                {user.locale && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/[0.04] text-muted border border-white/[0.08]">
                                    {user.locale.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <p className="text-muted text-[11px] mt-0.5">{user.email}</p>
                              {user.companyName && (
                                <p className="text-muted/60 text-[10px] mt-0.5">{user.companyName}</p>
                              )}
                              <p className="text-muted/40 text-[10px] mt-0.5">
                                Last login: {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeactivateUser(user.id)}
                              className={`flex items-center gap-1.5 text-[10px] border rounded px-2.5 py-1.5 transition-colors ${
                                isDeactivated
                                  ? 'text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10'
                                  : 'text-red-400 border-red-400/20 hover:bg-red-400/10'
                              }`}
                            >
                              {isDeactivated ? (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  {t('partners.activate')}
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3 h-3" />
                                  {t('partners.deactivate')}
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Documents Section ─────────────── */}
              {activeSection === 'documents' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-cream text-sm font-medium">{t('partners.documents')}</h3>
                    <button
                      onClick={() => setShowDocForm(!showDocForm)}
                      className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {t('partners.uploadDoc')}
                    </button>
                  </div>

                  {/* Upload Form */}
                  {showDocForm && (
                    <form onSubmit={handleUploadDoc} className="bg-[#080808] border border-white/[0.06] rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={newDocTitle}
                            onChange={(e) => setNewDocTitle(e.target.value)}
                            required
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="Document title"
                          />
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Category *
                          </label>
                          <select
                            value={newDocCategory}
                            onChange={(e) => setNewDocCategory(e.target.value)}
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          >
                            <option value="customs">Customs</option>
                            <option value="certificate">Certificate</option>
                            <option value="invoice">Invoice</option>
                            <option value="contract">Contract</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            File Name *
                          </label>
                          <input
                            type="text"
                            value={newDocFileName}
                            onChange={(e) => setNewDocFileName(e.target.value)}
                            required
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="document.pdf"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center gap-2 bg-gold hover:bg-gold-light disabled:bg-gold/40 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-xs px-4 py-2 rounded-lg transition-all duration-300"
                        >
                          {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          {t('partners.uploadDoc')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDocForm(false)}
                          className="text-muted text-xs hover:text-cream transition-colors px-3 py-2"
                        >
                          {t('partners.cancel')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Documents List */}
                  {partnerDocs.length === 0 ? (
                    <p className="text-muted text-sm py-4">{t('partners.noDocs')}</p>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {partnerDocs.map((doc) => (
                        <div key={doc.id} className="py-3 flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted flex-shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-cream text-sm">{doc.title}</h4>
                                <CategoryBadge category={doc.category} />
                              </div>
                              <p className="text-muted/60 text-[10px] mt-0.5">
                                {doc.fileName} — {formatFileSize(doc.fileSize)} — {formatDate(doc.createdAt)}
                              </p>
                              <p className="text-muted/40 text-[10px]">
                                Uploaded by {doc.uploadedBy}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Price List Section ────────────── */}
              {activeSection === 'priceList' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-cream text-sm font-medium">{t('partners.priceList')}</h3>
                    <button
                      onClick={() => setShowPriceForm(!showPriceForm)}
                      className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('partners.addPrice')}
                    </button>
                  </div>

                  {/* Add Price Form */}
                  {showPriceForm && (
                    <form onSubmit={handleAddPrice} className="bg-[#080808] border border-white/[0.06] rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Product Variant *
                          </label>
                          <select
                            value={newPriceVariantId}
                            onChange={(e) => setNewPriceVariantId(parseInt(e.target.value))}
                            required
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                          >
                            <option value={0}>Select product variant...</option>
                            {productVariantOptions.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.productName} — {v.nameEn} ({v.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Export Price ({newPriceCurrency}) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={newPriceAmount}
                            onChange={(e) => setNewPriceAmount(e.target.value)}
                            required
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Min. Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={newPriceMinQty}
                            onChange={(e) => setNewPriceMinQty(e.target.value)}
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          type="submit"
                          disabled={submitting || newPriceVariantId === 0}
                          className="flex items-center gap-2 bg-gold hover:bg-gold-light disabled:bg-gold/40 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-xs px-4 py-2 rounded-lg transition-all duration-300"
                        >
                          {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          {t('partners.addPrice')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPriceForm(false)}
                          className="text-muted text-xs hover:text-cream transition-colors px-3 py-2"
                        >
                          {t('partners.cancel')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Price List Table */}
                  {partnerPrices.length === 0 ? (
                    <p className="text-muted text-sm py-4">{t('partners.noPrices')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">Product</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">SKU</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">Export Price</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">Min. Qty</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">Valid</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {partnerPrices.map((price) => (
                            <tr key={price.id}>
                              <td className="py-2.5 pr-4">
                                <p className="text-cream text-xs">{price.productName}</p>
                                <p className="text-muted/60 text-[10px]">{price.variantName}</p>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="text-muted text-xs font-mono">{price.variantSku}</span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="text-cream text-xs font-medium">
                                  {formatPrice(price.exportPriceCents, price.currency)}
                                </span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="text-muted text-xs">{price.minOrderQuantity}</span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <p className="text-muted text-[10px]">
                                  {formatDate(price.validFrom)}
                                  {price.validUntil ? ` — ${formatDate(price.validUntil)}` : ' — open'}
                                </p>
                              </td>
                              <td className="py-2.5">
                                <button
                                  onClick={() => handleTogglePriceActive(price.id, price.active)}
                                  className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border cursor-pointer transition-colors ${
                                    price.active
                                      ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20'
                                      : 'bg-red-400/10 text-red-400 border-red-400/20 hover:bg-red-400/20'
                                  }`}
                                >
                                  {price.active ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Messages Section ──────────────── */}
              {activeSection === 'messages' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-cream text-sm font-medium">{t('partners.messages')}</h3>
                    <button
                      onClick={() => setShowMsgForm(!showMsgForm)}
                      className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {t('partners.sendMessage')}
                    </button>
                  </div>

                  {/* Send Message Form */}
                  {showMsgForm && (
                    <form onSubmit={handleSendMessage} className="bg-[#080808] border border-white/[0.06] rounded-lg p-4 mb-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={newMsgSubject}
                            onChange={(e) => setNewMsgSubject(e.target.value)}
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                            placeholder="Subject (optional)"
                          />
                        </div>
                        <div>
                          <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                            Message *
                          </label>
                          <textarea
                            value={newMsgBody}
                            onChange={(e) => setNewMsgBody(e.target.value)}
                            required
                            rows={4}
                            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none resize-none"
                            placeholder="Your message..."
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center gap-2 bg-gold hover:bg-gold-light disabled:bg-gold/40 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-xs px-4 py-2 rounded-lg transition-all duration-300"
                        >
                          {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          {t('partners.sendMessage')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMsgForm(false)}
                          className="text-muted text-xs hover:text-cream transition-colors px-3 py-2"
                        >
                          {t('partners.cancel')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Messages List */}
                  {partnerMsgs.length === 0 ? (
                    <p className="text-muted text-sm py-4">{t('partners.noMessages')}</p>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {partnerMsgs.map((msg) => (
                        <div key={msg.id} className="py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <SenderBadge type={msg.senderType} />
                            <span className="text-cream text-xs font-medium">{msg.senderName}</span>
                            <span className="text-muted/40 text-[10px]">{formatDateTime(msg.createdAt)}</span>
                            {msg.senderType === 'partner' && !msg.readAt && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20">
                                Unread
                              </span>
                            )}
                          </div>
                          {msg.subject && (
                            <p className="text-cream text-sm font-medium mb-0.5">{msg.subject}</p>
                          )}
                          <p className="text-muted text-xs whitespace-pre-wrap">{msg.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Orders Section ────────────────── */}
              {activeSection === 'orders' && (
                <div className="p-5">
                  <h3 className="text-cream text-sm font-medium mb-4">{t('partners.orders')}</h3>

                  {partnerOrders_.length === 0 ? (
                    <p className="text-muted text-sm py-4">{t('partners.noOrders')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">Order</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">Status</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">Total</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2 pr-4">Submitted By</th>
                            <th className="text-muted text-[10px] tracking-wider uppercase py-2">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {partnerOrders_.map((order) => (
                            <tr key={order.id}>
                              <td className="py-2.5 pr-4">
                                <span className="text-cream text-xs font-mono">{order.orderNumber}</span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="text-cream text-xs font-medium">
                                  {formatPrice(order.totalCents, order.currency)}
                                </span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="text-muted text-xs">{order.submittedBy || '-'}</span>
                              </td>
                              <td className="py-2.5">
                                <span className="text-muted text-[10px]">{formatDate(order.createdAt)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
