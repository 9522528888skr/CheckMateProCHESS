import { useState } from 'react';
import { Chess } from 'chess.js';
import { BoardTheme, MoveRecord } from '../types';

interface ChessBoardProps {
  chess: Chess;
  boardTheme: BoardTheme;
  isFlipped: boolean;
  onMove: (from: string, to: string, promotion?: string) => void;
  showLegalMoves: boolean;
  playableColor?: 'w' | 'b' | 'both' | 'none';
  soundEnabled: boolean;
  gameStatus: 'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';
  customSquareStyles?: Record<string, { backgroundColor: string }>;
}

export default function ChessBoard({
  chess,
  boardTheme,
  isFlipped,
  onMove,
  showLegalMoves,
  playableColor = 'both',
  soundEnabled,
  gameStatus,
  customSquareStyles = {}
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleDestinations, setPossibleDestinations] = useState<string[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);

  // Custom audio synthesis for complete offline feedback
  const playChessSound = (type: 'move' | 'capture' | 'check') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'move') {
        // Soft pluck sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'capture') {
        // Low wood snap and high pitch pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(120, ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'check') {
        // High frequency warning chord
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(554.37, ctx.currentTime); // Major third to feel alerted yet strategic
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        
        osc1.stop(ctx.currentTime + 0.3);
        osc2.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  };

  // Convert row, col (0-7) to algebraic square (e.g. "e4")
  const getSquareName = (r: number, c: number): string => {
    const file = String.fromCharCode(97 + c);
    const rank = 8 - r;
    return `${file}${rank}`;
  };

  const getSquareTheme = (r: number, c: number) => {
    const isLight = (r + c) % 2 === 0;
    
    switch (boardTheme) {
      case 'emerald':
        return isLight ? 'bg-[#eeeed2] text-[#769656]' : 'bg-[#769656] text-[#eeeed2]';
      case 'wood':
        return isLight ? 'bg-[#f0d9b5] text-[#b58863]' : 'bg-[#b58863] text-[#f0d9b5]';
      case 'slate':
        return isLight ? 'bg-[#e2e4e6] text-[#708090]' : 'bg-[#708090] text-[#e2e4e6]';
      case 'royal':
        return isLight ? 'bg-[#f0f4f8] text-[#1e40af]' : 'bg-[#1e40af] text-[#f0f4f8]';
    }
  };

  const activeTurnColor = chess.turn();

  // Handle board clicks
  const handleSquareClick = (square: string) => {
    if (gameStatus !== 'active' || promotionPending) return;

    // Check if clicked square is a possible destination
    if (possibleDestinations.includes(square) && selectedSquare) {
      // Determine if this is a pawn promotion move
      const piece = chess.get(selectedSquare as any);
      const isPawn = piece?.type === 'p';
      const toRank = square[1];
      const isPromotion = isPawn && ((piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1'));

      if (isPromotion) {
        setPromotionPending({ from: selectedSquare, to: square });
      } else {
        triggerMove(selectedSquare, square);
      }
      return;
    }

    // Otherwise, try to select a piece
    const piece = chess.get(square as any);
    if (piece) {
      // Restrict selections based on playable color parameter
      if (playableColor !== 'both' && piece.color !== playableColor) {
        setSelectedSquare(null);
        setPossibleDestinations([]);
        return;
      }

      // Restrict selection to current side's turn
      if (piece.color === activeTurnColor) {
        setSelectedSquare(square);
        if (showLegalMoves) {
          const legalMoves = chess.moves({ square: square as any, verbose: true });
          setPossibleDestinations(legalMoves.map((m: any) => m.to));
        } else {
          setPossibleDestinations([]);
        }
      } else {
        setSelectedSquare(null);
        setPossibleDestinations([]);
      }
    } else {
      setSelectedSquare(null);
      setPossibleDestinations([]);
    }
  };

  const triggerMove = (from: string, to: string, promotion = 'q') => {
    // Audit if this is a capture or a check for smart audio feedback before making it
    const destinationPiece = chess.get(to as any);
    const activeMoves = chess.moves({ verbose: true });
    
    onMove(from, to, promotion);
    
    // Clear highlights
    setSelectedSquare(null);
    setPossibleDestinations([]);
    setPromotionPending(null);

    // Audio cue matching move characteristics
    setTimeout(() => {
      if (chess.inCheck()) {
        playChessSound('check');
      } else if (destinationPiece) {
        playChessSound('capture');
      } else {
        playChessSound('move');
      }
    }, 50);
  };

  // Render static custom vector pieces using beautiful uniformly scaled fills
  const getPieceGlyph = (type: string) => {
    switch (type) {
      case 'p': return '♟';
      case 'n': return '♞';
      case 'b': return '♝';
      case 'r': return '♜';
      case 'q': return '♛';
      case 'k': return '♚';
      default: return '';
    }
  };

  // Find King in check to paint check warning alerts
  const isKingInCheckSquare = (square: string, lastPiece: { type: string; color: string } | null, inCheck: boolean): boolean => {
    if (!inCheck) return false;
    if (!lastPiece || lastPiece.type !== 'k') return false;
    return lastPiece.color === activeTurnColor;
  };

  // Generate coordinates (reversed if flipped)
  const rows = Array.from({ length: 8 }, (_, i) => i);
  const cols = Array.from({ length: 8 }, (_, i) => i);

  if (isFlipped) {
    rows.reverse();
    cols.reverse();
  }

  // Get active king square if in check
  let currentCheckSquare = '';
  if (chess.inCheck()) {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === activeTurnColor) {
          currentCheckSquare = getSquareName(r, c);
          break;
        }
      }
    }
  }

  return (
    <div className="relative aspect-square w-full bg-neutral-900 border-4 border-neutral-800 dark:border-neutral-950 rounded-2xl shadow-xl overflow-hidden select-none">
      <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
        {rows.map((r) =>
          cols.map((c) => {
            const sqName = getSquareName(r, c);
            const piece = chess.get(sqName as any);
            const isSelected = selectedSquare === sqName;
            const isPossibleDest = possibleDestinations.includes(sqName);
            const isLastCapture = isPossibleDest && piece;
            const isCheckAlert = sqName === currentCheckSquare;
            const customStyle = customSquareStyles?.[sqName];

            return (
              <div
                key={sqName}
                onClick={() => handleSquareClick(sqName)}
                className={`relative flex items-center justify-center cursor-pointer transition-all duration-150 ${getSquareTheme(
                  r,
                  c
                )}`}
                style={{ contentVisibility: 'auto' }}
              >
                {/* Custom Square Styles (Last Move Highlights) */}
                {customStyle && !isSelected && (
                  <div className="absolute inset-0 pointer-events-none" style={customStyle} />
                )}

                {/* Chess piece label indicator */}
                {piece && (
                  <span
                    className={`text-3xl sm:text-4xl md:text-5xl font-normal select-none transition-transform active:scale-105 duration-100 ${
                      piece.color === 'w'
                        ? 'text-neutral-50 drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)] hover:text-white'
                        : 'text-neutral-900 drop-shadow-[0_1.5px_2px_rgba(255,255,255,0.4)] hover:text-neutral-950'
                    }`}
                  >
                    {getPieceGlyph(piece.type)}
                  </span>
                )}

                {/* Selected Square Highlight Accent */}
                {isSelected && (
                  <div className="absolute inset-0 bg-yellow-400/35 border-2 border-yellow-400 pointer-events-none" />
                )}

                {/* Checked king warning highlight */}
                {isCheckAlert && (
                  <div className="absolute inset-0 bg-red-500/40 animate-pulse border-2 border-red-500 pointer-events-none" />
                )}

                {/* Legal Move Dot indicators */}
                {isPossibleDest && !isLastCapture && (
                  <div className="w-3.5 h-3.5 bg-neutral-950/25 dark:bg-white/25 rounded-full pointer-events-none" />
                )}

                {/* Legal Capture Highlight circle */}
                {isLastCapture && (
                  <div className="absolute w-11/12 h-11/12 border-3 border-amber-500/60 rounded-full pointer-events-none" />
                )}

                {/* Grid coordinate helper text (only along margins) */}
                {((isFlipped && r === 7) || (!isFlipped && r === 7)) && (
                  <span className="absolute bottom-0.5 right-1 text-4xs font-mono font-bold uppercase tracking-wider opacity-60">
                    {String.fromCharCode(97 + c)}
                  </span>
                )}
                {((isFlipped && c === 0) || (!isFlipped && c === 0)) && (
                  <span className="absolute top-0.5 left-1 text-4xs font-mono font-bold uppercase tracking-wider opacity-60">
                    {8 - r}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Promotion Choice Overlay Pop */}
      {promotionPending && (
        <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 text-center max-w-xs shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-neutral-800 dark:text-neutral-100 tracking-tight uppercase">
              Pawn Coronation
            </h4>
            <p className="text-2xs text-neutral-500">
              Your pawn reached the final threshold. Select its ascended shape:
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'Queen', value: 'q', symbol: '♛' },
                { name: 'Knight', value: 'n', symbol: '♞' },
                { name: 'Rook', value: 'r', symbol: '♜' },
                { name: 'Bishop', value: 'b', symbol: '♝' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => triggerMove(promotionPending.from, promotionPending.to, item.value)}
                  className="p-3 bg-neutral-100 hover:bg-amber-100 dark:bg-neutral-800 dark:hover:bg-amber-950/40 rounded-xl flex flex-col items-center gap-1 group cursor-pointer transition-all border border-neutral-200/50 dark:border-neutral-700/50 focus:outline-none"
                >
                  <span className="text-3xl text-neutral-800 dark:text-neutral-200 group-hover:scale-110 group-hover:text-amber-500 duration-150 select-none">
                    {item.symbol}
                  </span>
                  <span className="text-4xs font-mono font-bold uppercase text-neutral-500 group-hover:text-amber-500">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
