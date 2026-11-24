import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showChromeGuide, setShowChromeGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // If browser hasn't fired beforeinstallprompt yet (e.g. non-iOS or already dismissed prompt),
  // render an unobtrusive footer trigger or hide banner when dismissed.
  const canDirectInstall = isInstallable;

  if (!canDirectInstall && !isIOS) {
    return (
      <>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-4">
          <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#8FA396]">
            <span>
              SocietyPro funciona offline e pode ser instalado como aplicativo no Chrome.
            </span>
            <button
              type="button"
              onClick={() => setShowChromeGuide(true)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-semibold text-[#D5E0D8] inline-flex items-center gap-1.5 self-start sm:self-auto transition-colors whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Como instalar no aparelho</span>
            </button>
          </div>
        </div>

        {showChromeGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chrome-install-guide-title"
          >
            <div className="w-full sm:max-w-md bg-[#121B15] border border-white/15 rounded-t-2xl sm:rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3
                  id="chrome-install-guide-title"
                  className="text-lg font-bold text-white"
                >
                  Instalar SocietyPro pelo Chrome
                </h3>
                <button
                  type="button"
                  onClick={() => setShowChromeGuide(false)}
                  aria-label="Fechar instruções"
                  className="min-h-[40px] min-w-[40px] -mr-2 -mt-2 flex items-center justify-center rounded-lg text-[#92A398] hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="space-y-2.5 text-sm text-[#C4D1C8] leading-relaxed">
                <li>
                  <strong className="text-white">No Android (Chrome):</strong>{' '}
                  toque no menu <strong>⋮</strong> (canto superior direito) e
                  selecione <strong>Instalar aplicativo</strong> ou{' '}
                  <strong>Adicionar à tela inicial</strong>.
                </li>
                <li>
                  <strong className="text-white">No Computador (Chrome):</strong>{' '}
                  clique no ícone de instalação na barra de endereço (à direita)
                  e confirme <strong>Instalar</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowChromeGuide(false)}
                className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-4">
        {dismissed ? (
          <div className="border-t border-white/10 pt-4 flex justify-end">
            <button
              type="button"
              onClick={canDirectInstall ? install : () => setShowIOSGuide(true)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-semibold text-emerald-300 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar aplicativo</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#111914] border border-emerald-500/30 rounded-2xl p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">
                  Instalar SocietyPro no aparelho
                </div>
                <p className="text-xs text-[#9FB0A5]">
                  Acesse em tela cheia direto da tela inicial, mesmo sem internet no campo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canDirectInstall ? (
                <button
                  type="button"
                  onClick={install}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-bold text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar App</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(true)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-bold text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Share className="w-4 h-4" />
                  <span>Instalar no iPhone</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dispensar aviso de instalação"
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-[#8FA396] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div className="w-full sm:max-w-md bg-[#121B15] border border-white/15 rounded-t-2xl sm:rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 id="ios-install-title" className="text-lg font-bold text-white">
                Instalar no iPhone / iPad
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Fechar instruções"
                className="min-h-[40px] min-w-[40px] -mr-2 -mt-2 flex items-center justify-center rounded-lg text-[#92A398] hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-2.5 text-sm text-[#C4D1C8] leading-relaxed">
              <li>
                1. Toque no botão <strong>Compartilhar</strong> na barra do
                Safari.
              </li>
              <li>
                2. Role para baixo e toque em{' '}
                <strong>Adicionar à Tela de Início</strong>.
              </li>
              <li>
                3. Confirme em <strong>Adicionar</strong> para abrir como app
                nativo.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
