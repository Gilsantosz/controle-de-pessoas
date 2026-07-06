import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="bg-white rounded-3xl border border-[#E8ECF2] shadow-2xl max-w-md w-full overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#E8ECF2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDanger && <AlertTriangle size={18} className="text-[#E04F6F]" />}
            <h3 className="font-semibold text-sm text-[#0F172A]">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8A94A6] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F6F8FB] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs text-[#8A94A6] font-medium leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#F7F8FC] border-t border-[#E8ECF2] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-[#E8ECF2] text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F6F8FB] transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`h-10 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-sm ${
              isDanger 
                ? 'bg-[#E04F6F] hover:bg-[#E04F6F]/90 shadow-[#E04F6F]/10' 
                : 'bg-[#6254E8] hover:bg-[#5145CD] shadow-[#6254E8]/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
