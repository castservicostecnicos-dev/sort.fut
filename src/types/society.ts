export type Position = 'goalkeeper' | 'outfield';

export type StarRating = 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

export interface Player {
  id: string;
  name: string;
  complement: string;
  position: Position;
  rating: StarRating;
  selectedForMatch: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TeamFormat = 6 | 7;

export type DrawMode = 'random' | 'balanced';

export interface Team {
  id: string;
  name: string;
  number: number;
  players: Player[];
  totalScore: number;
  averageScore: number;
  goalkeeperCount: number;
  outfieldCount: number;
}

export interface DrawResult {
  id: string;
  createdAt: number;
  mode: DrawMode;
  playersPerTeam: TeamFormat;
  teamCount: number;
  isExceptionalSize: boolean;
  teams: Team[];
  reserves?: Player[];
  scoreDifference: number;
}

export type AppTab = 'players' | 'draw' | 'history';
