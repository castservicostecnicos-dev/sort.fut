import React, { useEffect, useState } from 'react';
import { History, Plus, Shuffle, Users } from 'lucide-react';
import {
  AppTab,
  DrawMode,
  DrawResult,
  Player,
  Position,
  StarRating,
  TeamFormat,
} from './types/society';
import { SAMPLE_PLAYERS } from './data/samplePlayers';
import { executeDraw, recalculateDrawResult } from './utils/drawAlgorithm';
import { PlayersView } from './components/PlayersView';
import { DrawView } from './components/DrawView';
import { HistoryView } from './components/HistoryView';
import { PlayerFormModal } from './components/PlayerFormModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  WhatsAppImportModal,
  WhatsAppImportPayload,
} from './components/WhatsAppImportModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';

const STORAGE_KEYS = {
  PLAYERS: 'societypro_players_v1',
  INITIALIZED: 'societypro_initialized_v1',
  HISTORY: 'societypro_history_v1',
  CONFIG: 'societypro_config_v1',
  ACTIVE_DRAW: 'societypro_active_draw_v1',
};

function loadInitialPlayers(): Player[] {
  try {
    const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    if (!initialized) {
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, '1');
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(SAMPLE_PLAYERS));
      return SAMPLE_PLAYERS;
    }
  } catch {
    // Fallback gracefully if storage unavailable
  }
  return [];
}

function loadInitialHistory(): DrawResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

function loadInitialConfig(): {
  playersPerTeam: TeamFormat;
  teamCount: number;
  drawMode: DrawMode;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        playersPerTeam: parsed.playersPerTeam === 7 ? 7 : 6,
        teamCount:
          typeof parsed.teamCount === 'number' &&
          parsed.teamCount >= 2 &&
          parsed.teamCount <= 6
            ? parsed.teamCount
            : 2,
        drawMode: parsed.drawMode === 'random' ? 'random' : 'balanced',
      };
    }
  } catch {
    // Ignore
  }
  return { playersPerTeam: 6, teamCount: 2, drawMode: 'balanced' };
}

