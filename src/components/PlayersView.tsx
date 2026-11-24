import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Edit3,
  Plus,
  Search,
  Shield,
  Square,
  Trash2,
  User,
  UserCheck,
  UserX,
  ArrowRight,
  RotateCcw,
  MessageSquarePlus,
} from 'lucide-react';
import { Player, Position } from '../types/society';
import { StarDisplay } from './StarRating';

interface PlayersViewProps {
  players: Player[];
  onAddPlayer: () => void;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (player: Player) => void;
  onToggleSelect: (playerId: string) => void;
  onSelectAll: (onlyFilteredIds?: string[]) => void;
  onClearSelection: (onlyFilteredIds?: string[]) => void;
  onLoadSampleSquad: () => void;
  onGoToDraw: () => void;
  onOpenWhatsAppImport: () => void;
}

type PositionFilter = 'all' | Position;
type MatchFilter = 'all' | 'selected' | 'unselected';

export function PlayersView({
  players,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onLoadSampleSquad,
  onGoToDraw,
  onOpenWhatsAppImport,
}: PlayersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');

  const stats = useMemo(() => {
    const total = players.length;
    const selected = players.filter((p) => p.selectedForMatch);
    const goalkeepers = players.filter((p) => p.position === 'goalkeeper').length;
    const outfielders = total - goalkeepers;
    const selectedGoalkeepers = selected.filter((p) => p.position === 'goalkeeper').length;
    const selectedOutfielders = selected.length - selectedGoalkeepers;
    return {
      total,
      selectedCount: selected.length,
      goalkeepers,
      outfielders,
      selectedGoalkeepers,
      selectedOutfielders,
    };
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...players]
      .filter((p) => {
        if (positionFilter !== 'all' && p.position !== positionFilter) return false;
        if (matchFilter === 'selected' && !p.selectedForMatch) return false;
        if (matchFilter === 'unselected' && p.selectedForMatch) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.complement.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.position !== b.position) {
          return a.position === 'goalkeeper' ? -1 : 1;
        }
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [players, searchQuery, positionFilter, matchFilter]);

  const filteredIds = useMemo(() => filteredPlayers.map((p) => p.id), [filteredPlayers]);
  const allFilteredSelected =
    filteredPlayers.length > 0 && filteredPlayers.every((p) => p.selectedForMatch);

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
            Elenco e Convocação
          </h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-[#9FB0A5] tabular-nums">
            <span>
              <strong className="text-white font-semibold">{stats.total}</strong> cadastrados ({stats.goalkeepers} goleiros · {stats.outfielders} linha)
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">
              <strong>{stats.selectedCount}</strong> convocados para a partida ({stats.selectedGoalkeepers} gol · {stats.selectedOutfielders} linha)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenWhatsAppImport}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#16221B] hover:bg-[#1D2D23] border border-white/15 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <MessageSquarePlus className="w-4 h-4 text-emerald-400" />
            <span>Importar WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onAddPlayer}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#16221B] hover:bg-[#1D2D23] border border-white/15 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Novo jogador</span>
          </button>

          <button
            type="button"
            onClick={onGoToDraw}
            disabled={stats.selectedCount < 2}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 disabled:cursor-not-allowed text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <span>Ir para o sorteio ({stats.selectedCount})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#111914] border border-white/10 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#7E9285] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar jogador por nome ou identificação..."
              aria-label="Pesquisar jogador por nome"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#0A100C] border border-white/10 text-sm text-white placeholder-[#687C70] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Position Segmented Filter */}
          <div
            className="grid grid-cols-3 sm:inline-flex p-1 bg-[#0A100C] border border-white/10 rounded-xl gap-1"
            role="group"
            aria-label="Filtrar por posição"
          >
            <button
              type="button"
              onClick={() => setPositionFilter('all')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                positionFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'text-[#9FB0A5] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setPositionFilter('goalkeeper')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                positionFilter === 'goalkeeper'
                  ? 'bg-emerald-600 text-white'
                  : 'text-[#9FB0A5] hover:text-white'
              }`}
            >
              Goleiros
            </button>
            <button
              type="button"
              onClick={() => setPositionFilter('outfield')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                positionFilter === 'outfield'
                  ? 'bg-emerald-600 text-white'
                  : 'text-[#9FB0A5] hover:text-white'
              }`}
            >
              Linha
            </button>
          </div>
        </div>

        {/* Secondary row: Match Presence Filter & Bulk Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#7E9285] mr-1">Convocação:</span>
            {(
              [
                { key: 'all', label: 'Todos' },
                { key: 'selected', label: 'Na partida' },
                { key: 'unselected', label: 'Fora da partida' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMatchFilter(item.key)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  matchFilter === item.key
                    ? 'bg-white/15 text-white'
                    : 'text-[#8FA396] hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                allFilteredSelected
                  ? onClearSelection(filteredIds)
                  : onSelectAll(filteredIds)
              }
              disabled={filteredPlayers.length === 0}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#0A100C] hover:border-white/25 disabled:opacity-40 text-xs font-semibold text-[#D5E0D8] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {allFilteredSelected ? (
                <>
                  <UserX className="w-3.5 h-3.5 text-amber-400" />
                  <span>Desmarcar exibidos</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Convocar exibidos</span>
                </>
              )}
            </button>

            {stats.selectedCount > 0 && (
              <button
                type="button"
                onClick={() => onClearSelection()}
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#0A100C] hover:border-white/25 text-xs font-semibold text-[#A5B6AB] hover:text-white transition-colors whitespace-nowrap"
              >
                Limpar convocação
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty States */}
      {players.length === 0 ? (
        <div className="bg-[#111914] border border-white/10 rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <User className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-white">Nenhum jogador cadastrado</h2>
            <p className="text-sm text-[#92A398] leading-relaxed">
              Cadastre os participantes da sua pelada com posição e estrelas, ou carregue um elenco de exemplo para testar o sorteio agora.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenWhatsAppImport}
              className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Importar lista do WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={onAddPlayer}
              className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Cadastrar manualmente</span>
            </button>
            <button
              type="button"
              onClick={onLoadSampleSquad}
              className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-sm font-semibold text-[#D3DED7] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Carregar exemplo</span>
            </button>
          </div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-[#111914] border border-white/10 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-[#A5B6AB]">
            Nenhum jogador encontrado para os filtros atuais.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setPositionFilter('all');
              setMatchFilter('all');
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white hover:bg-white/5 transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        /* Player List */
        <div className="bg-[#111914] border border-white/10 rounded-2xl divide-y divide-white/10 overflow-hidden">
          {filteredPlayers.map((player) => {
            const isGK = player.position === 'goalkeeper';
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between gap-3 px-3 sm:px-5 py-3 transition-colors ${
                  player.selectedForMatch
                    ? 'bg-emerald-500/[0.04]'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                {/* Selection Toggle + Identity */}
                <button
                  type="button"
                  onClick={() => onToggleSelect(player.id)}
                  aria-pressed={player.selectedForMatch}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left min-h-[48px] py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg"
                >
                  <span
                    className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                      player.selectedForMatch ? 'text-emerald-400' : 'text-[#5D7064]'
                    }`}
                  >
                    {player.selectedForMatch ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-base font-semibold text-white truncate">
                        {player.name}
                      </span>
                      {player.complement && (
                        <span className="text-xs font-medium text-[#92A398] truncate">
                          ({player.complement})
                        </span>
                      )}
                    </div>

                    {/* Clean unboxed metadata row */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#9FB0A5]">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isGK ? 'text-amber-300' : 'text-[#A8B9AE]'
                        }`}
                      >
                        {isGK ? (
                          <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <User className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {isGK ? 'Goleiro' : 'Linha'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <StarDisplay rating={player.rating} size="sm" />
                      <span aria-hidden="true" className="hidden sm:inline">·</span>
                      <span
                        className={`hidden sm:inline font-medium ${
                          player.selectedForMatch ? 'text-emerald-400' : 'text-[#73867A]'
                        }`}
                      >
                        {player.selectedForMatch ? 'Na partida' : 'Fora desta partida'}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditPlayer(player)}
                    aria-label={`Editar ${player.name}`}
                    title="Editar jogador e estrelas"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9FB0A5] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePlayer(player)}
                    aria-label={`Excluir ${player.name}`}
                    title="Excluir cadastro"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9FB0A5] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
