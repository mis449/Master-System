import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FormActionButtons } from './StandardButtons';
import { X } from 'lucide-react';

/**
 * ModalForm Component - Premium Redesigned Edition
 * 
 * Improvements:
 * - Restored Cross (X) close button.
 * - Restored spacious padding and layout.
 * - Increased max height to 85vh to prevent clipped contents.
 * - Styled scrollbar to look sleek instead of completely hiding it.
 */
const ModalForm = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  maxWidth = 'max-w-2xl',
  zIndex = 'z-[100]',
  extraFooterAction = null,
  hideHeader = false,
  hideFooter = false,
  hideSubmit = false
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const uniqueFormId = `premium-modal-form-${Math.random().toString(36).substring(7)}`;

  const targetNode = document.getElementById('erp-main-container') || document.body;

  const isFullScreen = maxWidth?.includes('98vw') || maxWidth?.includes('100vw') || maxWidth?.includes('w-screen') || maxWidth === 'full';

  return createPortal(
    <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-2 md:p-4'} ${zIndex} animate-in fade-in duration-200 overflow-hidden`} style={{ zIndex: 9999 }}>
      <div
        className={`bg-white shadow-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 m-auto ${isFullScreen ? 'h-screen w-screen max-w-none rounded-none' : `rounded-2xl ${maxWidth}`}`}
        style={{ maxHeight: isFullScreen ? '100vh' : '90vh' }}
      >
        {/* Header - Clean with Close Button */}
        {!hideHeader && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0 z-20">
            <h2 className="text-sm md:text-base font-bold text-slate-800 uppercase tracking-wider">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 text-slate-450 hover:text-slate-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto bg-white min-h-0 z-10">
          <div className="px-6 py-5">
            <form id={uniqueFormId} onSubmit={onSubmit} className="space-y-4 text-left">
              {children}
            </form>
          </div>
        </div>

        {/* Standardized Footer Buttons */}
        {!hideFooter && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 z-20">
            <FormActionButtons
              onCancel={onClose}
              cancelText={cancelText}
              submitText={submitText}
              className="w-full"
              formId={uniqueFormId}
              hideSubmit={hideSubmit}
            />
          </div>
        )}
      </div>
    </div>,
    targetNode
  );
};

export default ModalForm;
