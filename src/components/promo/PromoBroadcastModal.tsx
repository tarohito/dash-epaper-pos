import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  History,
  Loader2,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  StopCircle,
  Tag,
  Users,
  XCircle,
} from 'lucide-react';
import {
  BroadcastAudienceMode,
  BroadcastCustomerAudienceItem,
  BroadcastDeliveryMode,
  BroadcastRecipientStatus,
  PromoBroadcastConfig,
  PromoBroadcastRecipient,
  PromoBroadcastRecord,
  PromoCampaign,
} from '../../types';
import { posApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIDR } from '../../utils/formatters';
import { CustomSelect } from '../common/CustomSelect';
import { CustomCheckbox } from '../common/CustomCheckbox';
import {
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_FOOTER_END_CLASS,
  ModalShell,
} from '../common/ModalShell';

interface PromoBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  promos: PromoCampaign[];
  initialPromo?: PromoCampaign | null;
  storeName?: string;
}

type ModalTab = 'compose' | 'queue' | 'history';

const TEMPLATE_VARIABLES = [
  { token: '{sapaan}', label: 'Sapaan Variatif' },
  { token: '{nama}', label: 'Nama Pelanggan' },
  { token: '{kode_member}', label: 'Kode Member' },
  { token: '{nama_promo}', label: 'Nama Promo' },
  { token: '{kode_promo}', label: 'Kode Promo' },
  { token: '{diskon}', label: 'Diskon (%)' },
  { token: '{periode}', label: 'Periode' },
  { token: '{min_belanja}', label: 'Min. Belanja' },
  { token: '{nama_toko}', label: 'Nama Toko' },
];

function buildDefaultTemplate(): string {
  return [
    '{sapaan} *{nama}* ({kode_member}), ada promo spesial dari *{nama_toko}*:',
    '',
    '*{nama_promo}*',
    'Potongan: *Diskon {diskon}*',
    'Kode Promo: *{kode_promo}*',
    'Berlaku: {periode}',
    'Ketentuan: {min_belanja}',
    '',
    'Tunjukkan pesan atau kode promo ini saat bertransaksi di kasir kami. Terima kasih!',
    '',
    '_Balas STOP jika tidak ingin menerima info promo lagi._',
  ].join('\n');
}

function renderTemplateClient(
  template: string,
  promo: PromoCampaign | null,
  customer: BroadcastCustomerAudienceItem | null,
  storeName: string
): string {
  const customerName = customer?.name || 'Pelanggan Setia';
  const memberCode = customer?.memberCode || 'MBR-001';
  const promoName = promo?.name || 'Promo Spesial';
  const promoCode = promo?.code || 'PROMO';
  const discountPercent = promo?.discountPercent ?? 0;
  const periode = promo ? `${promo.startDate} s/d ${promo.endDate}` : '-';
  const minBelanja =
    promo?.minPurchase && promo.minPurchase > 0
      ? formatIDR(promo.minPurchase)
      : 'Tanpa minimal belanja';

  return template
    .replace(/\{sapaan\}/gi, 'Halo')
    .replace(/\{nama\}/gi, customerName)
    .replace(/\{kode_member\}/gi, memberCode)
    .replace(/\{nama_promo\}/gi, promoName)
    .replace(/\{kode_promo\}/gi, promoCode)
    .replace(/\{diskon\}/gi, `${discountPercent}%`)
    .replace(/\{periode\}/gi, periode)
    .replace(/\{min_belanja\}/gi, minBelanja)
    .replace(/\{nama_toko\}/gi, storeName);
}

