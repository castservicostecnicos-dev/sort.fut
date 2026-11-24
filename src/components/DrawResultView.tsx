import React, { useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  RefreshCw,
  RotateCcw,
  Share2,
  Shield,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { DrawResult, Player } from '../types/society';
import {
  formatAverage,
  formatDrawForClipboard,
  formatScore,
} from '../utils/drawAlgorithm';
import { StarDisplay } from './StarRating';
import {
  WhatsAppExportModal,
  copyTextWithFallback,
} from './WhatsAppExportModal';

interface DrawResultViewProps {
  result: DrawResult;
  onReshuffle: () => void;
  onNewDrawSetup: () => void;
  onSwapPlayers: (
    fromTeamIdx: number,
    fromPlayerId: string,
    toTeamIdx: number,
    toPlayerId: string
  ) => void;
}

const TEAM_HEADER_ACCENTS = [
  'bg-emerald-500',
  'bg-sky-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-violet-400',
  'bg-teal-300',
];

export function DrawResultView({
  result,
  onReshuffle,
  onNewDrawSetup,
  onSwapPlayers,
}: DrawResultViewProps) {
  const [swapOrigin, setSwapOrigin] = useState<{
    teamIdx: number;
    player: Player;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handlePlayerClick = (teamIdx: number, player: Player) => {
    if (!swapOrigin) {
      setSwapOrigin({ teamIdx, player });
      return;
    }

    if (swapOrigin.player.id === player.id) {
      setSwapOrigin(null);
      return;
    }

    if (swapOrigin.teamIdx === teamIdx) {
      // Switch selection to this player on the same team
      setSwapOrigin({ teamIdx, player });
      return;
    }

    onSwapPlayers(swapOrigin.teamIdx, swapOrigin.player.id, teamIdx, player.id);
    setSwapOrigin(null);
  };

  const handleCopy = async () => {
    const ok = await copyTextWithFallback(formatDrawForClipboard(result));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const gridColsClass =
    result.teams.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : result.teams.length === 3
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2';

  const modeLabel =
    result.mode === 'balanced' ? 'Sorteio por Pontuação' : 'Sorteio Aleatório';

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        key={result.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
      {/* Top Result Header & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#9FB0A5]">
            <span className="text-emerald-400 font-semibold">{modeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Society {result.playersPerTeam} por equipe</span>
            <span aria-hidden="true">·</span>
            <span>{result.teamCount} times</span>
            {result.isExceptionalSize && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300">Configuração excepcional</span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
            Times Sorteados
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onReshuffle}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Embaralhar novamente</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#141E18] hover:bg-[#1B2820] border border-white/15 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#9FB0A5]" />
                <span>Copiar rápido</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#141E18] hover:bg-[#1B2820] border border-emerald-500/35 text-sm font-semibold text-emerald-300 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <Share2 className="w-4 h-4" />
            <span>Exportar WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onNewDrawSetup}
            className="min-h-[46px] px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-sm font-semibold text-[#D3DED7] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Novo sorteio</span>
          </button>
        </div>
      </div>

      {/* Balance Difference & Swap Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 bg-[#111914] border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#8FA396]">
              Diferença entre as equipes
            </span>
            <p className="text-sm text-[#C4D1C8]">
              {result.scoreDifference === 0
                ? 'Equipes com pontuação exatamente igual'
                : 'Variação entre o maior e o menor time'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${
                result.scoreDifference <= 1
                  ? 'text-emerald-400'
                  : result.scoreDifference <= 2.5
                    ? 'text-amber-300'
                    : 'text-rose-300'
              }`}
            >
              {formatScore(result.scoreDifference)} ★
            </span>
          </div>
        </div>

        <div
          className={`lg:col-span-7 border rounded-2xl px-5 py-4 flex items-center justify-between gap-3 transition-colors ${
            swapOrigin
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-[#111914] border-white/10'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ArrowLeftRight
              className={`w-5 h-5 shrink-0 ${
                swapOrigin ? 'text-emerald-400' : 'text-[#8FA396]'
              }`}
            />
            {swapOrigin ? (
              <p className="text-sm text-white truncate">
                Trocando{' '}
                <strong className="text-emerald-300">{swapOrigin.player.name}</strong>{' '}
                (Time {swapOrigin.teamIdx + 1}) — toque em um jogador de outro time
              </p>
            ) : (
              <p className="text-sm text-[#A5B6AB]">
                Troca manual: toque em um jogador e depois em outro de outra equipe para trocar e recalcular.
              </p>
            )}
          </div>
          {swapOrigin && (
            <button
              type="button"
              onClick={() => setSwapOrigin(null)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>
          )}
        </div>
      </div>

      {/* Teams Grid */}
      <div className={`grid gap-5 ${gridColsClass}`}>
        {result.teams.map((team, teamIdx) => {
          const accentBar =
            TEAM_HEADER_ACCENTS[teamIdx % TEAM_HEADER_ACCENTS.length];
          return (
            <motion.section
              key={`${result.id}-${team.id}`}
              aria-label={team.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.22,
                delay: teamIdx * 0.055,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="bg-[#111914] border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Subtle top color bar */}
                <div className={`h-1 w-full ${accentBar}`} />

                {/* Team Header */}
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
                      {team.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-[#92A398] tabular-nums">
                      <span>{team.players.length} jogadores</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {team.goalkeeperCount}{' '}
                        {team.goalkeeperCount === 1 ? 'goleiro' : 'goleiros'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right tabular-nums">
                    <div className="font-mono text-xl font-bold text-[#FACC15]">
                      {formatScore(team.totalScore)} ★
                    </div>
                    <div className="text-xs text-[#92A398]">
                      Média {formatAverage(team.averageScore)}
                    </div>
                  </div>
                </div>

                {/* Players List */}
                <div className="divide-y divide-white/10">
                  {team.players.map((player) => {
                    const isGK = player.position === 'goalkeeper';
                    const isSelectedForSwap = swapOrigin?.player.id === player.id;
                    const isSwapTarget =
                      swapOrigin !== null && swapOrigin.teamIdx !== teamIdx;

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handlePlayerClick(teamIdx, player)}
                        className={`w-full px-5 py-3 min-h-[54px] flex items-center justify-between gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${
                          isSelectedForSwap
                            ? 'bg-emerald-500/15'
                            : isSwapTarget
                              ? 'hover:bg-white/[0.06]'
                              : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                              isSelectedForSwap
                                ? 'bg-emerald-500 text-[#090F0B]'
                                : isGK
                                  ? 'bg-amber-400/15 text-amber-300'
                                  : 'bg-white/5 text-[#8FA396]'
                            }`}
                          >
                            {isGK ? (
                              <Shield className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-1.5">
                              <span
                                className={`text-sm font-semibold truncate ${
                                  isSelectedForSwap ? 'text-emerald-300' : 'text-white'
                                }`}
                              >
                                {player.name}
                              </span>
                              {player.complement && (
                                <span className="text-xs text-[#8FA396] truncate">
                                  ({player.complement})
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-xs ${
                                isGK ? 'text-amber-300/90 font-medium' : 'text-[#84998B]'
                              }`}
                            >
                              {isGK ? 'Goleiro' : 'Jogador de linha'}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <StarDisplay rating={player.rating} size="sm" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Team Summary Footer */}
              <div className="px-5 py-3.5 bg-[#0C130E] border-t border-white/10 flex items-center justify-between text-xs text-[#A5B6AB] tabular-nums">
                <span>
                  Pontuação total:{' '}
                  <strong className="text-white font-mono">
                    {formatScore(team.totalScore)} estrelas
                  </strong>
                </span>
                <span>
                  Média:{' '}
                  <strong className="text-white font-mono">
                    {formatAverage(team.averageScore)}
                  </strong>
                </span>
              </div>
            </motion.section>
          );
        })}
      </div>

      {/* Bottom Quick Action on Mobile */}
      <div className="flex sm:hidden pt-1">
        <button
          type="button"
          onClick={onNewDrawSetup}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-white/15 bg-[#111914] text-sm font-semibold text-white inline-flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Ajustar jogadores ou formato</span>
        </button>
      </div>

      <WhatsAppExportModal
        open={exportModalOpen}
        draw={result}
        onClose={() => setExportModalOpen(false)}
      />
      </motion.div>
    </MotionConfig>
  );
}
