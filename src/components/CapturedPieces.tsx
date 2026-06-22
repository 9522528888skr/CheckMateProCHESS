import { CapturedPieces as ICapturedPieces } from '../types';

interface CapturedPiecesProps {
  capturedByWhite: ICapturedPieces;
  capturedByBlack: ICapturedPieces;
}

export default function CapturedPieces({ capturedByWhite, capturedByBlack }: CapturedPiecesProps) {
  // Piece weights
  const weights = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  
  // Calculate total values
  const whiteValue = 
    capturedByWhite.p * weights.p +
    capturedByWhite.n * weights.n +
    capturedByWhite.b * weights.b +
    capturedByWhite.r * weights.r +
    capturedByWhite.q * weights.q;

  const blackValue = 
    capturedByBlack.p * weights.p +
    capturedByBlack.n * weights.n +
    capturedByBlack.b * weights.b +
    capturedByBlack.r * weights.r +
    capturedByBlack.q * weights.q;

  const wDiff = whiteValue - blackValue;
  const bDiff = blackValue - whiteValue;

  const renderPieces = (captured: ICapturedPieces, isWhiteTaker: boolean) => {
    const list: { symbol: string; count: number; name: string }[] = [
      { symbol: isWhiteTaker ? '♟' : '♙', count: captured.p, name: 'Pawn' },
      { symbol: isWhiteTaker ? '♞' : '♘', count: captured.n, name: 'Knight' },
      { symbol: isWhiteTaker ? '♝' : '♗', count: captured.b, name: 'Bishop' },
      { symbol: isWhiteTaker ? '♜' : '♖', count: captured.r, name: 'Rook' },
      { symbol: isWhiteTaker ? '♛' : '♕', count: captured.q, name: 'Queen' },
    ];

    return (
      <div className="flex flex-wrap items-center gap-1 min-h-[1.5rem]">
        {list.map((item, idx) => {
          if (item.count === 0) return null;
          return (
            <span
              key={idx}
              className={`flex items-center text-sm font-medium select-none px-1.5 py-0.5 rounded-sm bg-neutral-100/50 dark:bg-neutral-800/40 text-neutral-800 dark:text-neutral-200 border border-neutral-200/50 dark:border-neutral-700/30`}
              title={`${item.count} captured ${item.name}(s)`}
            >
              <span className="text-base mr-0.5 leading-none">{item.symbol}</span>
              <span className="text-xs font-mono">×{item.count}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div id="captured-pieces-panel" className="grid grid-cols-2 gap-4 p-3 bg-white/60 dark:bg-neutral-900/60 backdrop-blur rounded-xl border border-neutral-200/70 dark:border-neutral-800/60">
      {/* Captured by White (Black pieces taken) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">White Captures</span>
          {wDiff > 0 && (
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
              +{wDiff}
            </span>
          )}
        </div>
        {renderPieces(capturedByWhite, true)}
      </div>

      {/* Captured by Black (White pieces taken) */}
      <div className="space-y-1 border-l border-neutral-200/60 dark:border-neutral-800/60 pl-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Black Captures</span>
          {bDiff > 0 && (
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
              +{bDiff}
            </span>
          )}
        </div>
        {renderPieces(capturedByBlack, false)}
      </div>
    </div>
  );
}
