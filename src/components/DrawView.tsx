import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Scale,
  Shield,
  Shuffle,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  DrawMode,
  DrawResult,
  Player,
  TeamFormat,
} from '../types/society';
import { StarDisplay } from './StarRating';
import { ConfirmDialog } from './ConfirmDialog';
import { DrawResultView } from './DrawResultView';

interface DrawViewProps {
  players: Player[];
  playersPerTeam: TeamFormat;
  teamCount: number;
  drawMode: DrawMode;
  currentResult: DrawResult | null;
  onChangePlayersPerTeam: (format: TeamFormat) => void;
  onChangeTeamCount: (count: number) => void;
  onChangeDrawMode: (mode: DrawMode) => void;
  onToggleSelectPlayer: (playerId: string) => void;
  onGoToPlayers: () => void;
  onRunDraw: (isExceptionalSize: boolean) => void;
  onClearResult: () => void;
  onSwapPlayers: (
    fromTeamIdx: number,
    fromPlayerId: string,
    toTeamIdx: number,
    toPlayerId: string
  ) => void;
}

type ValidationStage = 'size_mismatch' | 'gk_shortage' | null;

export function DrawView({
  players,
  playersPerTeam,
  teamCount,
  drawMode,
  currentResult,
  onChangePlayersPerTeam,
  onChangeTeamCount,
  onChangeDrawMode,
  onToggleSelectPlayer,
  onGoToPlayers,
  onRunDraw,
  onClearResult,
  onSwapPlayers,
}: DrawViewProps) {
  const [validationStage, setValidationStage] = useState<ValidationStage>(null);
  const [acceptedExceptionalSize, setAcceptedExceptionalSize] = useState(false);
  const [showRosterDrawer, setShowRosterDrawer] = useState(false);

  const selectedPlayers = useMemo(
    () => players.filter((p) => p.selectedForMatch),
    [players]
  );

  const selectedGoalkeepers = useMemo(
    () => selectedPlayers.filter((p) => p.position === 'goalkeeper'),
    [selectedPlayers]
  );

  const selectedOutfielders = useMemo(
    () => selectedPlayers.filter((p) => p.position === 'outfield'),
    [selectedPlayers]
  );

  const requiredPlayers = playersPerTeam * teamCount;
  const diff = selectedPlayers.length - requiredPlayers;
  const hasReserves = diff > 0;
  const isExactOrWithReserves = diff >= 0;
  const isDivisibleByTeams =
    selectedPlayers.length >= teamCount && selectedPlayers.length % teamCount === 0;
  const hasEnoughGoalkeepers = selectedGoalkeepers.length >= teamCount;

  const startDrawFlow = () => {
    if (selectedPlayers.length < teamCount) return;

    // Only prompt size_mismatch when there are FEWER players than requiredPlayers
    if (!isExactOrWithReserves) {
      setAcceptedExceptionalSize(false);
      setValidationStage('size_mismatch');
      return;
    }

    if (!hasEnoughGoalkeepers) {
      setAcceptedExceptionalSize(false);
      setValidationStage('gk_shortage');
      return;
    }

    onRunDraw(false);
  };

  const handleConfirmSizeMismatch = () => {
    const exceptional = !isDivisibleByTeams;
    setAcceptedExceptionalSize(exceptional);

    if (!hasEnoughGoalkeepers) {
      setValidationStage('gk_shortage');
      return;
    }

    setValidationStage(null);
    onRunDraw(exceptional);
  };

  const handleConfirmGkShortage = () => {
    setValidationStage(null);
    onRunDraw(diff < 0 && (acceptedExceptionalSize || !isDivisibleByTeams));
  };

  const handleReshuffle = () => {
    if (!currentResult) {
      startDrawFlow();
      return;
    }
    onRunDraw(currentResult.isExceptionalSize);
  };

  if (currentResult) {
    return (
      <motion.div
        key={currentResult.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <DrawResultView
          result={currentResult}
          onReshuffle={handleReshuffle}
          onNewDrawSetup={onClearResult}
          onSwapPlayers={onSwapPlayers}
        />
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
            Configurar Sorteio
          </h1>
          <p className="text-sm text-[#9FB0A5]">
            Escolha o formato da partida, a quantidade de equipes e o método de divisão.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToPlayers}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5 text-sm font-semibold text-[#D3DED7] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Gerenciar convocação ({selectedPlayers.length})</span>
        </button>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Format & Mode */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Formato da Partida */}
          <section className="bg-[#111914] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-white">
                1. Formato da partida
              </h2>
              <p className="text-xs text-[#8FA396]">
                Defina quantos jogadores compõem cada equipe em campo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([6, 7] as TeamFormat[]).map((format) => {
                const active = playersPerTeam === format;
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => onChangePlayersPerTeam(format)}
                    className={`min-h-[68px] p-4 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 ${
                      active
                        ? 'bg-emerald-600/15 border-emerald-500 text-white'
                        : 'bg-[#0B120E] border-white/10 text-[#A5B6AB] hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-base font-bold">
                        {format} jogadores por time
                      </div>
                      <div className="text-xs text-[#8FA396] mt-0.5">
                        1 goleiro + {format - 1} na linha
                      </div>
                    </div>
                    <span
                      className={`font-mono text-lg font-bold tabular-nums px-2.5 py-1 rounded-lg ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/5 text-[#7E9285]'
                      }`}
                    >
                      {format}v{format}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Quantidade de Equipes */}
          <section className="bg-[#111914] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-white">
                  2. Quantidade de equipes
                </h2>
                <p className="text-xs text-[#8FA396]">
                  {teamCount} times de {playersPerTeam} ={' '}
                  <strong className="text-white font-mono tabular-nums">
                    {requiredPlayers} jogadores necessários
                  </strong>
                </p>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeTeamCount(Math.max(2, teamCount - 1))}
                  disabled={teamCount <= 2}
                  aria-label="Diminuir quantidade de times"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-white/15 bg-[#0B120E] hover:bg-white/5 disabled:opacity-35 flex items-center justify-center text-white transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-xl font-bold text-white w-10 text-center tabular-nums">
                  {teamCount}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeTeamCount(Math.min(6, teamCount + 1))}
                  disabled={teamCount >= 6}
                  aria-label="Aumentar quantidade de times"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-white/15 bg-[#0B120E] hover:bg-white/5 disabled:opacity-35 flex items-center justify-center text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map((count) => {
                const active = teamCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onChangeTeamCount(count)}
                    className={`min-h-[46px] px-3 py-2 rounded-xl border text-center transition-colors ${
                      active
                        ? 'bg-emerald-600/15 border-emerald-500 text-white'
                        : 'bg-[#0B120E] border-white/10 text-[#9FB0A5] hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <div className="text-sm font-bold whitespace-nowrap">
                      {count} times
                    </div>
                    <div className="text-[11px] font-mono text-[#7E9285] tabular-nums">
                      {count * playersPerTeam} jog.
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Modalidade de Sorteio */}
          <section className="bg-[#111914] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-white">
                3. Modalidade do sorteio
              </h2>
              <p className="text-xs text-[#8FA396]">
                Escolha entre divisão totalmente aleatória ou equilibrada por estrelas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChangeDrawMode('balanced')}
                className={`p-4 rounded-xl border text-left transition-colors space-y-2 ${
                  drawMode === 'balanced'
                    ? 'bg-emerald-600/15 border-emerald-500 text-white'
                    : 'bg-[#0B120E] border-white/10 text-[#A5B6AB] hover:border-white/25 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">
                    Sorteio por Pontuação
                  </span>
                  <Scale
                    className={`w-4 h-4 shrink-0 ${
                      drawMode === 'balanced' ? 'text-emerald-400' : 'text-[#7E9285]'
                    }`}
                  />
                </div>
                <p className="text-xs text-[#92A398] leading-relaxed">
                  Equilibra goleiros e linha separadamente usando as estrelas para deixar os times com forças semelhantes.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onChangeDrawMode('random')}
                className={`p-4 rounded-xl border text-left transition-colors space-y-2 ${
                  drawMode === 'random'
                    ? 'bg-emerald-600/15 border-emerald-500 text-white'
                    : 'bg-[#0B120E] border-white/10 text-[#A5B6AB] hover:border-white/25 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">
                    Sorteio Aleatório
                  </span>
                  <Shuffle
                    className={`w-4 h-4 shrink-0 ${
                      drawMode === 'random' ? 'text-emerald-400' : 'text-[#7E9285]'
                    }`}
                  />
                </div>
                <p className="text-xs text-[#92A398] leading-relaxed">
                  Mistura todos os convocados ao acaso, distribuindo goleiros entre os times e mantendo quantidades iguais.
                </p>
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Live Readiness Summary & Selected Roster */}
        <div className="lg:col-span-5 space-y-5">
          <section className="bg-[#111914] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white">
                Resumo da convocação
              </h2>
              <span className="font-mono text-sm font-bold tabular-nums text-white">
                {selectedPlayers.length} / {requiredPlayers}
              </span>
            </div>

            {/* Key Metrics Rows */}
            <div className="space-y-3 text-sm divide-y divide-white/10">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[#9FB0A5]">Necessário ({teamCount} × {playersPerTeam})</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {requiredPlayers} jogadores
                </span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[#9FB0A5]">Selecionados agora</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    isExactOrWithReserves ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {selectedPlayers.length} jogadores
                </span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[#9FB0A5]">Goleiros convocados</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    hasEnoughGoalkeepers ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {selectedGoalkeepers.length} / {teamCount} equipes
                </span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[#9FB0A5]">Jogadores de linha</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {selectedOutfielders.length}
                </span>
              </div>
            </div>

            {/* Validation Notices */}
            <div className="space-y-2.5">
              {selectedPlayers.length < teamCount ? (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    Selecione pelo menos {teamCount} jogadores para montar {teamCount} times.
                  </span>
                </div>
              ) : diff === 0 ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Quantidade exata para {teamCount} times de {playersPerTeam} jogadores.
                  </span>
                </div>
              ) : hasReserves ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Serão sorteados <strong>{teamCount} times de {playersPerTeam} jogadores</strong> ({requiredPlayers} titulares) e{' '}
                    <strong>{diff} {diff === 1 ? 'jogador ficará na reserva' : 'jogadores ficarão na reserva'}</strong>.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Faltam {Math.abs(diff)} jogador(es) para fechar {teamCount} times de {playersPerTeam}.
                    {!isDivisibleByTeams &&
                      ' Com esse total, as equipes ficariam com quantidades desiguais (exige autorização ao sortear).'}
                  </span>
                </div>
              )}

              {!hasEnoughGoalkeepers && selectedPlayers.length >= teamCount && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Há apenas {selectedGoalkeepers.length} goleiro(s) para {teamCount} equipes. Você será avisado antes de concluir o sorteio.
                  </span>
                </div>
              )}
            </div>

            {/* Primary Draw CTA */}
            <button
              type="button"
              onClick={startDrawFlow}
              disabled={selectedPlayers.length < teamCount}
              className="w-full min-h-[54px] px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-bold flex items-center justify-center gap-2.5 transition-colors"
            >
              {drawMode === 'balanced' ? (
                <Scale className="w-5 h-5" />
              ) : (
                <Shuffle className="w-5 h-5" />
              )}
              <span>
                {drawMode === 'balanced'
                  ? 'Sortear times equilibrados'
                  : 'Sortear times aleatoriamente'}
              </span>
            </button>

            {/* Quick toggle to inspect/adjust selected players without leaving */}
            <div className="pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowRosterDrawer((prev) => !prev)}
                className="w-full min-h-[42px] text-xs font-semibold text-[#9FB0A5] hover:text-white flex items-center justify-between py-1 transition-colors"
              >
                <span>
                  {showRosterDrawer
                    ? 'Ocultar lista de convocados'
                    : `Ver ou remover convocados desta partida (${selectedPlayers.length})`}
                </span>
                <span>{showRosterDrawer ? '−' : '+'}</span>
              </button>

              {showRosterDrawer && (
                <div className="mt-2 max-h-64 overflow-y-auto divide-y divide-white/10 border border-white/10 rounded-xl bg-[#0B120E]">
                  {selectedPlayers.length === 0 ? (
                    <p className="p-4 text-xs text-[#7E9285] text-center">
                      Nenhum jogador selecionado. Vá para a aba Elenco para convocar.
                    </p>
                  ) : (
                    selectedPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          {p.position === 'goalkeeper' ? (
                            <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-[#7E9285] shrink-0" />
                          )}
                          <span className="text-xs font-medium text-white truncate">
                            {p.name}
                            {p.complement ? ` (${p.complement})` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StarDisplay rating={p.rating} size="sm" />
                          <button
                            type="button"
                            onClick={() => onToggleSelectPlayer(p.id)}
                            title="Remover apenas desta partida"
                            aria-label={`Remover ${p.name} desta partida`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#8FA396] hover:text-red-400 hover:bg-red-500/10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Size Mismatch / Exceptional Unequal Teams Confirmation */}
      <ConfirmDialog
        open={validationStage === 'size_mismatch'}
        variant="warning"
        title={
          isDivisibleByTeams
            ? 'Quantidade diferente do formato selecionado'
            : 'Autorizar times com quantidades diferentes?'
        }
        description={
          isDivisibleByTeams
            ? `Você selecionou ${selectedPlayers.length} jogadores para ${teamCount} equipes (o formato ${playersPerTeam} por time pede ${requiredPlayers}). Os times ficarão com ${selectedPlayers.length / teamCount} jogadores cada.`
            : `Você selecionou ${selectedPlayers.length} jogadores para ${teamCount} equipes. Não é possível dividir igualmente sem deixar pelo menos um time com quantidade diferente de jogadores.`
        }
        details={[
          `Jogadores selecionados: ${selectedPlayers.length}`,
          `Esperado pelo formato (${teamCount} × ${playersPerTeam}): ${requiredPlayers}`,
          !isDivisibleByTeams
            ? 'Pela regra do sistema, equipes desiguais só são permitidas com sua autorização expressa.'
            : 'Você pode ajustar a convocação no elenco ou confirmar o sorteio com esse número.',
        ]}
        confirmLabel={
          isDivisibleByTeams
            ? 'Sortear mesmo assim'
            : 'Autorizar configuração excepcional'
        }
        cancelLabel="Voltar e ajustar"
        onConfirm={handleConfirmSizeMismatch}
        onCancel={() => setValidationStage(null)}
      />

      {/* Insufficient Goalkeepers Warning */}
      <ConfirmDialog
        open={validationStage === 'gk_shortage'}
        variant="warning"
        title="Goleiros insuficientes para todas as equipes"
        description={`Você convocou apenas ${selectedGoalkeepers.length} ${
          selectedGoalkeepers.length === 1 ? 'goleiro' : 'goleiros'
        } para ${teamCount} equipes. Pelo menos ${
          teamCount - selectedGoalkeepers.length
        } ${
          teamCount - selectedGoalkeepers.length === 1
            ? 'time ficará'
            : 'times ficarão'
        } sem goleiro fixo.`}
        details={[
          `Goleiros selecionados: ${selectedGoalkeepers.length}`,
          `Quantidade de equipes: ${teamCount}`,
          'Você pode voltar ao elenco para marcar outro goleiro ou prosseguir agora.',
        ]}
        confirmLabel="Concluir sorteio mesmo assim"
        cancelLabel="Voltar para selecionar goleiros"
        onConfirm={handleConfirmGkShortage}
        onCancel={() => setValidationStage(null)}
      />
    </div>
  );
}