export const PromoBroadcastModal: React.FC<PromoBroadcastModalProps> = ({
  isOpen,
  onClose,
  promos,
  initialPromo = null,
  storeName = 'Toko Mas',
}) => {
  const { showToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [activeTab, setActiveTab] = useState<ModalTab>('compose');
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');
  const [audienceMode, setAudienceMode] = useState<BroadcastAudienceMode>('all');
  const [audienceSegment, setAudienceSegment] = useState<'VIP' | 'Reguler' | 'Mitra / Toko'>('VIP');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [messageTemplate, setMessageTemplate] = useState<string>(buildDefaultTemplate);
  const [deliveryMode, setDeliveryMode] = useState<BroadcastDeliveryMode>('wa_me');

  const [activeBuyersOnly, setActiveBuyersOnly] = useState<boolean>(false);
  const [delayPreset, setDelayPreset] = useState<'recommended' | 'extra_safe'>('recommended');
  const [safeWaCooldownEnabled, setSafeWaCooldownEnabled] = useState<boolean>(true);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const [audienceList, setAudienceList] = useState<BroadcastCustomerAudienceItem[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<PromoBroadcastConfig>({
    gatewayConfigured: false,
    providerLabel: 'WhatsApp Gateway',
    dailySafeLimit: 50,
    dailySentCount: 0,
    maxBatchSize: 50,
    defaultDelayMinSec: 8,
    defaultDelayMaxSec: 15,
  });
  const [broadcastHistory, setBroadcastHistory] = useState<PromoBroadcastRecord[]>([]);
  const [activeBatch, setActiveBatch] = useState<PromoBroadcastRecord | null>(null);

  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCancellingJob, setIsCancellingJob] = useState(false);
  const [updatingRecipientId, setUpdatingRecipientId] = useState<string | null>(null);
  const [loadingBatchId, setLoadingBatchId] = useState<string | null>(null);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'sent'>('all');

  // Initialize modal state whenever opened
  useEffect(() => {
    if (!isOpen) {
      setCooldownRemaining(0);
      return;
    }
    setActiveTab('compose');
    setQueueSearch('');
    setQueueFilter('all');
    setCustomerSearch('');
    setCooldownRemaining(0);
    setMessageTemplate(buildDefaultTemplate());

    const fallbackPromo =
      initialPromo ||
      promos.find(p => p.isActive) ||
      promos[0] ||
      null;
    setSelectedPromoId(fallbackPromo?.id ?? '');

    const controller = new AbortController();
    setIsLoadingInitial(true);
    Promise.all([
      posApi.getPromoBroadcastConfig(controller.signal),
      posApi.getPromoBroadcastAudience(controller.signal),
      posApi.getPromoBroadcasts(controller.signal),
    ])
      .then(([cfg, audience, history]) => {
        const list = Array.isArray(audience) ? audience : [];
        setGatewayConfig(cfg);
        setDeliveryMode(cfg.gatewayConfigured ? 'gateway' : 'wa_me');
        setAudienceList(list);
        setActiveBuyersOnly(list.some(c => c.hasTransacted));
        setBroadcastHistory(Array.isArray(history) ? history : []);
        setIsLoadingInitial(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          setIsLoadingInitial(false);
          showToast('error', err instanceof Error ? err.message : 'Gagal memuat data broadcast.');
        }
      });

    return () => controller.abort();
  }, [isOpen, initialPromo, promos, showToast]);

  // Cooldown countdown for wa.me Safe Mode
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownRemaining]);

  // Poll background Gateway job while running
  useEffect(() => {
    if (!isOpen || !activeBatch?.id || !activeBatch.isJobRunning) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const updated = await posApi.getPromoBroadcastById(activeBatch.id);
        if (cancelled) return;
        setActiveBatch(updated);
        setBroadcastHistory(prev => prev.map(b => (b.id === updated.id ? { ...b, ...updated } : b)));
        if (!updated.isJobRunning) {
          const cfg = await posApi.getPromoBroadcastConfig().catch(() => null);
          if (cfg && !cancelled) setGatewayConfig(cfg);
          showToast(
            updated.failedCount > 0 ? 'warning' : 'success',
            `Broadcast gateway selesai: ${updated.sentCount} terkirim, ${updated.failedCount} gagal/dihentikan.`
          );
        }
      } catch {
        // Ignore transient polling errors
      }
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, activeBatch?.id, activeBatch?.isJobRunning, showToast]);

  const selectedPromo = useMemo(
    () => promos.find(p => p.id === selectedPromoId) ?? initialPromo ?? null,
    [promos, selectedPromoId, initialPromo]
  );

  const segmentCounts = useMemo(() => {
    const base = activeBuyersOnly ? audienceList.filter(c => c.hasTransacted) : audienceList;
    let vip = 0;
    let reguler = 0;
    let mitra = 0;
    for (const c of base) {
      if (c.type === 'VIP') vip += 1;
      else if (c.type === 'Mitra / Toko') mitra += 1;
      else reguler += 1;
    }
    return {
      total: base.length,
      allContacts: audienceList.length,
      activeBuyers: audienceList.filter(c => c.hasTransacted).length,
      vip,
      reguler,
      mitra,
    };
  }, [audienceList, activeBuyersOnly]);

  const filteredAudienceForPicker = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return audienceList.filter(c => {
      if (activeBuyersOnly && !c.hasTransacted) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.waPhone.includes(q) ||
        c.memberCode.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
      );
    });
  }, [audienceList, customerSearch, activeBuyersOnly]);

  const targetRecipients = useMemo(() => {
    let base = audienceList;
    if (audienceMode === 'segment') {
      base = audienceList.filter(c => c.type === audienceSegment);
    } else if (audienceMode === 'selected') {
      const idSet = new Set(selectedCustomerIds);
      base = audienceList.filter(c => idSet.has(c.id));
    }
    return activeBuyersOnly ? base.filter(c => c.hasTransacted) : base;
  }, [audienceMode, audienceSegment, audienceList, selectedCustomerIds, activeBuyersOnly]);

  const dailyRemaining = Math.max(0, gatewayConfig.dailySafeLimit - gatewayConfig.dailySentCount);
  const exceedsBatchLimit = targetRecipients.length > gatewayConfig.maxBatchSize;
  const exceedsDailyQuota = targetRecipients.length > dailyRemaining;
  const isGatewayBlockedBySafeLimit =
    deliveryMode === 'gateway' && (exceedsBatchLimit || exceedsDailyQuota);

  const previewText = useMemo(() => {
    const sampleCustomer = targetRecipients[0] ?? audienceList[0] ?? null;
    return renderTemplateClient(messageTemplate, selectedPromo, sampleCustomer, storeName);
  }, [messageTemplate, selectedPromo, targetRecipients, audienceList, storeName]);

  const filteredQueueRecipients = useMemo(() => {
    const recs = activeBatch?.recipients ?? [];
    const q = queueSearch.trim().toLowerCase();
    return recs.filter(r => {
      if (queueFilter === 'pending' && r.status === 'sent') return false;
      if (queueFilter === 'sent' && r.status !== 'sent') return false;
      if (!q) return true;
      return (
        r.customerName.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.waPhone.includes(q) ||
        r.memberCode.toLowerCase().includes(q)
      );
    });
  }, [activeBatch, queueSearch, queueFilter]);

  const handleToggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleInsertVariable = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMessageTemplate(prev => `${prev}${token}`);
      return;
    }
    const start = el.selectionStart ?? messageTemplate.length;
    const end = el.selectionEnd ?? messageTemplate.length;
    const next = messageTemplate.slice(0, start) + token + messageTemplate.slice(end);
    setMessageTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleCopyText = async (text: string, successLabel: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', successLabel);
    } catch {
      showToast('error', 'Gagal menyalin ke clipboard.');
    }
  };

  const handleCreateBroadcast = async () => {
    if (!selectedPromo) {
      showToast('warning', 'Pilih promo yang akan di-broadcast terlebih dahulu.');
      return;
    }
    if (targetRecipients.length === 0) {
      showToast('warning', 'Pilih minimal 1 pelanggan dengan nomor WhatsApp valid.');
      return;
    }
    if (!messageTemplate.trim()) {
      showToast('warning', 'Isi pesan broadcast tidak boleh kosong.');
      return;
    }

    const delayMinSec = delayPreset === 'extra_safe' ? 15 : gatewayConfig.defaultDelayMinSec;
    const delayMaxSec = delayPreset === 'extra_safe' ? 25 : gatewayConfig.defaultDelayMaxSec;

    setIsSending(true);
    try {
      const batch = await posApi.createPromoBroadcast(selectedPromo.id, {
        promoId: selectedPromo.id,
        audienceMode,
        audienceSegment: audienceMode === 'segment' ? audienceSegment : undefined,
        customerIds: audienceMode === 'selected' ? selectedCustomerIds : undefined,
        activeBuyersOnly,
        deliveryMode,
        messageTemplate: messageTemplate.trim(),
        delayMinSec: deliveryMode === 'gateway' ? delayMinSec : undefined,
        delayMaxSec: deliveryMode === 'gateway' ? delayMaxSec : undefined,
      });

      setActiveBatch(batch);
      setBroadcastHistory(prev => [batch, ...prev.filter(b => b.id !== batch.id)]);
      setActiveTab('queue');

      if (deliveryMode === 'gateway') {
        showToast(
          'info',
          `Mode Aman aktif: mengirim bertahap ke ${batch.totalRecipients} penerima dengan jeda acak ${delayMinSec}–${delayMaxSec} detik.`
        );
      } else {
        showToast(
          'success',
          `Antrean broadcast Mode Aman untuk ${batch.totalRecipients} pelanggan siap dikirim.`
        );
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal membuat broadcast promo.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelActiveJob = async () => {
    if (!activeBatch) return;
    setIsCancellingJob(true);
    try {
      const updated = await posApi.cancelPromoBroadcast(activeBatch.id);
      setActiveBatch(updated);
      setBroadcastHistory(prev => prev.map(b => (b.id === updated.id ? { ...b, ...updated } : b)));
      const cfg = await posApi.getPromoBroadcastConfig().catch(() => null);
      if (cfg) setGatewayConfig(cfg);
      showToast('warning', 'Pengiriman antrean broadcast dihentikan untuk menjaga keamanan nomor.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghentikan broadcast.');
    } finally {
      setIsCancellingJob(false);
    }
  };

  const handleUpdateRecipientStatus = async (
    recipient: PromoBroadcastRecipient,
    status: BroadcastRecipientStatus
  ) => {
    if (!activeBatch) return;
    setUpdatingRecipientId(recipient.id);
    try {
      const updated = await posApi.updatePromoBroadcastRecipient(activeBatch.id, recipient.id, status);
      setActiveBatch(updated);
      setBroadcastHistory(prev => prev.map(b => (b.id === updated.id ? { ...b, ...updated } : b)));
      const cfg = await posApi.getPromoBroadcastConfig().catch(() => null);
      if (cfg) setGatewayConfig(cfg);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memperbarui status.');
    } finally {
      setUpdatingRecipientId(null);
    }
  };

  const handleOpenHistoryBatch = async (batchId: string) => {
    setLoadingBatchId(batchId);
    try {
      const full = await posApi.getPromoBroadcastById(batchId);
      setActiveBatch(full);
      setQueueFilter('all');
      setQueueSearch('');
      setActiveTab('queue');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memuat detail antrean broadcast.');
    } finally {
      setLoadingBatchId(null);
    }
  };

  const handleExportQueueCsv = () => {
    if (!activeBatch?.recipients?.length) return;
    const headers = ['Nama Pelanggan', 'Kode Member', 'Segmen', 'No HP', 'No WA (62)', 'Status', 'Pesan'];
    const rows = activeBatch.recipients.map(r => [
      `"${r.customerName.replace(/"/g, '""')}"`,
      r.memberCode,
      `"${r.customerType}"`,
      `"${r.phone}"`,
      r.waPhone,
      r.status,
      `"${r.personalizedMessage.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadcast-${activeBatch.promoCode.toLowerCase()}-${activeBatch.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Daftar penerima broadcast berhasil diunduh (CSV).');
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Broadcast Promo WhatsApp"
      subtitle="Kirim info promo & kode voucher ke semua atau beberapa pelanggan pilihan"
      disableEscapeClose={isSending}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className={MODAL_BTN_SECONDARY_CLASS}
          >
            Tutup
          </button>
          {activeTab === 'compose' && (
            <button
              type="button"
              disabled={
                isSending ||
                !selectedPromo ||
                targetRecipients.length === 0 ||
                !messageTemplate.trim() ||
                isGatewayBlockedBySafeLimit
              }
              onClick={() => void handleCreateBroadcast()}
              className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs active:scale-[0.98]"
            >
              {isSending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : deliveryMode === 'gateway' ? (
                <>
                  <Send size={15} />
                  <span>Kirim Bertahap ({targetRecipients.length})</span>
                </>
              ) : (
                <>
                  <MessageCircle size={15} />
                  <span>Siapkan Antrean WA ({targetRecipients.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Segmented Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'compose'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle size={14} />
              <span>Buat Broadcast</span>
            </button>

            <button
              type="button"
              disabled={!activeBatch}
              onClick={() => activeBatch && setActiveTab('queue')}
              className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'queue'
                  ? 'bg-orange-500 text-white shadow-xs cursor-pointer'
                  : activeBatch
                  ? 'text-gray-600 hover:text-gray-900 cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <MessageCircle size={14} />
              <span>Antrean Kirim</span>
              {activeBatch && (
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
                    activeTab === 'queue' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {activeBatch.sentCount}/{activeBatch.totalRecipients}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History size={14} />
              <span>Riwayat ({broadcastHistory.length})</span>
            </button>
          </div>

          {isLoadingInitial ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <Loader2 size={13} className="animate-spin text-orange-500" />
              <span>Memuat...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <ShieldCheck size={13} className="shrink-0" />
              <span>
                Kuota Aman: <strong className="font-mono">{gatewayConfig.dailySentCount}/{gatewayConfig.dailySafeLimit}</strong>
              </span>
            </span>
          )}
        </div>

        {/* TAB 1: COMPOSE */}
        {activeTab === 'compose' && (
          <div className="space-y-4">
            {/* Grid 1: Promo & Delivery Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Kampanye Promo <span className="text-red-500">*</span>
                </label>
                {promos.length === 0 ? (
                  <div className="h-10 sm:h-11 px-3.5 flex items-center text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg">
                    Belum ada kampanye promo. Buat promo terlebih dahulu.
                  </div>
                ) : (
                  <CustomSelect
                    value={selectedPromoId}
                    onChange={setSelectedPromoId}
                    placeholder="Pilih kampanye promo..."
                    icon={<Tag size={15} />}
                    options={promos.map(p => ({
                      value: p.id,
                      label: p.name,
                      sublabel: `${p.startDate} s/d ${p.endDate}${p.isActive ? '' : ' • Nonaktif'}`,
                      badge: `${p.code} (-${p.discountPercent}%)`,
                    }))}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Metode Pengiriman (Mode Aman)
                </label>
                {gatewayConfig.gatewayConfigured ? (
                  <CustomSelect
                    value={deliveryMode}
                    onChange={val => setDeliveryMode(val as BroadcastDeliveryMode)}
                    icon={<Send size={15} />}
                    options={[
                      {
                        value: 'gateway',
                        label: `Kirim Bertahap (${gatewayConfig.providerLabel})`,
                        sublabel: 'Otomatis dengan jeda acak anti-spam',
                        badge: 'Gateway',
                      },
                      {
                        value: 'wa_me',
                        label: 'Antrean WA Web / Aplikasi',
                        sublabel: 'Kirim manual satu per satu via wa.me',
                        badge: 'Gratis',
                      },
                    ]}
                  />
                ) : (
                  <div className="h-10 sm:h-11 px-3.5 flex items-center justify-between gap-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="inline-flex items-center gap-2 truncate">
                      <MessageCircle size={15} className="text-emerald-600 shrink-0" />
                      <span className="truncate">Antrean WA Web (wa.me)</span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                      Jeda 5 dtk
                    </span>
                  </div>
                )}
              </div>
            </div>

            {gatewayConfig.gatewayConfigured && deliveryMode === 'gateway' && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Interval Jeda Acak Gateway (Anti-Spam)
                </label>
                <CustomSelect
                  value={delayPreset}
                  onChange={val => setDelayPreset(val as 'recommended' | 'extra_safe')}
                  icon={<ShieldCheck size={15} />}
                  options={[
                    {
                      value: 'recommended',
                      label: '8 – 15 detik antar pesan (Normal)',
                      sublabel: 'Direkomendasikan untuk mayoritas broadcast harian',
                      badge: 'Disarankan',
                    },
                    {
                      value: 'extra_safe',
                      label: '15 – 25 detik antar pesan (Ekstra Aman)',
                      sublabel: 'Cocok untuk batch mendekati batas kuota harian',
                      badge: 'Ekstra',
                    },
                  ]}
                />
              </div>
            )}

            {/* Section 2: Target Audience */}
            <div className="pt-3 border-t border-gray-100 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  Target Pelanggan WhatsApp <span className="text-red-500">*</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
                  <CustomCheckbox
                    checked={activeBuyersOnly}
                    onChange={setActiveBuyersOnly}
                  />
                  <span>
                    Hanya pelanggan aktif ({segmentCounts.activeBuyers}/{segmentCounts.allContacts})
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAudienceMode('all')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    audienceMode === 'all'
                      ? 'bg-orange-50/70 border-orange-400'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Semua Pelanggan</span>
                    <Users size={14} className={audienceMode === 'all' ? 'text-orange-600' : 'text-gray-400'} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{segmentCounts.total} nomor WA</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAudienceMode('segment')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    audienceMode === 'segment'
                      ? 'bg-orange-50/70 border-orange-400'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Per Segmen</span>
                    <Users size={14} className={audienceMode === 'segment' ? 'text-orange-600' : 'text-gray-400'} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">VIP, Reguler, Mitra</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAudienceMode('selected')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    audienceMode === 'selected'
                      ? 'bg-orange-50/70 border-orange-400'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Pilih Beberapa</span>
                    <CheckCircle2
                      size={14}
                      className={audienceMode === 'selected' ? 'text-orange-600' : 'text-gray-400'}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">
                    {selectedCustomerIds.length} dipilih manual
                  </p>
                </button>
              </div>

              {audienceMode === 'segment' && (
                <div>
                  <CustomSelect
                    value={audienceSegment}
                    onChange={val => setAudienceSegment(val as 'VIP' | 'Reguler' | 'Mitra / Toko')}
                    icon={<Users size={15} />}
                    options={[
                      { value: 'VIP', label: 'Member VIP', badge: `${segmentCounts.vip} nomor` },
                      { value: 'Reguler', label: 'Member Reguler', badge: `${segmentCounts.reguler} nomor` },
                      { value: 'Mitra / Toko', label: 'Mitra / Toko', badge: `${segmentCounts.mitra} nomor` },
                    ]}
                  />
                </div>
              )}

              {audienceMode === 'selected' && (
                <div className="border border-gray-200 rounded-xl bg-white p-3 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        placeholder="Cari nama, kode member, atau nomor WA..."
                        className="w-full h-9 pl-8 pr-3 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerIds(filteredAudienceForPicker.map(c => c.id))}
                        className="h-9 px-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCustomerIds(
                            filteredAudienceForPicker.filter(c => c.type === 'VIP').map(c => c.id)
                          )
                        }
                        className="h-9 px-2.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                      >
                        VIP Saja
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerIds([])}
                        className="h-9 px-2.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 border border-gray-200/80 rounded-lg">
                    {filteredAudienceForPicker.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400">
                        Tidak ada kontak pelanggan yang cocok.
                      </div>
                    ) : (
                      filteredAudienceForPicker.map(cust => {
                        const checked = selectedCustomerIds.includes(cust.id);
                        return (
                          <label
                            key={cust.id}
                            className={`flex items-center justify-between gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors ${
                              checked ? 'bg-orange-50/50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CustomCheckbox
                                checked={checked}
                                onChange={() => handleToggleCustomer(cust.id)}
                              />
                              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-gray-900 truncate">{cust.name}</span>
                                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {cust.memberCode}
                                </span>
                                <span
                                  className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                    cust.type === 'VIP'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : cust.type === 'Mitra / Toko'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {cust.type}
                                </span>
                                {cust.hasTransacted && (
                                  <span className="text-xs font-medium text-emerald-700">
                                    &bull; {cust.totalTxCount}x transaksi
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="font-mono text-xs text-gray-600 shrink-0">+{cust.waPhone}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {(exceedsBatchLimit || exceedsDailyQuota) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <strong>Batas Aman:</strong>{' '}
                  {exceedsBatchLimit
                    ? `Target (${targetRecipients.length}) melebihi batas aman ${gatewayConfig.maxBatchSize} nomor per batch.`
                    : `Target (${targetRecipients.length}) melebihi sisa kuota aman hari ini (${dailyRemaining} pesan).`}{' '}
                  {deliveryMode === 'gateway'
                    ? 'Kurangi pilihan target atau kirim bertahap per segmen.'
                    : 'Disarankan kirim bertahap agar nomor WA toko tetap aman.'}
                </div>
              )}
            </div>

            {/* Section 3: Message Template & Preview */}
            <div className="pt-3 border-t border-gray-100 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  Template Pesan WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  {targetRecipients.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyText(
                          targetRecipients.map(r => `+${r.waPhone}`).join('\n'),
                          `${targetRecipients.length} nomor WA berhasil disalin.`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Salin Nomor ({targetRecipients.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCopyText(previewText, 'Contoh pesan disalin ke clipboard.')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>Salin Pesan</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map(v => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => handleInsertVariable(v.token)}
                    className="px-2 py-1 text-xs font-mono font-semibold bg-gray-50 hover:bg-orange-50 text-gray-700 hover:text-orange-700 border border-gray-200 hover:border-orange-300 rounded-md transition-colors cursor-pointer"
                    title={`Sisipkan ${v.label}`}
                  >
                    {v.token}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                rows={5}
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                className="w-full p-3 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 leading-relaxed"
                placeholder="Tulis pesan broadcast promo..."
              />

              <div className="rounded-lg border border-gray-200/80 bg-gray-50/70 p-3 space-y-1">
                <span className="text-xs font-semibold text-gray-500 block">
                  Pratinjau Pesan Pelanggan
                </span>
                <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {previewText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUEUE / EXECUTION */}
        {activeTab === 'queue' && activeBatch && (
          <div className="space-y-3.5">
            {/* Batch Summary Card */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-gray-900">{activeBatch.promoName}</h4>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {activeBatch.promoCode} (-{activeBatch.discountPercent}%)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeBatch.deliveryMode === 'gateway' ? 'Dikirim via WA Gateway' : 'Antrean Kirim WA Web (wa.me)'}{' '}
                    &bull; Dibuat oleh {activeBatch.createdBy}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {activeBatch.isJobRunning && (
                    <button
                      type="button"
                      disabled={isCancellingJob}
                      onClick={() => void handleCancelActiveJob()}
                      className="h-8 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCancellingJob ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <StopCircle size={13} />
                      )}
                      <span>Hentikan</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const remaining = (activeBatch.recipients ?? [])
                        .filter(r => r.status !== 'sent')
                        .map(r => `+${r.waPhone}`);
                      if (remaining.length === 0) {
                        showToast('info', 'Semua penerima sudah berstatus terkirim.');
                        return;
                      }
                      void handleCopyText(
                        remaining.join('\n'),
                        `${remaining.length} nomor WA tersisa disalin.`
                      );
                    }}
                    className="h-8 px-3 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>Salin Sisa</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportQueueCsv}
                    className="h-8 px-3 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Unduh CSV</span>
                  </button>
                </div>
              </div>

              {activeBatch.isJobRunning && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <Loader2 size={13} className="animate-spin text-emerald-600 shrink-0" />
                  <span>
                    Mode Aman sedang mengirim bertahap dengan jeda acak antar pesan...
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-600">
                    Terkirim: <strong className="text-emerald-700 font-mono">{activeBatch.sentCount}</strong> /{' '}
                    <span className="font-mono">{activeBatch.totalRecipients}</span>
                    {activeBatch.failedCount > 0 && (
                      <span className="ml-2 text-rose-600 font-mono">({activeBatch.failedCount} gagal)</span>
                    )}
                  </span>
                  <span className="font-mono text-gray-700">
                    {activeBatch.totalRecipients > 0
                      ? Math.round((activeBatch.sentCount / activeBatch.totalRecipients) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${
                        activeBatch.totalRecipients > 0
                          ? Math.min(100, Math.round((activeBatch.sentCount / activeBatch.totalRecipients) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Cooldown + Search & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  placeholder="Cari penerima di antrean..."
                  className="w-full h-9 pl-8 pr-3 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center shrink-0">
                {(
                  [
                    { id: 'all', label: `Semua (${activeBatch.totalRecipients})` },
                    {
                      id: 'pending',
                      label: `Belum (${Math.max(0, activeBatch.totalRecipients - activeBatch.sentCount)})`,
                    },
                    { id: 'sent', label: `Terkirim (${activeBatch.sentCount})` },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setQueueFilter(tab.id)}
                    className={`h-full px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      queueFilter === tab.id
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeBatch.deliveryMode === 'wa_me' && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
                  <CustomCheckbox
                    checked={safeWaCooldownEnabled}
                    onChange={val => {
                      setSafeWaCooldownEnabled(val);
                      if (!val) setCooldownRemaining(0);
                    }}
                  />
                  <span>Jeda aman 5 detik antar klik Kirim WA</span>
                </label>
                {safeWaCooldownEnabled && cooldownRemaining > 0 && (
                  <span className="text-xs font-mono font-semibold text-amber-700">
                    Tunggu {cooldownRemaining} detik...
                  </span>
                )}
              </div>
            )}

            {/* Recipient Queue List */}
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-[320px] overflow-y-auto bg-white">
              {filteredQueueRecipients.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400">
                  Tidak ada penerima dalam filter ini.
                </div>
              ) : (
                filteredQueueRecipients.map(rec => {
                  const waHref = `https://wa.me/${rec.waPhone}?text=${encodeURIComponent(
                    rec.personalizedMessage
                  )}`;
                  const isUpdating = updatingRecipientId === rec.id;

                  return (
                    <div
                      key={rec.id}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                        rec.status === 'sent' ? 'bg-emerald-50/30' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            {rec.customerName}
                          </span>
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                            {rec.memberCode}
                          </span>
                          <span className="text-xs font-medium text-gray-500">
                            {rec.customerType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono text-gray-600">+{rec.waPhone}</span>
                          {rec.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 size={12} />
                              <span>Terkirim</span>
                            </span>
                          ) : rec.status === 'failed' ? (
                            <span
                              className="inline-flex items-center gap-1 text-rose-600 font-semibold"
                              title={rec.errorMessage}
                            >
                              <XCircle size={12} />
                              <span>Gagal{rec.errorMessage ? `: ${rec.errorMessage}` : ''}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                              <Clock size={12} />
                              <span>Menunggu dikirim</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            void handleUpdateRecipientStatus(
                              rec,
                              rec.status === 'sent' ? 'pending' : 'sent'
                            )
                          }
                          title={
                            rec.status === 'sent'
                              ? 'Tandai belum dikirim'
                              : 'Tandai sudah dikirim manual'
                          }
                          className={`h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ${
                            rec.status === 'sent'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Check size={13} />
                          <span>{rec.status === 'sent' ? 'Selesai' : 'Tandai'}</span>
                        </button>

                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => {
                            if (safeWaCooldownEnabled && cooldownRemaining > 0 && rec.status !== 'sent') {
                              e.preventDefault();
                              showToast(
                                'info',
                                `Mode Aman: tunggu ${cooldownRemaining} detik sebelum mengirim berikutnya.`
                              );
                              return;
                            }
                            if (rec.status !== 'sent') {
                              void handleUpdateRecipientStatus(rec, 'sent');
                              if (safeWaCooldownEnabled) {
                                setCooldownRemaining(5);
                              }
                            }
                          }}
                          className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            safeWaCooldownEnabled && cooldownRemaining > 0 && rec.status !== 'sent'
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : rec.status === 'sent'
                              ? 'bg-white text-[#128C7E] border border-[#25D366] hover:bg-[#25D366]/10 cursor-pointer'
                              : 'bg-[#25D366] hover:bg-[#1EBE5D] text-white cursor-pointer'
                          }`}
                        >
                          <MessageCircle size={13} />
                          <span>
                            {safeWaCooldownEnabled && cooldownRemaining > 0 && rec.status !== 'sent'
                              ? `Tunggu ${cooldownRemaining}d`
                              : rec.status === 'sent'
                              ? 'Kirim Ulang'
                              : 'Kirim WA'}
                          </span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-[420px] overflow-y-auto bg-white">
            {broadcastHistory.length === 0 ? (
              <div className="py-12 px-4 text-center text-gray-400">
                <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">Belum ada riwayat broadcast</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Buat broadcast pertama untuk mengirim promo ke pelanggan via WhatsApp.
                </p>
              </div>
            ) : (
              broadcastHistory.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-gray-900">{item.promoName}</span>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {item.promoCode}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {item.deliveryMode === 'gateway' ? 'Gateway API' : 'WA Web (wa.me)'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Terkirim{' '}
                      <strong className="font-mono text-emerald-700">
                        {item.sentCount}/{item.totalRecipients}
                      </strong>{' '}
                      pelanggan &bull; {new Date(item.createdAt).toLocaleString('id-ID')} &bull; oleh{' '}
                      {item.createdBy}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loadingBatchId === item.id}
                    onClick={() => void handleOpenHistoryBatch(item.id)}
                    className="h-8 px-3 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {loadingBatchId === item.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <MessageCircle size={13} />
                    )}
                    <span>Buka Antrean</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
};