function loadActiveDraw(): DrawResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_DRAW);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore
  }
  return null;
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>(loadInitialPlayers);
  const [history, setHistory] = useState<DrawResult[]>(loadInitialHistory);
  const [config, setConfig] = useState(loadInitialConfig);
  const [currentDraw, setCurrentDraw] = useState<DrawResult | null>(loadActiveDraw);
  const [activeTab, setActiveTab] = useState<AppTab>('players');

  // Modals
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, '1');
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    } catch {
      // Ignore storage quota errors
    }
  }, [players]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch {
      // Ignore
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch {
      // Ignore
    }
  }, [config]);

  useEffect(() => {
    try {
      if (currentDraw) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_DRAW, JSON.stringify(currentDraw));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_DRAW);
      }
    } catch {
      // Ignore
    }
  }, [currentDraw]);

  // Player CRUD handlers
  const handleOpenAddPlayer = () => {
    setEditingPlayer(null);
    setIsPlayerModalOpen(true);
  };

  const handleOpenEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setIsPlayerModalOpen(true);
  };

  const handleSavePlayer = (data: {
    id?: string;
    name: string;
    complement: string;
    position: Position;
    rating: StarRating;
  }) => {
    const now = Date.now();
    if (data.id) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.id
            ? {
                ...p,
                name: data.name,
                complement: data.complement,
                position: data.position,
                rating: data.rating,
                updatedAt: now,
              }
            : p
        )
      );
    } else {
      const newPlayer: Player = {
        id: `player-${now}-${Math.random().toString(36).slice(2, 7)}`,
        name: data.name,
        complement: data.complement,
        position: data.position,
        rating: data.rating,
        selectedForMatch: true,
        createdAt: now,
        updatedAt: now,
      };
      setPlayers((prev) => [newPlayer, ...prev]);
    }
    setIsPlayerModalOpen(false);
    setEditingPlayer(null);
  };

  const handleConfirmDeletePlayer = () => {
    if (!deletingPlayer) return;
    setPlayers((prev) => prev.filter((p) => p.id !== deletingPlayer.id));
    setDeletingPlayer(null);
  };

  const handleToggleSelectPlayer = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, selectedForMatch: !p.selectedForMatch } : p
      )
    );
  };

  const handleSelectAll = (onlyIds?: string[]) => {
    const targetSet = onlyIds ? new Set(onlyIds) : null;
    setPlayers((prev) =>
      prev.map((p) =>
        !targetSet || targetSet.has(p.id)
          ? { ...p, selectedForMatch: true }
          : p
      )
    );
  };

  const handleClearSelection = (onlyIds?: string[]) => {
    const targetSet = onlyIds ? new Set(onlyIds) : null;
    setPlayers((prev) =>
      prev.map((p) =>
        !targetSet || targetSet.has(p.id)
          ? { ...p, selectedForMatch: false }
          : p
      )
    );
  };

  const handleLoadSampleSquad = () => {
    setPlayers(SAMPLE_PLAYERS);
  };

  const handleWhatsAppImport = (payload: WhatsAppImportPayload) => {
    const now = Date.now();
    const matchedSet = new Set(payload.matchedExistingIds);

    const createdPlayers: Player[] = payload.newPlayers.map((np, idx) => ({
      id: `player-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      name: np.name,
      complement: np.complement,
      position: np.position,
      rating: np.rating,
      selectedForMatch: true,
      createdAt: now + idx,
      updatedAt: now + idx,
    }));

    setPlayers((prev) => {
      const updatedExisting = prev.map((p) => {
        if (matchedSet.has(p.id)) {
          return { ...p, selectedForMatch: true };
        }
        if (payload.onlySelectImported) {
          return { ...p, selectedForMatch: false };
        }
        return p;
      });
      return [...createdPlayers, ...updatedExisting];
    });

    setIsWhatsAppModalOpen(false);
    if (payload.goToDraw) {
      setCurrentDraw(null);
      setActiveTab('draw');
    }
  };

  // Draw Handlers
  const handleRunDraw = (isExceptionalSize: boolean) => {
    const selected = players.filter((p) => p.selectedForMatch);
    const result = executeDraw({
      players: selected,
      mode: config.drawMode,
      playersPerTeam: config.playersPerTeam,
      teamCount: config.teamCount,
      isExceptionalSize,
    });
    setCurrentDraw(result);
    setHistory((prev) => [result, ...prev].slice(0, 30));
  };

  const handleSwapPlayers = (
    fromTeamIdx: number,
    fromPlayerId: string,
    toTeamIdx: number,
    toPlayerId: string
  ) => {
    if (!currentDraw) return;

    const teamsPlayers = currentDraw.teams.map((t) => [...t.players]);
    const reserves = [...(currentDraw.reserves ?? [])];

    const getList = (idx: number) => (idx === -1 ? reserves : teamsPlayers[idx]);
    const listA = getList(fromTeamIdx);
    const listB = getList(toTeamIdx);

    const idxA = listA?.findIndex((p) => p.id === fromPlayerId);
    const idxB = listB?.findIndex((p) => p.id === toPlayerId);

    if (
      !listA ||
      !listB ||
      idxA === undefined ||
      idxA < 0 ||
      idxB === undefined ||
      idxB < 0
    ) {
      return;
    }

    const playerA = listA[idxA];
    const playerB = listB[idxB];

    listA[idxA] = playerB;
    listB[idxB] = playerA;

    const updated = recalculateDrawResult(currentDraw, teamsPlayers, reserves);
    setCurrentDraw(updated);
    setHistory((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleLoadDrawFromHistory = (draw: DrawResult) => {
    setCurrentDraw(draw);
    setActiveTab('draw');
  };

  const handleDeleteHistoryEntry = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const selectedCount = players.filter((p) => p.selectedForMatch).length;

  return (
    <div className="min-h-screen bg-[#0A0F0C] text-[#F1F5F2] flex flex-col pb-20 md:pb-10">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="md:sticky md:top-0 z-30 bg-[#0A0F0C]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className="font-display text-2xl font-extrabold tracking-tight text-white uppercase whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md"
          >
            SocietyPro
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-7 text-sm font-semibold"
          >
            <button
              type="button"
              onClick={() => setActiveTab('players')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'players'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-[#92A398] hover:text-white'
              }`}
            >
              Elenco ({players.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('draw')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'draw'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-[#92A398] hover:text-white'
              }`}
            >
              Sortear Times
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'history'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-[#92A398] hover:text-white'
              }`}
            >
              Histórico ({history.length})
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleOpenAddPlayer}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Jogador</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'players' && (
          <PlayersView
            players={players}
            onAddPlayer={handleOpenAddPlayer}
            onEditPlayer={handleOpenEditPlayer}
            onDeletePlayer={setDeletingPlayer}
            onToggleSelect={handleToggleSelectPlayer}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onLoadSampleSquad={handleLoadSampleSquad}
            onOpenWhatsAppImport={() => setIsWhatsAppModalOpen(true)}
            onGoToDraw={() => {
              setCurrentDraw(null);
              setActiveTab('draw');
            }}
          />
        )}

        {activeTab === 'draw' && (
          <DrawView
            players={players}
            playersPerTeam={config.playersPerTeam}
            teamCount={config.teamCount}
            drawMode={config.drawMode}
            currentResult={currentDraw}
            onChangePlayersPerTeam={(playersPerTeam) =>
              setConfig((prev) => ({ ...prev, playersPerTeam }))
            }
            onChangeTeamCount={(teamCount) =>
              setConfig((prev) => ({ ...prev, teamCount }))
            }
            onChangeDrawMode={(drawMode) =>
              setConfig((prev) => ({ ...prev, drawMode }))
            }
            onToggleSelectPlayer={handleToggleSelectPlayer}
            onGoToPlayers={() => setActiveTab('players')}
            onRunDraw={handleRunDraw}
            onClearResult={() => setCurrentDraw(null)}
            onSwapPlayers={handleSwapPlayers}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onLoadDraw={handleLoadDrawFromHistory}
            onDeleteEntry={handleDeleteHistoryEntry}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      <PWAInstallBanner />
      <OfflineIndicator />

      {/* Mobile Bottom Navigation Bar (Thumb Zone, compact 64px <= 15% cap) */}
      <nav
        aria-label="Navegação móvel"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0D1410]/95 backdrop-blur-md border-t border-white/10 grid grid-cols-3 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveTab('players')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
            activeTab === 'players' ? 'text-emerald-400' : 'text-[#8FA396]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="whitespace-nowrap">Elenco ({selectedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('draw')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
            activeTab === 'draw' ? 'text-emerald-400' : 'text-[#8FA396]'
          }`}
        >
          <Shuffle className="w-5 h-5" />
          <span className="whitespace-nowrap">Sorteio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
            activeTab === 'history' ? 'text-emerald-400' : 'text-[#8FA396]'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="whitespace-nowrap">Histórico</span>
        </button>
      </nav>

      {/* Add/Edit Player Modal */}
      <PlayerFormModal
        open={isPlayerModalOpen}
        editingPlayer={editingPlayer}
        existingPlayers={players}
        onSave={handleSavePlayer}
        onClose={() => {
          setIsPlayerModalOpen(false);
          setEditingPlayer(null);
        }}
      />

      {/* WhatsApp List Import Modal */}
      <WhatsAppImportModal
        open={isWhatsAppModalOpen}
        existingPlayers={players}
        onImport={handleWhatsAppImport}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />

      {/* Delete Player Confirmation */}
      <ConfirmDialog
        open={deletingPlayer !== null}
        variant="danger"
        title="Excluir cadastro do jogador?"
        description={
          deletingPlayer
            ? `Tem certeza que deseja excluir permanentemente ${deletingPlayer.name}${
                deletingPlayer.complement ? ` (${deletingPlayer.complement})` : ''
              }? Para tirá-lo apenas da partida de hoje, basta desmarcar a caixa de convocação.`
            : ''
        }
        confirmLabel="Excluir cadastro"
        onConfirm={handleConfirmDeletePlayer}
        onCancel={() => setDeletingPlayer(null)}
      />
    </div>
  );
}
