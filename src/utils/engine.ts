import { Chess } from 'chess.js';

// Piece Square Tables (PST) for positional evaluation.
// Values denote centipawns (1/100 of a pawn value).
// Tables are oriented from White's perspective (index 0 is row 8, index 63 is row 1).

const pawnEval = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const knightEval = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const bishopEval = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const rookEval = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const queenEval = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const kingEvalMiddleGame = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

const kingEvalEndGame = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

// Map piece indexes from row/col to coordinate 0-63
// Black's PST is flipped vertically
function getPstValue(pieceType: string, isWhite: boolean, r: number, c: number, isEndGame: boolean): number {
  const row = isWhite ? r : 7 - r;
  const col = c;
  
  switch (pieceType) {
    case 'p': return pawnEval[row][col];
    case 'n': return knightEval[row][col];
    case 'b': return bishopEval[row][col];
    case 'r': return rookEval[row][col];
    case 'q': return queenEval[row][col];
    case 'k': return isEndGame ? kingEvalEndGame[row][col] : kingEvalMiddleGame[row][col];
    default: return 0;
  }
}

// Evaluate the board statically from White's perspective (positive = White advantage)
export function evaluateBoard(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  
  // Count material to determine if it is an endgame
  let totalPieces = 0;
  let qCount = 0;
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        totalPieces++;
        if (piece.type === 'q') qCount++;
      }
    }
  }
  
  const isEndGame = totalPieces <= 10 || (totalPieces <= 14 && qCount === 0);

  // Value mappings
  const values: Record<string, number> = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const type = piece.type;
        const isWhite = piece.color === 'w';
        const materialValue = values[type] || 0;
        const pstValue = getPstValue(type, isWhite, r, c, isEndGame);
        
        const pieceVal = materialValue + pstValue;
        if (isWhite) {
          score += pieceVal;
        } else {
          score -= pieceVal;
        }
      }
    }
  }
  
  return score;
}

// Minimax with Alpha-Beta pruning
function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = chess.moves({ verbose: true });
  
  // Simple move sorting: evaluate capturing moves first to improve pruning efficiency
  moves.sort((a, b) => {
    const scoreA = ('captured' in a && a.captured) ? 10 : 0;
    const scoreB = ('captured' in b && b.captured) ? 10 : 0;
    return scoreB - scoreA;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q'
      });
      const score = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break; // beta cutoff
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q'
      });
      const score = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) {
        break; // alpha cutoff
      }
    }
    return minEval;
  }
}

// Get the best move for the active player based on raw difficulty
export function getBestMove(
  chess: Chess,
  difficulty: 'novice' | 'casual' | 'intermediate' | 'advanced' | 'master' | 'grandmaster' | 'world_champion' | 'super_grandmaster' | 'stockfish_god'
): { from: string; to: string; promotion?: string } | null {
  const moves = chess.moves({ verbose: true });
  
  if (moves.length === 0) return null;

  // 1. Novice Play: Plays random moves 35% of the time, else searches with Depth 1 (weakest PST)
  if (difficulty === 'novice' && Math.random() < 0.35) {
    const randomIdx = Math.floor(Math.random() * moves.length);
    const m = moves[randomIdx];
    return { from: m.from, to: m.to, promotion: m.promotion || 'q' };
  }

  // Define depth limit based on difficulty
  let depth = 1;
  if (difficulty === 'casual') depth = 2;
  else if (difficulty === 'intermediate') depth = 3;
  else if (difficulty === 'advanced') depth = 4;
  else if (difficulty === 'master') depth = 5;
  else if (difficulty === 'grandmaster') depth = 6;
  else if (difficulty === 'world_champion') depth = 7;
  else if (difficulty === 'super_grandmaster') depth = 7; // Cap calculation depth to avoid page hang
  else if (difficulty === 'stockfish_god') depth = 7; // Cap calculation depth to avoid page hang

  const isWhiteTurn = chess.turn() === 'w';
  let bestMove: typeof moves[0] | null = null;
  
  let bestScore = isWhiteTurn ? -Infinity : Infinity;

  // Iterate legal moves and score them
  for (const move of moves) {
    chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q'
    });
    
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isWhiteTurn);
    chess.undo();

    if (isWhiteTurn) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  if (!bestMove && moves.length > 0) {
    // Fallback just in case
    return moves[0];
  }

  return bestMove ? { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion || 'q' } : null;
}
