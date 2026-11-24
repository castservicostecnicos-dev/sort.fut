import { DrawMode, DrawResult, Player, StarRating, Team, TeamFormat } from '../types/society';

export const STAR_OPTIONS: StarRating[] = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export function normalizeIdentifier(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function hasDuplicateIdentity(
  players: Player[],
  name: string,
  complement: string,
  excludeId?: string
): boolean {
  const normName = normalizeIdentifier(name);
  const normComp = normalizeIdentifier(complement);

  return players.some((player) => {
    if (excludeId && player.id === excludeId) return false;
    return (
      normalizeIdentifier(player.name) === normName &&
      normalizeIdentifier(player.complement) === normComp
    );
  });
}

export function formatPlayerLabel(player: Pick<Player, 'name' | 'complement'>): string {
  const cleanName = player.name.trim();
  const cleanComp = player.complement.trim();
  return cleanComp ? `${cleanName} (${cleanComp})` : cleanName;
}

export function formatScore(score: number, decimals = 1): string {
  const rounded = Math.round(score * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals === 1 && rounded % 1 === 0 ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatAverage(avg: number): string {
  return avg.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sortTeamPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position === 'goalkeeper' ? -1 : 1;
    }
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export function buildTeam(number: number, rawPlayers: Player[]): Team {
  const players = sortTeamPlayers(rawPlayers);
  const totalHalfPoints = players.reduce((acc, p) => acc + Math.round(p.rating * 2), 0);
  const totalScore = totalHalfPoints / 2;
  const averageScore = players.length > 0 ? totalScore / players.length : 0;
  const goalkeeperCount = players.filter((p) => p.position === 'goalkeeper').length;
  const outfieldCount = players.length - goalkeeperCount;

  return {
    id: `team-${number}`,
    name: `Time ${number}`,
    number,
    players,
    totalScore,
    averageScore,
    goalkeeperCount,
    outfieldCount,
  };
}

export function recalculateDrawResult(
  draw: DrawResult,
  updatedTeamsPlayers: Player[][]
): DrawResult {
  const teams = updatedTeamsPlayers.map((players, idx) => buildTeam(idx + 1, players));
  const scores = teams.map((t) => Math.round(t.totalScore * 2));
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;

  return {
    ...draw,
    teams,
    scoreDifference: (maxScore - minScore) / 2,
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function deduplicatePlayers(players: Player[]): Player[] {
  const seen = new Set<string>();
  const unique: Player[] = [];
  for (const p of players) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      unique.push(p);
    }
  }
  return unique;
}

function computeTargetSizes(totalPlayers: number, teamCount: number): number[] {
  const base = Math.floor(totalPlayers / teamCount);
  const remainder = totalPlayers % teamCount;
  return Array.from({ length: teamCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

function drawRandomTeams(selectedPlayers: Player[], teamCount: number): Player[][] {
  const uniquePlayers = deduplicatePlayers(selectedPlayers);
  const targetSizes = shuffleArray(computeTargetSizes(uniquePlayers.length, teamCount));

  const goalkeepers = shuffleArray(uniquePlayers.filter((p) => p.position === 'goalkeeper'));
  const outfielders = shuffleArray(uniquePlayers.filter((p) => p.position === 'outfield'));

  const teams: Player[][] = Array.from({ length: teamCount }, () => []);
  const teamOrder = shuffleArray(Array.from({ length: teamCount }, (_, i) => i));

  // Distribute goalkeepers evenly across teams respecting team capacity
  let gkCursor = 0;
  while (gkCursor < goalkeepers.length) {
    let placedInRound = false;
    for (const teamIdx of teamOrder) {
      if (gkCursor >= goalkeepers.length) break;
      if (teams[teamIdx].length < targetSizes[teamIdx]) {
        teams[teamIdx].push(goalkeepers[gkCursor]);
        gkCursor++;
        placedInRound = true;
      }
    }
    if (!placedInRound) break;
  }

  // Distribute outfielders randomly into remaining open slots
  let outCursor = 0;
  for (let i = 0; i < teamCount; i++) {
    while (teams[i].length < targetSizes[i] && outCursor < outfielders.length) {
      teams[i].push(outfielders[outCursor]);
      outCursor++;
    }
  }

  return teams;
}

function evaluateTeamsObjective(teams: Player[][]): number {
  const teamSums = teams.map((team) =>
    team.reduce((sum, p) => sum + Math.round(p.rating * 2), 0)
  );
  const maxSum = Math.max(...teamSums);
  const minSum = Math.min(...teamSums);
  const spread = maxSum - minSum;

  const meanSum = teamSums.reduce((a, b) => a + b, 0) / teams.length;
  const varianceSum = teamSums.reduce((acc, s) => acc + Math.pow(s - meanSum, 2), 0);

  // Penalize concentrating high-rated players (>= 4 stars -> >= 8 half-points) in one team
  const highTierCounts = teams.map(
    (team) => team.filter((p) => Math.round(p.rating * 2) >= 8).length
  );
  const meanHigh = highTierCounts.reduce((a, b) => a + b, 0) / teams.length;
  const highVariance = highTierCounts.reduce((acc, c) => acc + Math.pow(c - meanHigh, 2), 0);

  // Also check GK rating spread when multiple teams have GKs
  const gkSums = teams.map((team) =>
    team
      .filter((p) => p.position === 'goalkeeper')
      .reduce((sum, p) => sum + Math.round(p.rating * 2), 0)
  );
  const gkSpread = Math.max(...gkSums) - Math.min(...gkSums);

  // Also penalize concentration of individual rating sum-of-squares (avoid 5+5+1 vs 3.5+3.5+4)
  const sqRatingsPerTeam = teams.map((team) =>
    team.reduce((acc, p) => acc + Math.pow(Math.round(p.rating * 2), 2), 0)
  );
  const meanSq = sqRatingsPerTeam.reduce((a, b) => a + b, 0) / teams.length;
  const sqVariance = sqRatingsPerTeam.reduce((acc, v) => acc + Math.pow(v - meanSq, 2), 0);

  return (
    spread * 100000 +
    varianceSum * 5000 +
    highVariance * 500 +
    gkSpread * 100 +
    sqVariance * 1
  );
}

function drawBalancedTeams(selectedPlayers: Player[], teamCount: number): Player[][] {
  const uniquePlayers = deduplicatePlayers(selectedPlayers);
  const targetSizes = computeTargetSizes(uniquePlayers.length, teamCount);

  const allGoalkeepers = uniquePlayers.filter((p) => p.position === 'goalkeeper');
  const allOutfielders = uniquePlayers.filter((p) => p.position === 'outfield');

  const RESTARTS = 45;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestCandidates: Player[][][] = [];

  for (let r = 0; r < RESTARTS; r++) {
    const sizes = shuffleArray(targetSizes);
    const teams: Player[][] = Array.from({ length: teamCount }, () => []);

    // Shuffle first so equal-rated players explore different combinations
    const gks = shuffleArray(allGoalkeepers).sort((a, b) => b.rating - a.rating);
    const outs = shuffleArray(allOutfielders).sort((a, b) => b.rating - a.rating);

    // Compute balanced GK cap per team
    const baseGk = Math.floor(gks.length / teamCount);
    const extraGk = gks.length % teamCount;
    const gkOrder = shuffleArray(Array.from({ length: teamCount }, (_, i) => i));
    const gkCaps = Array.from({ length: teamCount }, () => baseGk);
    for (let i = 0; i < extraGk; i++) {
      gkCaps[gkOrder[i]] += 1;
    }

    // Place goalkeepers greedily onto team with lowest current score & available GK slot
    for (const gk of gks) {
      let chosenIdx = -1;
      let lowestScore = Number.POSITIVE_INFINITY;

      const candidateIndices = shuffleArray(Array.from({ length: teamCount }, (_, i) => i));
      for (const idx of candidateIndices) {
        const currentGks = teams[idx].filter((p) => p.position === 'goalkeeper').length;
        if (currentGks < gkCaps[idx] && teams[idx].length < sizes[idx]) {
          const teamScore = teams[idx].reduce((s, p) => s + Math.round(p.rating * 2), 0);
          if (teamScore < lowestScore) {
            lowestScore = teamScore;
            chosenIdx = idx;
          }
        }
      }

      if (chosenIdx === -1) {
        // Fallback if a team's total capacity is smaller than gkCap
        for (const idx of candidateIndices) {
          if (teams[idx].length < sizes[idx]) {
            chosenIdx = idx;
            break;
          }
        }
      }

      if (chosenIdx !== -1) {
        teams[chosenIdx].push(gk);
      }
    }

    // Place outfielders greedily onto team with lowest current score & open slot
    for (const out of outs) {
      let chosenIdx = -1;
      let lowestScore = Number.POSITIVE_INFINITY;

      const candidateIndices = shuffleArray(Array.from({ length: teamCount }, (_, i) => i));
      for (const idx of candidateIndices) {
        if (teams[idx].length < sizes[idx]) {
          const teamScore = teams[idx].reduce((s, p) => s + Math.round(p.rating * 2), 0);
          if (teamScore < lowestScore) {
            lowestScore = teamScore;
            chosenIdx = idx;
          }
        }
      }

      if (chosenIdx !== -1) {
        teams[chosenIdx].push(out);
      }
    }

    // Local search: swap same-position players across different teams to optimize balance
    let improved = true;
    let iterations = 0;
    let currentObj = evaluateTeamsObjective(teams);

    while (improved && iterations < 120) {
      improved = false;
      iterations++;

      for (let t1 = 0; t1 < teamCount; t1++) {
        for (let t2 = t1 + 1; t2 < teamCount; t2++) {
          for (let i1 = 0; i1 < teams[t1].length; i1++) {
            for (let i2 = 0; i2 < teams[t2].length; i2++) {
              const p1 = teams[t1][i1];
              const p2 = teams[t2][i2];
              if (p1.position !== p2.position) continue;
              if (Math.round(p1.rating * 2) === Math.round(p2.rating * 2)) continue;

              // Try swap
              teams[t1][i1] = p2;
              teams[t2][i2] = p1;
              const newObj = evaluateTeamsObjective(teams);

              if (newObj < currentObj - 0.001) {
                currentObj = newObj;
                improved = true;
              } else {
                // Revert
                teams[t1][i1] = p1;
                teams[t2][i2] = p2;
              }
            }
          }
        }
      }
    }

    const cloned = teams.map((t) => [...t]);
    if (currentObj < bestScore - 0.001) {
      bestScore = currentObj;
      bestCandidates = [cloned];
    } else if (Math.abs(currentObj - bestScore) <= 0.001) {
      bestCandidates.push(cloned);
    }
  }

  if (bestCandidates.length === 0) {
    return drawRandomTeams(uniquePlayers, teamCount);
  }

  return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
}

export function executeDraw(params: {
  players: Player[];
  mode: DrawMode;
  playersPerTeam: TeamFormat;
  teamCount: number;
  isExceptionalSize: boolean;
}): DrawResult {
  const { players, mode, playersPerTeam, teamCount, isExceptionalSize } = params;

  const teamsPlayers =
    mode === 'random'
      ? drawRandomTeams(players, teamCount)
      : drawBalancedTeams(players, teamCount);

  const teams = teamsPlayers.map((teamPlayers, idx) => buildTeam(idx + 1, teamPlayers));
  const scores = teams.map((t) => Math.round(t.totalScore * 2));
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;

  return {
    id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    mode,
    playersPerTeam,
    teamCount,
    isExceptionalSize,
    teams,
    scoreDifference: (maxScore - minScore) / 2,
  };
}

export interface WhatsAppExportOptions {
  customTitle?: string;
  includePositions?: boolean;
  includeStars?: boolean;
  includeStarIcons?: boolean;
  includeTotals?: boolean;
}

const TEAM_COLOR_EMOJIS = ['🟢', '🔵', '🟡', '🔴', '🟣', '⚪'];

export function formatStarsEmoji(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return `${'⭐'.repeat(fullStars)}${hasHalf ? '½' : ''}`;
}

export function formatDrawForClipboard(
  draw: DrawResult,
  options: WhatsAppExportOptions = {}
): string {
  const {
    customTitle = '',
    includePositions = true,
    includeStars = true,
    includeStarIcons = true,
    includeTotals = true,
  } = options;

  const modeLabel =
    draw.mode === 'balanced' ? 'Equilibrado por Pontuação' : 'Aleatório';
  const titleLine = customTitle.trim()
    ? `⚽ *${customTitle.trim().toUpperCase()}*`
    : '⚽ *SORTEIO DE TIMES — FUTEBOL SOCIETY*';

  const subtitle = `Formato: ${draw.playersPerTeam} por equipe · ${draw.teamCount} times · ${modeLabel}`;

  const teamBlocks = draw.teams.map((team, idx) => {
    const teamBadge = TEAM_COLOR_EMOJIS[idx % TEAM_COLOR_EMOJIS.length];
    const lines = team.players.map((p) => {
      const label = formatPlayerLabel(p);
      const posPrefix = includePositions
        ? p.position === 'goalkeeper'
          ? '🧤 Goleiro: '
          : '🏃 Linha: '
        : '• ';

      if (!includeStars) {
        return `${posPrefix}${label}`;
      }

      const starPart = includeStarIcons
        ? `${formatStarsEmoji(p.rating)} (${formatScore(p.rating)})`
        : `${formatScore(p.rating)}⭐`;

      return `${posPrefix}${label} — ${starPart}`;
    });

    const totalLine = includeTotals
      ? `\n📊 *Pontuação total:* ${formatScore(team.totalScore)} estrelas (Média: ${formatAverage(team.averageScore)})`
      : '';

    return `\n${teamBadge} *${team.name.toUpperCase()}* (${team.players.length} jogadores)\n${lines.join('\n')}${totalLine}`;
  });

  const footer = includeTotals
    ? `\n\n⚖️ *Diferença entre equipes:* ${formatScore(draw.scoreDifference)} estrela(s)`
    : '';

  return `${titleLine}\n${subtitle}\n${teamBlocks.join('\n')}${footer}`;
}

