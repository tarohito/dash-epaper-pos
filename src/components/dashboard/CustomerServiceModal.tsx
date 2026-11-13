import React, { useState } from 'react';
import {
  MessageCircle,
  Mail,
  Clock,
  Copy,
  Check,
  Store,
} from 'lucide-react';
import { Tenant } from '../../types';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';
import { useToast } from '../../contexts/ToastContext';

interface CustomerServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTenant?: Tenant;
}

const CS_WHATSAPP_NUMBER = '6281122334455';
const CS_WHATSAPP_DISPLAY = '+62 811-2233-4455';
const CS_EMAIL = 'cs@epaper-pos.id';

export const CustomerServiceModal: React.FC<CustomerServiceModalProps> = ({
  isOpen,
  onClose,
  activeTenant,
}) => {
  const { showToast } = useToast();
  const [copiedField, setCopiedField] = useState<'wa' | 'email' | null>(null);

  const storeLabel = activeTenant
    ? `${activeTenant.name} (${activeTenant.branchName})`
    : 'Toko Saya';

  const prefilledMessage = `Halo Customer Service e.paper, saya ingin konsultasi dan berlangganan sistem Kasir POS untuk ${storeLabel}.`;
  const whatsappUrl = `https://wa.me/${CS_WHATSAPP_NUMBER}?text=${encodeURIComponent(prefilledMessage)}`;
  const mailtoUrl = `mailto:${CS_EMAIL}?subject=${encodeURIComponent(`Berlangganan e.paper POS - ${storeLabel}`)}&body=${encodeURIComponent(prefilledMessage)}`;

  const handleCopy = async (value: string, field: 'wa' | 'email', label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast('success', `${label} berhasil disalin.`);
      window.setTimeout(() => {
        setCopiedField(prev => (prev === field ? null : prev));
      }, 2000);
    } catch {
      showToast('error', `Gagal menyalin ${label.toLowerCase()}.`);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Hubungi Customer Service"
      subtitle="Konsultasi paket & aktivasi berlangganan e.paper POS"
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={() => handleCopy(CS_WHATSAPP_DISPLAY, 'wa', 'Nomor WhatsApp CS')}
            className={`${MODAL_BTN_SECONDARY_CLASS} gap-1.5`}
          >
            {copiedField === 'wa' ? (
              <Check size={14} className="text-emerald-600 shrink-0" />
            ) : (
              <Copy size={14} className="shrink-0" />
            )}
            <span>{copiedField === 'wa' ? 'Nomor Tersalin' : 'Salin Nomor WA'}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${MODAL_BTN_PRIMARY_CLASS} gap-1.5`}
          >
            <MessageCircle size={15} className="shrink-0" />
            <span>Chat WhatsApp CS</span>
          </a>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          Tim Customer Service kami siap membantu aktivasi paket berlangganan, penambahan cabang outlet, serta pendampingan penggunaan sistem e.paper POS.
        </p>

        {activeTenant && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-orange-50/80 border border-orange-200/80 text-xs sm:text-sm">
            <Store size={16} className="text-orange-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-gray-500">Outlet terdaftar: </span>
              <span className="font-semibold text-gray-900">{storeLabel}</span>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {/* WhatsApp Contact Row */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
                <MessageCircle size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">WhatsApp Customer Service</p>
                <p className="text-sm font-bold text-gray-900 font-mono truncate">
                  {CS_WHATSAPP_DISPLAY}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(CS_WHATSAPP_DISPLAY, 'wa', 'Nomor WhatsApp CS')}
              className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Salin Nomor WhatsApp CS"
            >
              {copiedField === 'wa' ? (
                <Check size={15} className="text-emerald-600" />
              ) : (
                <Copy size={15} />
              )}
            </button>
          </div>

          {/* Email Contact Row */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
                <Mail size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Email Layanan Pelanggan</p>
                <a
                  href={mailtoUrl}
                  className="text-sm font-bold text-gray-900 hover:text-orange-600 transition-colors truncate block"
                >
                  {CS_EMAIL}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(CS_EMAIL, 'email', 'Email Customer Service')}
              className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Salin Email Customer Service"
            >
              {copiedField === 'email' ? (
                <Check size={15} className="text-emerald-600" />
              ) : (
                <Copy size={15} />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
          <Clock size={14} className="text-gray-400 shrink-0" />
          <span>Jam layanan Customer Service: Senin – Sabtu, 08:00 – 17:00 WIB</span>
        </div>
      </div>
    </ModalShell>
  );
};
