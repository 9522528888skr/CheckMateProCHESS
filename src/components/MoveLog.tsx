import { useEffect, useRef } from 'react';
import { MoveRecord } from '../types';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ListRestart } from 'lucide-react';

interface MoveLogProps {
  moves: MoveRecord[];
  activeMoveIndex: number; // -1 means starting position, 0 means 1st move, etc.
  onSelectMoveIndex: (index: number) => void;
}

export default function MoveLog({ moves, activeMoveIndex, onSelectMoveIndex }: MoveLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new moves are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Group moves into pairs (rounds)
  const rounds: { index: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rounds.push({
      index: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const handlePrev = () => {
    if (activeMoveIndex > -1) {
      onSelectMoveIndex(activeMoveIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeMoveIndex < moves.length - 1) {
      onSelectMoveIndex(activeMoveIndex + 1);
    }
  };

  const handleStart = () => {
    onSelectMoveIndex(-1);
  };

  const handleEnd = () => {
    onSelectMoveIndex(moves.length - 1);
  };

  return (
    <div id="move-log-panel" className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <ListRestart className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-semibold tracking-wide text-neutral-800 dark:text-neutral-200">
            Move Log ({moves.length})
          </span>
        </div>
        {activeMoveIndex !== moves.length - 1 && (
          <span className="text-2xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
            Reviewing History
          </span>
        )}
      </div>

      {/* List Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 text-sm scrollbar-thin h-64 md:h-auto"
      >
        {rounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-8">
            <span className="text-xl">⚔️</span>
            <span className="text-xs mt-2 font-mono">No moves made yet</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {rounds.map((round) => {
              const whiteGlobalIdx = (round.index - 1) * 2;
              const blackGlobalIdx = whiteGlobalIdx + 1;

              const isWhiteActive = activeMoveIndex === whiteGlobalIdx;
              const isBlackActive = activeMoveIndex === blackGlobalIdx;

              return (
                <div
                  key={round.index}
                  className="grid grid-cols-12 py-1 px-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800/30 items-center transition-colors"
                >
                  <span className="col-span-2 font-mono text-xs text-neutral-400 text-right pr-3 select-none">
                    {round.index}.
                  </span>

                  {/* White Move */}
                  <button
                    onClick={() => onSelectMoveIndex(whiteGlobalIdx)}
                    className={`col-span-5 text-left font-mono font-medium rounded px-2 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer transition-all ${
                      isWhiteActive
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 font-bold'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {round.white?.san}
                  </button>

                  {/* Black Move */}
                  {round.black ? (
                    <button
                      onClick={() => onSelectMoveIndex(blackGlobalIdx)}
                      className={`col-span-5 text-left font-mono font-medium rounded px-2 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer transition-all ${
                        isBlackActive
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 font-bold'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {round.black?.san}
                    </button>
                  ) : (
                    <span className="col-span-5 text-neutral-300 dark:text-neutral-700 font-mono italic">
                      ...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Toolbar */}
      <div className="flex items-center justify-around p-2 bg-neutral-50 dark:bg-neutral-900/40 border-t border-neutral-100 dark:border-neutral-800 rounded-b-2xl">
        <button
          onClick={handleStart}
          disabled={moves.length === 0 || activeMoveIndex === -1}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Go to Start"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handlePrev}
          disabled={moves.length === 0 || activeMoveIndex === -1}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Previous Move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-xs font-mono font-medium text-neutral-500 px-2 select-none">
          {activeMoveIndex === -1 ? '0' : activeMoveIndex + 1} / {moves.length}
        </div>
        <button
          onClick={handleNext}
          disabled={moves.length === 0 || activeMoveIndex === moves.length - 1}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Next Move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleEnd}
          disabled={moves.length === 0 || activeMoveIndex === moves.length - 1}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Go to Latest"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
