import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  ClipboardPaste,
  Shield,
  Square,
  User,
  X,
} from 'lucide-react';
import { Player, Position, StarRating } from '../types/society';
import {
  ParsedWhatsAppPlayer,
  SAMPLE_WHATSAPP_LIST,
  findMatchingExistingPlayer,
  normalizeForMatch,
  parseWhatsAppList,
} from '../utils/whatsappParser';
import {
  STAR_OPTIONS,
  formatScore,
} from '../utils/drawAlgorithm';
import { StarDisplay } from './StarRating';

export interface WhatsAppImportPayload {
  newPlayers: Array<{
    name: string;
    complement: string;
    position: Position;
    rating: StarRating;
    selectedForMatch: boolean;
  }>;
  matchedExistingIds: string[];
  onlySelectImported: boolean;
  goToDraw?: boolean;
}

interface WhatsAppImportModalProps {
  open: boolean;
  existingPlayers: Player[];
  onImport: (payload: WhatsAppImportPayload) => void;
  onClose: () => void;
}

export function WhatsAppImportModal({
  open,
  existingPlayers,
  onImport,
  onClose,
}: WhatsAppImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedWhatsAppPlayer[]>([]);

  useEffect(() => {
    if (!open) return;
    setRawText('');
    setParsedItems([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedItems([]);
      return;
    }
    setParsedItems(parseWhatsAppList(text, existingPlayers));
  };

  // Re-evaluate duplicate identity conflicts live as user edits rows
  const validation = useMemo(() => {
    const included = parsedItems.filter((item) => item.includeInImport);
    const conflictIds = new Set<string>();
    const seenKeys = new Map<string, string>();
    const seenExistingIds = new Map<string, string>();

    const existingMap = new Map<string, Player>();
    for (const p of existingPlayers) {
      const key = `${normalizeForMatch(p.name)}::${normalizeForMatch(p.complement)}`;
      existingMap.set(key, p);
    }

    for (const item of included) {
      const normName = normalizeForMatch(item.name);
      const normComp = normalizeForMatch(item.complement);
      if (!normName) {
        conflictIds.add(item.tempId);
        continue;
      }

      if (item.matchedExistingId) {
        const prevExistingRow = seenExistingIds.get(item.matchedExistingId);
        if (prevExistingRow) {
          conflictIds.add(prevExistingRow);
          conflictIds.add(item.tempId);
        } else {
          seenExistingIds.set(item.matchedExistingId, item.tempId);
        }
      }

      const key = `${normName}::${normComp}`;

      // Duplicate inside the pasted list itself
      const prevId = seenKeys.get(key);
      if (prevId) {
        conflictIds.add(prevId);
        conflictIds.add(item.tempId);
      } else {
        seenKeys.set(key, item.tempId);
      }

      // If this row isn't linked to that existing player, check collision against roster
      const existingMatch = existingMap.get(key);
      if (existingMatch && item.matchedExistingId !== existingMatch.id) {
        conflictIds.add(item.tempId);
      }
    }

    const newCount = included.filter((i) => !i.matchedExistingId).length;
    const matchedCount = included.filter((i) => Boolean(i.matchedExistingId)).length;
    const matchedIdsSet = new Set(
      included
        .map((i) => i.matchedExistingId)
        .filter((id): id is string => Boolean(id))
    );
    const existingExcludedCount = existingPlayers.filter(
      (p) => !matchedIdsSet.has(p.id)
    ).length;

    return {
      includedCount: included.length,
      newCount,
      matchedCount,
      existingExcludedCount,
      conflictIds,
      hasConflicts: conflictIds.size > 0,
    };
  }, [parsedItems, existingPlayers]);

  if (!open) return null;

  const updateItem = (
    tempId: string,
    patch: Partial<ParsedWhatsAppPlayer>
  ) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, ...patch };
        if (patch.name !== undefined || patch.complement !== undefined) {
          const matched = findMatchingExistingPlayer(
            updated.name,
            updated.complement,
            updated.position,
            existingPlayers,
            false
          );
          if (matched) {
            updated.matchedExistingId = matched.id;
            updated.position = matched.position;
            updated.rating = matched.rating;
          } else {
            if (item.matchedExistingId) {
              updated.rating = 3.5;
            }
            updated.matchedExistingId = undefined;
          }
        }
        return updated;
      })
    );
  };

  const handleConfirmImport = (goToDraw: boolean) => {
    if (validation.includedCount === 0 || validation.hasConflicts) return;

    const included = parsedItems.filter((item) => item.includeInImport);
    const newPlayers = included
      .filter((item) => !item.matchedExistingId)
      .map((item) => ({
        name: item.name.trim(),
        complement: item.complement.trim(),
        position: item.position,
        rating: item.rating,
        selectedForMatch: true,
      }));

    const matchedExistingIds = included
      .map((item) => item.matchedExistingId)
      .filter((id): id is string => Boolean(id));

    onImport({
      newPlayers,
      matchedExistingIds,
      onlySelectImported: true,
      goToDraw,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-import-title"
    >
      <div className="w-full sm:max-w-3xl max-h-[92vh] flex flex-col bg-[#121B15] border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="space-y-0.5">
            <h2
              id="whatsapp-import-title"
              className="text-xl font-bold text-white"
            >
              Importar Lista do WhatsApp
            </h2>
            <p className="text-xs text-[#92A398]">
              Cole a lista do WhatsApp como estiver: emojis, números, @ e símbolos são removidos automaticamente para manter só o nome.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar importação"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-[#92A398] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Textarea Input */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="whatsapp-textarea"
                className="text-sm font-semibold text-[#D5E0D8]"
              >
                Mensagem copiada do WhatsApp
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTextChange(SAMPLE_WHATSAPP_LIST)}
                  className="min-h-[34px] px-3 py-1 rounded-lg border border-white/15 bg-[#0B120E] hover:bg-white/5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Testar com exemplo</span>
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => handleTextChange('')}
                    className="min-h-[34px] px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-medium text-[#92A398] hover:text-white transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <textarea
              id="whatsapp-textarea"
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={5}
              placeholder={`Exemplo:\nGoleiros:\n1 - Gabriel (Goleiro)\n2 - Carlos\n\nLinha:\n3 - João\n4 - Pedro - Volante\n5 - Lucas ⭐⭐⭐⭐`}
              className="w-full p-3.5 rounded-xl bg-[#0B120E] border border-white/15 text-sm text-white placeholder-[#5C7063] focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
            />
          </div>

          {/* Parsed Players Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#9FB0A5] tabular-nums">
                  <span>
                    <strong className="text-white">{validation.includedCount}</strong>{' '}
                    na lista final
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{validation.matchedCount} já cadastrados</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-medium">
                    {validation.newCount} novos (3,5 ★)
                  </span>
                  {validation.existingExcludedCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#8FA396]">
                        {validation.existingExcludedCount} cadastrados fora desta lista (serão desmarcados)
                      </span>
                    </>
                  )}
                </div>

                <span className="text-xs font-medium text-emerald-400">
                  Apenas esta lista ficará marcada para o sorteio
                </span>
              </div>

              {validation.hasConflicts && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200 leading-relaxed"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    Há jogadores com o mesmo nome e identificação complementar repetida (destacados em vermelho). Adicione uma identificação complementar diferente ou desmarque o item repetido.
                  </span>
                </div>
              )}

              <div className="border border-white/10 rounded-xl divide-y divide-white/10 bg-[#0B120E]">
                {parsedItems.map((item) => {
                  const isMatched = Boolean(item.matchedExistingId);
                  const hasConflict =
                    item.includeInImport && validation.conflictIds.has(item.tempId);

                  return (
                    <div
                      key={item.tempId}
                      className={`p-3 sm:p-3.5 space-y-2.5 transition-colors ${
                        !item.includeInImport
                          ? 'opacity-50'
                          : hasConflict
                            ? 'bg-red-500/[0.08]'
                            : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                        {/* Include Toggle + Name/Complement Inputs */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.tempId, {
                                includeInImport: !item.includeInImport,
                              })
                            }
                            aria-label={`Incluir ${item.name}`}
                            className={`min-h-[40px] min-w-[40px] -ml-1 flex items-center justify-center rounded-lg shrink-0 ${
                              item.includeInImport
                                ? 'text-emerald-400'
                                : 'text-[#5D7064]'
                            }`}
                          >
                            {item.includeInImport ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateItem(item.tempId, { name: e.target.value })
                              }
                              aria-label="Nome do jogador"
                              placeholder="Nome"
                              className={`min-h-[40px] px-3 py-1.5 rounded-lg bg-[#121B15] border text-sm text-white focus:outline-none focus:border-emerald-500 ${
                                hasConflict ? 'border-red-500/70' : 'border-white/10'
                              }`}
                            />
                            <input
                              type="text"
                              value={item.complement}
                              onChange={(e) =>
                                updateItem(item.tempId, {
                                  complement: e.target.value,
                                })
                              }
                              aria-label="Identificação complementar"
                              placeholder="Identificação (opcional)"
                              className={`min-h-[40px] px-3 py-1.5 rounded-lg bg-[#121B15] border text-sm text-[#D5E0D8] placeholder-[#5F7266] focus:outline-none focus:border-emerald-500 ${
                                hasConflict ? 'border-red-500/70' : 'border-white/10'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Position + Rating Controls */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 pl-10 sm:pl-0 shrink-0">
                          {isMatched ? (
                            <div className="flex items-center gap-2 text-xs text-[#9FB0A5]">
                              <span className="text-emerald-400 font-semibold">
                                Já cadastrado
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {item.position === 'goalkeeper' ? 'Goleiro' : 'Linha'}
                              </span>
                              <StarDisplay rating={item.rating} size="sm" />
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  updateItem(item.tempId, {
                                    position:
                                      item.position === 'goalkeeper'
                                        ? 'outfield'
                                        : 'goalkeeper',
                                  })
                                }
                                className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                  item.position === 'goalkeeper'
                                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                                    : 'bg-[#121B15] border-white/10 text-[#C4D1C8] hover:border-white/25'
                                }`}
                              >
                                {item.position === 'goalkeeper' ? (
                                  <>
                                    <Shield className="w-3.5 h-3.5" />
                                    <span>Goleiro</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3.5 h-3.5" />
                                    <span>Linha</span>
                                  </>
                                )}
                              </button>

                              <select
                                value={item.rating}
                                onChange={(e) =>
                                  updateItem(item.tempId, {
                                    rating: Number(e.target.value) as StarRating,
                                  })
                                }
                                aria-label={`Estrelas de ${item.name}`}
                                className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#121B15] border border-white/10 text-xs font-mono font-bold text-[#FACC15] focus:outline-none focus:border-emerald-500"
                              >
                                {STAR_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {formatScore(opt)} ★
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rawText.trim() && parsedItems.length === 0 && (
            <div className="p-6 rounded-xl bg-[#0B120E] border border-white/10 text-center text-sm text-[#92A398]">
              Não foi possível identificar nomes de jogadores neste texto. Verifique se há um nome por linha.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-white/10 bg-[#0E1611] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-[#889B8F] hidden lg:inline">
            Novos entram com 3,5 ★; cadastrados fora da lista ficam desmarcados.
          </span>
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full lg:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-[#D3DED7] hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleConfirmImport(false)}
              disabled={validation.includedCount === 0 || validation.hasConflicts}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-white/15 bg-[#16221B] hover:bg-[#1D2D23] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors whitespace-nowrap"
            >
              Salvar elenco ({validation.includedCount})
            </button>
            <button
              type="button"
              onClick={() => handleConfirmImport(true)}
              disabled={validation.includedCount < 2 || validation.hasConflicts}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <span>Montar e sortear ({validation.includedCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
