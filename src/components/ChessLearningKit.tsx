import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import { BoardTheme } from '../types';
import { ArrowLeft, Award, GraduationCap, Lightbulb, RotateCcw } from 'lucide-react';

interface ChessLearningKitProps {
  boardTheme?: BoardTheme;
  soundEnabled?: boolean;
}

export default function ChessLearningKit({
  boardTheme = 'emerald',
  soundEnabled = true
}: ChessLearningKitProps) {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [game, setGame] = useState(new Chess());
  const [currentLesson, setCurrentLesson] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [userMove, setUserMove] = useState('');

  const t = {
    en: {
      title: "CHESS LEARNING KIT",
      subtitle: "Learn chess with real board & code examples",
      lessons: "LESSONS",
      practice: "PRACTICE BOARD",
      code: "CODE EXAMPLE",
      hint: "HINT",
      reset: "RESET",
      next: "NEXT LESSON",
      prev: "PREVIOUS",
      lessonsList: [
        {
          name: "Pawn Movement",
          desc: "Pawns move forward 1 square. First move can be 2 squares.",
          fen: "8/8/8/8/8/8/4P3/8 w - - 0 1",
          hint: "Try moving e2 to e4",
          code: `game.move({from: 'e2', to: 'e4'}); // Pawn moves 2 squares first time`
        },
        {
          name: "Knight Movement",
          desc: "Knights move in L-shape: 2 squares + 1 square turn.",
          fen: "8/8/8/8/8/8/8/4N3 w - - 0 1",
          hint: "Knight can jump: e1 to f3 or g2",
          code: `game.move({from: 'e1', to: 'f3'}); // L-shape move`
        },
        {
          name: "Check & Checkmate",
          desc: "Check = King attacked. Checkmate = No escape from check.",
          fen: "7k/8/8/8/8/R6K w - - 0 1",
          hint: "Rook to a8 is check! (e.g. Ra3 to a8)",
          code: `game.move({from: 'a3', to: 'a8'}); // Checkmate or Check!`
        },
        {
          name: "Castling",
          desc: "King + Rook special move. King moves 2 squares, Rook jumps over.",
          fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
          hint: "King e1 to g1 = Kingside castle",
          code: `game.move({from: 'e1', to: 'g1'}); // O-O Castling`
        }
      ]
    },
    hi: {
      title: "शतरंज सीखने की किट",
      subtitle: "असली बोर्ड और कोड उदाहरणों के साथ शतरंज सीखें",
      lessons: "पाठ",
      practice: "अभ्यास बोर्ड",
      code: "कोड उदाहरण",
      hint: "संकेत",
      reset: "रीसेट",
      next: "अगला पाठ",
      prev: "पिछला",
      lessonsList: [
        {
          name: "प्यादा की चाल",
          desc: "प्यादा आगे 1 घर चलता है। पहली चाल में 2 घर चल सकता है।",
          fen: "8/8/8/8/8/8/4P3/8 w - - 0 1",
          hint: "e2 से e4 चलने की कोशिश करें",
          code: `game.move({from: 'e2', to: 'e4'}); // प्यादा पहली बार 2 घर`
        },
        {
          name: "घोड़े की चाल",
          desc: "घोड़ा L आकार में चलता है: 2 घर + 1 घर मुड़कर।",
          fen: "8/8/8/8/8/8/8/4N3 w - - 0 1",
          hint: "घोड़ा कूद सकता है: e1 से f3 या g2",
          code: `game.move({from: 'e1', to: 'f3'}); // L आकार की चाल`
        },
        {
          name: "शह और मात",
          desc: "शह = राजा पर हमला। मात = शह से बचने का कोई रास्ता नहीं।",
          fen: "7k/8/8/8/8/R6K w - - 0 1",
          hint: "हाथी a8 पर = शह (जैसे a3 से a8)",
          code: `game.move({from: 'a3', to: 'a8'}); // शहमात या शह!`
        },
        {
          name: "कैसलिंग",
          desc: "राजा + हाथी की खास चाल। राजा 2 घर, हाथी कूदकर।",
          fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
          hint: "राजा e1 से g1 = छोटी कैसलिंग",
          code: `game.move({from: 'e1', to: 'g1'}); // O-O कैसलिंग`
        }
      ]
    }
  };

  const L = t[lang];
  const lesson = L.lessonsList[currentLesson];

  useEffect(() => {
    try {
      setGame(new Chess(lesson.fen));
    } catch (e) {
      // Fallback
      setGame(new Chess());
    }
    setShowHint(false);
    setUserMove('');
  }, [currentLesson, lang]);

  const handleMove = (from: string, to: string, promotion?: string) => {
    try {
      const move = game.move({
        from,
        to,
        promotion: promotion || 'q'
      });
      if (move) {
        setGame(new Chess(game.fen()));
        setUserMove(`${from} to ${to}`);
      }
    } catch (e) {
      console.warn("Invalid move", e);
    }
  };

  const resetBoard = () => {
    try {
      setGame(new Chess(lesson.fen));
    } catch (e) {
      setGame(new Chess());
    }
    setUserMove('');
    setShowHint(false);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl shadow-sm gap-4">
        <div>
          <h1 className="text-sm font-black uppercase text-neutral-900 dark:text-white tracking-wider flex items-center gap-2">
            <GraduationCap className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
            <span>{L.title}</span>
          </h1>
          <p className="text-4xs font-mono text-neutral-500 mt-0.5">{L.subtitle}</p>
        </div>
        
        {/* Language Selection Toggle */}
        <div className="flex items-center gap-2 bg-neutral-105 dark:bg-neutral-950 p-1 rounded-2xl border border-neutral-200/50 dark:border-neutral-850">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 text-5xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              lang === 'en'
                ? 'bg-amber-500 text-neutral-950 shadow-sm font-black'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1.5 text-5xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              lang === 'hi'
                ? 'bg-amber-500 text-neutral-950 shadow-sm font-black'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Practice Board (span 7 or 8) */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/65 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-805 pb-3">
            <h3 className="font-extrabold text-xs text-neutral-955 dark:text-neutral-50 uppercase flex items-center gap-2">
              <span className="text-amber-500">♟</span>
              <span>{L.practice}: {lesson.name}</span>
            </h3>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowHint(prev => !prev)}
                className={`p-1.5 px-3 rounded-xl text-4xs font-bold uppercase tracking-wider cursor-pointer border flex items-center gap-1 transition-all ${
                  showHint 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                    : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-400 border-neutral-200/40 dark:border-neutral-800'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{L.hint}</span>
              </button>
              
              <button
                onClick={resetBoard}
                className="p-1.5 px-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-850 rounded-xl text-4xs font-bold uppercase tracking-wider cursor-pointer border border-neutral-200/40 dark:border-neutral-800 flex items-center gap-1 transition-all text-neutral-608 dark:text-neutral-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{L.reset}</span>
              </button>
            </div>
          </div>

          {/* Centered Premium Custom Chessboard */}
          <div className="flex justify-center max-w-[420px] mx-auto w-full py-4 relative">
            <div className="w-full bg-neutral-100 dark:bg-neutral-950 p-2.5 rounded-2xl border border-neutral-200/30 dark:border-neutral-850/80 shadow-md">
              <ChessBoard
                chess={game}
                boardTheme={boardTheme}
                isFlipped={false}
                onMove={handleMove}
                showLegalMoves={true}
                playableColor="both"
                soundEnabled={soundEnabled}
                gameStatus="active"
              />
            </div>
          </div>

          {/* Hint Overlay / Box */}
          {showHint && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-neutral-800 dark:text-amber-400 text-3xs font-medium rounded-2xl flex items-start gap-2.5 leading-relaxed select-text">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest text-4xs block mb-1">Interactive Lesson Hint</span>
                <span>{lesson.hint}</span>
              </div>
            </div>
          )}

          {/* Last Move Tracker */}
          {userMove && (
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-850 text-neutral-700 dark:text-neutral-305 text-3xs rounded-xl flex items-center gap-2 select-text font-mono">
              <span className="text-emerald-500 font-bold">✔</span>
              <span>Last registered learning move: <span className="text-neutral-900 dark:text-white font-bold">{userMove}</span></span>
            </div>
          )}
        </div>

        {/* Right column: Lessons List & Code Example Code block (span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Lessons List panel */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/65 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-3.5">
            <h3 className="font-extrabold text-xs text-neutral-955 dark:text-neutral-50 uppercase flex items-center gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <GraduationCap className="w-4 h-4 text-amber-500" />
              <span>📚 {L.lessons} ({L.lessonsList.length})</span>
            </h3>
            
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {L.lessonsList.map((les, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentLesson(idx)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    currentLesson === idx
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/25 shadow-2xs'
                      : 'bg-neutral-50/50 hover:bg-neutral-105 dark:bg-neutral-950/20 dark:hover:bg-neutral-950/55 text-neutral-800 dark:text-neutral-300 border-neutral-100 dark:border-neutral-850'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-4xs shrink-0 mt-0.5 shadow-sm ${
                    currentLesson === idx ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-3xs font-black uppercase tracking-wide leading-tight">{les.name}</h4>
                    <p className="text-[10px] text-neutral-450 mt-1 line-clamp-2 leading-relaxed font-medium">{les.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Code panel with syntax mock highlight styling */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/65 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-3.5">
            <h3 className="font-extrabold text-xs text-neutral-955 dark:text-neutral-50 uppercase flex items-center gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-amber-500 font-bold">&lt;/&gt;</span>
              <span>{L.code}</span>
            </h3>
            
            <div className="text-[10px] text-neutral-500 font-medium leading-relaxed leading-relaxed select-text">
              {lesson.desc}
            </div>
            
            {/* Syntax Highlighted Custom View Block */}
            <div className="bg-neutral-950 text-neutral-300 font-mono text-[10px] p-4.5 rounded-2xl border border-neutral-850 overflow-x-auto whitespace-pre leading-relaxed shadow-inner shadow-black/40 select-text">
              <span className="text-neutral-500 italic font-medium">// {lesson.name}</span>{"\n"}
              <span className="text-blue-400">const</span> game = <span className="text-blue-400">new</span> <span className="text-emerald-400">Chess</span>();{"\n"}
              {lesson.code.split(';').map((part, index, arr) => {
                if (index === arr.length - 1) return null;
                const matches = part.match(/\/\/.*$/);
                const comment = matches ? matches[0] : '';
                const codeWithoutComment = part.replace(/\/\/.*$/, '');
                return (
                  <span key={index}>
                    <span className="text-amber-400">{codeWithoutComment}</span>;
                    {comment && <span className="text-neutral-500 italic"> {comment}</span>}
                    {"\n"}
                  </span>
                );
              })}
            </div>

            {/* Pagination / Navigation Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                disabled={currentLesson === 0}
                onClick={() => setCurrentLesson(p => p - 1)}
                className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 font-extrabold text-2xs uppercase tracking-wider rounded-xl cursor-pointer transition-all border border-neutral-200/40 dark:border-neutral-800 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>←</span>
                <span>{L.prev}</span>
              </button>
              
              <button
                disabled={currentLesson === L.lessonsList.length - 1}
                onClick={() => setCurrentLesson(p => p + 1)}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-2xs uppercase tracking-widest rounded-xl cursor-pointer transition-all shadow border border-amber-500/25 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>{L.next}</span>
                <span>→</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
