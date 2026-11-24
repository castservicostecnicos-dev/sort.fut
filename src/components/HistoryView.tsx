import React, { useState } from 'react';
import { Calendar, Eye, History, Share2, Shield, Trash2, User } from 'lucide-react';
import { DrawResult } from '../types/society';
import { formatAverage, formatScore } from '../utils/drawAlgorithm';
import { StarDisplay } from './StarRating';
import { ConfirmDialog } from './ConfirmDialog';
import { WhatsAppExportModal } from './WhatsAppExportModal';

interface HistoryViewProps {
  history: DrawResult[];
  onLoadDraw: (draw: DrawResult) => void;
  onDeleteEntry: (id: string) => void;
  onClearHistory: () => void;
}

export function HistoryView({
  history,
  onLoadDraw,
  onDeleteEntry,
  onClearHistory,
}: HistoryViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    history[0]?.id ?? null
  );
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [exportingDraw, setExportingDraw] = useState<DrawResult | null>(null);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
            Histórico de Sorteios
          </h1>
          <p className="text-sm text-[#9FB0A5]">
            Consulte os últimos sorteios realizados e reabra qualquer partida para ajustes manuais.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearAll(true)}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-white/15 hover:border-red-500/40 hover:bg-red-500/10 text-sm font-semibold text-[#D3DED7] hover:text-red-300 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar histórico</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-[#111914] border border-white/10 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#8FA396]">
            <History className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Nenhum sorteio registrado</h2>
          <p className="text-sm text-[#92A398] max-w-md mx-auto">
            Quando você realizar um sorteio de times, ele ficará salvo automaticamente aqui para consulta futura.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const modeLabel =
              entry.mode === 'balanced' ? 'Por Pontuação' : 'Aleatório';

            return (
              <article
                key={entry.id}
                className="bg-[#111914] border border-white/10 rounded-2xl overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#9FB0A5] tabular-nums">
                      <span className="inline-flex items-center gap-1.5 text-white font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {formatDate(entry.createdAt)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400 font-semibold">{modeLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {entry.teamCount} times ({entry.playersPerTeam} por equipe)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-amber-300">
                        Dif: {formatScore(entry.scoreDifference)} ★
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#C4D1C8] tabular-nums pt-0.5">
                      {entry.teams.map((t) => (
                        <span key={t.id}>
                          <strong className="text-white">{t.name}:</strong>{' '}
                          {formatScore(t.totalScore)} ★ (média {formatAverage(t.averageScore)})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entry.id)
                      }
                      className="min-h-[42px] px-3.5 py-2 rounded-xl border border-white/15 hover:bg-white/5 text-xs font-semibold text-white transition-colors whitespace-nowrap"
                    >
                      {isExpanded ? 'Ocultar times' : 'Ver detalhes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportingDraw(entry)}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl border border-white/15 hover:bg-white/5 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exportar WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadDraw(entry)}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-xs font-bold text-emerald-300 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Abrir na tela de sorteio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(entry.id)}
                      aria-label="Excluir registro do histórico"
                      className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-[#8FA396] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entry.teams.map((team) => (
                      <div
                        key={team.id}
                        className="bg-[#0B120E] border border-white/10 rounded-xl p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="font-display text-lg font-bold uppercase text-white">
                            {team.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                            {formatScore(team.totalScore)} ★ · Média {formatAverage(team.averageScore)}
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {team.players.map((p) => (
                            <li
                              key={p.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="flex items-center gap-1.5 text-[#D5E0D8] truncate">
                                {p.position === 'goalkeeper' ? (
                                  <Shield className="w-3 h-3 text-amber-300 shrink-0" />
                                ) : (
                                  <User className="w-3 h-3 text-[#7E9285] shrink-0" />
                                )}
                                <span className="truncate">
                                  {p.name}
                                  {p.complement ? ` (${p.complement})` : ''}
                                </span>
                              </span>
                              <StarDisplay rating={p.rating} size="sm" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmClearAll}
        variant="danger"
        title="Limpar todo o histórico?"
        description="Todos os sorteios salvos anteriormente serão removidos. Seus jogadores cadastrados não serão apagados."
        confirmLabel="Limpar histórico"
        onConfirm={() => {
          setConfirmClearAll(false);
          onClearHistory();
        }}
        onCancel={() => setConfirmClearAll(false)}
      />

      <WhatsAppExportModal
        open={exportingDraw !== null}
        draw={exportingDraw}
        onClose={() => setExportingDraw(null)}
      />
    </div>
  );
}
