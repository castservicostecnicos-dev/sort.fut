import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckSquare, Copy, Square, X } from 'lucide-react';
import { DrawResult } from '../types/society';
import { formatDrawForClipboard } from '../utils/drawAlgorithm';

interface WhatsAppExportModalProps {
  open: boolean;
  draw: DrawResult | null;
  onClose: () => void;
}

export function copyTextWithFallback(
  text: string,
  textareaEl?: HTMLTextAreaElement | null
): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => fallbackExecCopy(text, textareaEl));
  }
  return Promise.resolve(fallbackExecCopy(text, textareaEl));
}

function fallbackExecCopy(
  text: string,
  textareaEl?: HTMLTextAreaElement | null
): boolean {
  try {
    if (textareaEl) {
      textareaEl.focus();
      textareaEl.select();
      return document.execCommand('copy');
    }
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(temp);
    return ok;
  } catch {
    return false;
  }
}

export function WhatsAppExportModal({
  open,
  draw,
  onClose,
}: WhatsAppExportModalProps) {
  const [customTitle, setCustomTitle] = useState('');
  const [includePositions, setIncludePositions] = useState(true);
  const [includeStars, setIncludeStars] = useState(true);
  const [includeStarIcons, setIncludeStarIcons] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);
  const [manualText, setManualText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setManualText(null);
    setCopied(false);
  }, [open, draw]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const generatedText = useMemo(() => {
    if (!draw) return '';
    return formatDrawForClipboard(draw, {
      customTitle,
      includePositions,
      includeStars,
      includeStarIcons,
      includeTotals,
    });
  }, [
    draw,
    customTitle,
    includePositions,
    includeStars,
    includeStarIcons,
    includeTotals,
  ]);

  const displayedText = manualText !== null ? manualText : generatedText;

  if (!open || !draw) return null;

  const handleToggleOption = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setManualText(null);
    setter((prev) => !prev);
  };

  const handleCopy = async () => {
    const ok = await copyTextWithFallback(displayedText, textareaRef.current);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-export-title"
    >
      <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-[#121B15] border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="space-y-0.5">
            <h2
              id="whatsapp-export-title"
              className="text-xl font-bold text-white"
            >
              Exportar para WhatsApp
            </h2>
            <p className="text-xs text-[#92A398]">
              Lista formatada com times, jogadores, posições, estrelas e pontuação total.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar exportação"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-[#92A398] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Custom Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="export-custom-title"
              className="block text-xs font-semibold text-[#D5E0D8]"
            >
              Título da partida (opcional)
            </label>
            <input
              id="export-custom-title"
              type="text"
              value={customTitle}
              onChange={(e) => {
                setManualText(null);
                setCustomTitle(e.target.value);
              }}
              placeholder="Ex: Society Quarta-feira 20h · Arena Central"
              maxLength={64}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0B120E] border border-white/15 text-sm text-white placeholder-[#5C7063] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Format Options */}
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-1">
            {[
              {
                label: 'Posições (Goleiro / Linha)',
                checked: includePositions,
                onToggle: () => handleToggleOption(setIncludePositions),
              },
              {
                label: 'Estrelas dos jogadores',
                checked: includeStars,
                onToggle: () => handleToggleOption(setIncludeStars),
              },
              {
                label: 'Ícones ⭐ visuais',
                checked: includeStarIcons,
                disabled: !includeStars,
                onToggle: () => handleToggleOption(setIncludeStarIcons),
              },
              {
                label: 'Pontuação total e diferença',
                checked: includeTotals,
                onToggle: () => handleToggleOption(setIncludeTotals),
              },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                disabled={opt.disabled}
                onClick={opt.onToggle}
                className="inline-flex items-center gap-2 text-xs font-medium text-[#D5E0D8] hover:text-white disabled:opacity-40 transition-colors"
              >
                <span className={opt.checked ? 'text-emerald-400' : 'text-[#667B6E]'}>
                  {opt.checked ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Preview Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="whatsapp-export-preview"
                className="text-xs font-semibold text-[#D5E0D8]"
              >
                Mensagem pronta para colar no grupo
              </label>
              {manualText !== null && (
                <button
                  type="button"
                  onClick={() => setManualText(null)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Restaurar padrão
                </button>
              )}
            </div>

            <textarea
              ref={textareaRef}
              id="whatsapp-export-preview"
              value={displayedText}
              onChange={(e) => setManualText(e.target.value)}
              rows={13}
              className="w-full p-4 rounded-xl bg-[#0B120E] border border-white/15 font-mono text-xs sm:text-sm text-[#E7EFE9] leading-relaxed focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-white/10 bg-[#0E1611] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-[#889B8F]">
            {copied
              ? 'Texto copiado! Agora basta colar no grupo do WhatsApp.'
              : 'Você pode editar a mensagem acima antes de copiar.'}
          </span>
          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-[#D3DED7] hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado para WhatsApp!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar lista</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
