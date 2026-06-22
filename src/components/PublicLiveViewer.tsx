import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { 
  subscribeToLiveGame, 
  incrementSpectators, 
  decrementSpectators, 
  LiveGameDoc 
} from '../lib/firebase';
import ChessBoard from './ChessBoard';
import CapturedPieces from './CapturedPieces';
import { Loader2, Eye, Sparkles, Trophy, HelpCircle, ArrowLeft } from 'lucide-react';

interface PublicLiveViewerProps {
  gameId: string;
}

export default function PublicLiveViewer({ gameId }: PublicLiveViewerProps) {
  const [game, setGame] = useState<LiveGameDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [chess, setChess] = useState<Chess | null>(null);

  // Increment spectators on mount, decrement on unmount
  useEffect(() => {
    incrementSpectators(gameId);

    const handleBeforeUnload = () => {
      decrementSpectators(gameId);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      decrementSpectators(gameId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameId]);

  // Subscribe to live game changes
  useEffect(() => {
    const unsubscribe = subscribeToLiveGame(gameId, (data) => {
      if (data) {
        setGame(data);
        try {
          const freshChess = new Chess(data.fen);
          setChess(freshChess);
        } catch (e) {
          console.error("Failed to parse live FEN:", data.fen);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId]);

  if (loading) {
    return (
      <div id="live-loader-screen" className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <h2 className="text-sm font-mono tracking-wider text-neutral-400">CONNECTING TO PUBLIC LIVE ARENA...</h2>
      </div>
    );
  }

  if (!game || !chess) {
    return (
      <div id="live-error-screen" className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl max-w-md shadow-xl">
          <HelpCircle className="w-16 h-16 text-neutral-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-lg font-black tracking-tight text-neutral-200 uppercase mb-2">LIVE ARENA MATCH NOT FOUND</h2>
          <p className="text-xs text-neutral-400 mb-6">
            The requested live broadcast may have finalized, expired, or been removed. Please verify your broadcast stream link details.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold text-2xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all cursor-pointer border border-neutral-700/60"
          >
            Go to CheckMate Pro Portal
          </button>
        </div>
      </div>
    );
  }

  // Compute captured pieces dynamically
  const count = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
  };
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const color = piece.color;
        const type = piece.type;
        if (type !== 'k') {
          count[color][type as keyof typeof count['w']]++;
        }
      }
    }
  }

  const capturedByWhite = {
    p: Math.max(0, 8 - count.b.p),
    n: Math.max(0, 2 - count.b.n),
    b: Math.max(0, 2 - count.b.b),
    r: Math.max(0, 2 - count.b.r),
    q: Math.max(0, 1 - count.b.q),
  };

  const capturedByBlack = {
    p: Math.max(0, 8 - count.w.p),
    n: Math.max(0, 2 - count.w.n),
    b: Math.max(0, 2 - count.w.b),
    r: Math.max(0, 2 - count.w.r),
    q: Math.max(0, 1 - count.w.q),
  };

  // Group moves log into clean list
  const rounds: { index: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < game.moves.length; i += 2) {
    rounds.push({
      index: Math.floor(i / 2) + 1,
      white: game.moves[i],
      black: game.moves[i + 1],
    });
  }

  // Calculate game state message for end modal
  const getOutcomeText = () => {
    if (game.status === 'completed') {
      if (game.winner === 'w') {
        return `White wins! (${game.whitePlayer} has dominated the board)`;
      } else if (game.winner === 'b') {
        return `Black wins! (${game.blackPlayer} achieved checkmate victory)`;
      } else if (game.winner === 'draw') {
        return 'The match resolved in an honorable Draw.';
      }
      return 'The game has finalized.';
    }
    return '';
  };

  return (
    <div id="live-page-root" className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between font-sans">
      
      {/* Header Watermark banner */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-45">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl text-amber-500 animate-pulse">♛</span>
            <div>
              <h1 className="font-extrabold text-sm tracking-widest text-white uppercase flex items-center gap-2">
                CheckMate Pro <span className="text-[10px] font-mono tracking-normal bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded uppercase">Live</span>
              </h1>
              <p className="text-[9px] font-mono text-neutral-400">
                {game.academyName ? `Match from ${game.academyName}` : "Match from Sumeet Rasela Academy"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Spectator count */}
            <div className="bg-neutral-900/80 border border-neutral-800 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs text-neutral-300 font-mono shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>{game.spectators || 1} watching</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Board content arena */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left/Middle Column - Chessboard */}
        <div className="lg:col-span-8 flex flex-col gap-4 items-center justify-center">
          
          {/* Top Player Details Player 2 (Black) */}
          <div className="w-full max-w-[500px] flex items-center justify-between bg-neutral-900/60 border border-neutral-800/60 p-3.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-white font-bold font-mono">
                B
              </div>
              <div>
                <h3 className="text-xs font-black text-white">{game.blackPlayer}</h3>
                <p className="text-[10px] font-mono text-neutral-400">Rating Estimate: {game.blackElo} ELO</p>
              </div>
            </div>
            {chess.turn() === 'b' && game.status === 'active' && (
              <span className="text-[9px] font-mono px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded uppercase animate-pulse">
                TO MOVE
              </span>
            )}
          </div>

          {/* Centralized Grid Wrapper for the Actual Board */}
          <div className="w-full max-w-[500px] aspect-square bg-neutral-900 p-2.5 rounded-2xl border border-neutral-800/80 shadow-2xl relative">
            <ChessBoard
              chess={chess}
              boardTheme="wood"
              isFlipped={false}
              onMove={() => {}} // No interaction
              showLegalMoves={false}
              playableColor="none" // spectator mode
              soundEnabled={true}
              gameStatus={game.status === 'completed' ? 'draw' : 'active'}
            />
          </div>

          {/* Bottom Player Details Player 1 (White) */}
          <div className="w-full max-w-[500px] flex items-center justify-between bg-neutral-900/60 border border-neutral-800/60 p-3.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-200 text-neutral-950 flex items-center justify-center font-bold font-mono">
                W
              </div>
              <div>
                <h3 className="text-xs font-black text-white">{game.whitePlayer}</h3>
                <p className="text-[10px] font-mono text-neutral-400">Rating Estimate: {game.whiteElo} ELO</p>
              </div>
            </div>
            {chess.turn() === 'w' && game.status === 'active' && (
              <span className="text-[9px] font-mono px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded uppercase animate-pulse">
                TO MOVE
              </span>
            )}
          </div>

        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-4 space-y-6 lg:h-[620px] flex flex-col justify-between">
          
          {/* Captured Pieces Panel */}
          <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl space-y-3.5">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 border-b border-neutral-800 pb-1.5 flex items-center gap-1.5">
              <span>●</span> CAPTURED MATERIAL
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-mono text-neutral-400 mb-1">Captured by White (Black pieces taken):</p>
                <div className="flex flex-wrap items-center gap-1 min-h-[1.5rem]">
                  {[
                    { symbol: '♟', count: capturedByWhite.p },
                    { symbol: '♞', count: capturedByWhite.n },
                    { symbol: '♝', count: capturedByWhite.b },
                    { symbol: '♜', count: capturedByWhite.r },
                    { symbol: '♛', count: capturedByWhite.q },
                  ].map((item, idx) => {
                    if (item.count === 0) return null;
                    return (
                      <span key={idx} className="flex items-center text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700/40">
                        <span className="text-sm mr-1 leading-none">{item.symbol}</span>
                        <span className="font-mono text-[10px]">×{item.count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono text-neutral-400 mb-1">Captured by Black (White pieces taken):</p>
                <div className="flex flex-wrap items-center gap-1 min-h-[1.5rem]">
                  {[
                    { symbol: '♙', count: capturedByBlack.p },
                    { symbol: '♘', count: capturedByBlack.n },
                    { symbol: '♗', count: capturedByBlack.b },
                    { symbol: '♖', count: capturedByBlack.r },
                    { symbol: '♕', count: capturedByBlack.q },
                  ].map((item, idx) => {
                    if (item.count === 0) return null;
                    return (
                      <span key={idx} className="flex items-center text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700/40">
                        <span className="text-sm mr-1 leading-none">{item.symbol}</span>
                        <span className="font-mono text-[10px]">×{item.count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Move Log Panel */}
          <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl flex-1 flex flex-col justify-between min-h-[220px]">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 border-b border-neutral-800 pb-1.5 mb-2.5 flex items-center gap-1.5">
              <span>●</span> MOVE LOG ({game.moves.length})
            </h4>
            <div className="grow overflow-y-auto max-h-[200px] text-xs font-mono space-y-1.5 pr-2 custom-scrollbar">
              {rounds.length === 0 ? (
                <p className="text-neutral-500 italic text-[11px] py-4 text-center">No moves made yet.</p>
              ) : (
                rounds.map((r, i) => (
                  <div key={i} className="flex items-center py-1 border-b border-neutral-800/40 hover:bg-neutral-800/10 px-1 rounded">
                    <span className="w-10 text-neutral-500 text-left">{r.index}.</span>
                    <span className="w-24 text-neutral-200 font-bold">{r.white}</span>
                    <span className="w-24 text-neutral-400">{r.black || '-'}</span>
                  </div>
                ))
              )}
            </div>
            
            {/* Status indicators */}
            <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>TURN: {game.turn === 'w' ? 'WHITE' : 'BLACK'}</span>
              <span>HALFMOVES: {game.moves.length}</span>
            </div>
          </div>

          {/* Join CTA Box */}
          <div className="p-4 bg-gradient-to-br from-amber-500/10 via-neutral-950/10 to-neutral-950 border border-amber-500/20 rounded-2xl text-center shadow-lg">
            <Sparkles className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
            <h5 className="text-2xs uppercase tracking-wider font-extrabold text-white mb-1">CHECKMATE PRO ARENA</h5>
            <p className="text-[11px] text-neutral-400 mb-3">Learn chess tactics, measure ELO ranks, and play tournaments.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-3xs uppercase tracking-widest py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Sign Up For CheckMate Pro
            </button>
          </div>

        </div>

      </main>

      {/* Footer watermark */}
      <footer className="border-t border-neutral-900 py-3 bg-neutral-950/90 text-center">
        <p className="text-[10px] font-mono text-neutral-500 tracking-widest">
          CHECKMATE PRO - LIVE WATCH PORTAL • NO LOGIN REQUIRED
        </p>
      </footer>

      {/* GAME ENDED POPUP OVERLAY */}
      {game.status === 'completed' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-900 border-2 border-amber-500/40 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-6 scale-up-pulse">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
              <Trophy className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-white uppercase">GAME COMPLETED</h2>
              <p className="text-xs text-neutral-400 font-mono tracking-wide px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                {getOutcomeText()}
              </p>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Become a grandmaster in the CheckMate Pro Chess network. Register today to play games, test your ratings against AI, and track your metrics.
            </p>

            <div className="space-y-3 pt-2">
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-2xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Join CheckMate Pro Now
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold text-2xs uppercase tracking-wider py-3 px-6 rounded-xl transition-all cursor-pointer border border-neutral-700/60"
              >
                Keep Watching Board
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
