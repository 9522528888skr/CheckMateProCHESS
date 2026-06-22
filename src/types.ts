export type GameMode = 'local' | 'ai' | 'puzzle' | 'online' | 'daily' | 'tournament';

export type BoardTheme = 'emerald' | 'wood' | 'slate' | 'royal';

export type AIDifficulty = 'novice' | 'casual' | 'intermediate' | 'advanced' | 'master' | 'grandmaster' | 'world_champion' | 'super_grandmaster' | 'stockfish_god';

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  color: 'w' | 'b';
  piece: string;
  fen: string; // The FEN *after* this move
}

export interface CapturedPieces {
  p: number; // pawns
  n: number; // knights
  b: number; // bishops
  r: number; // rooks
  q: number; // queens
}

export interface ChessPuzzle {
  id: string;
  title: string;
  description: string;
  category: 'Checkmate' | 'Tactics' | 'Defensive' | 'Endgames';
  initialFen: string;
  solutionMoves: string[]; // sequence of correct SAN moves, e.g. ["Qxf7+", "Kh8", "Qxg7#"] or similar
  opponentMovesResponse: string[]; // what the "opponent" responds with, matching index for index
  hint: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rating?: number;
  theme?: string;
}


export interface GameSettings {
  initialTimeMinutes: number; // e.g. 10 for rapid, 0 for casual/no timer
  engineDifficulty: AIDifficulty;
  theme: BoardTheme;
  showLegalMoves: boolean;
  soundEnabled: boolean;
  playerColor: 'w' | 'b' | 'random'; // for Play vs AI
}
