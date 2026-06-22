import { useState } from 'react';
import { Sparkles, Brain, HelpCircle, Loader2, MessageSquareText, ShieldAlert } from 'lucide-react';

interface CoachPanelProps {
  currentFen: string;
  moveHistory: string[];
  mode: string;
  difficulty: string;
  playerColor: 'w' | 'b';
}

export default function CoachPanel({ currentFen, moveHistory, mode, difficulty, playerColor }: CoachPanelProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('Positioning the pieces...');

  const loadingSteps = [
    'Reading pawn structure...',
    'Analyzing direct threats and pins...',
    'Consulting Grandmaster matches database...',
    'Drafting optimal candidate moves...',
    'Summarizing strategic plans...'
  ];

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    setError(null);
    
    // Cycle loading texts for interactive aesthetics
    let stepIdx = 0;
    setLoadingText(loadingSteps[0]);
    const timer = setInterval(() => {
      stepIdx = (stepIdx + 1) % loadingSteps.length;
      setLoadingText(loadingSteps[stepIdx]);
    }, 1500);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: currentFen,
          moveHistory,
          mode,
          difficulty,
          playerColor
        })
      });

      if (!response.ok) {
        throw new Error('API server returned a failed status.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis || 'Analysis is complete, but no text was returned.');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to contact the Grandmaster Coach. Please verify server integrity.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  // Safe, fast markdown parser for clean custom JSX formatting without extra dependencies
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Unsized titles or large subheaders
      if (line.startsWith('###')) {
        const clean = line.replace(/^###\s*/, '');
        return (
          <h4 key={idx} className="text-sm font-bold text-neutral-900 dark:text-amber-400 mt-4 mb-2 flex items-center gap-1.5 uppercase font-mono tracking-wider border-b border-neutral-100 dark:border-neutral-800 pb-1">
            {clean}
          </h4>
        );
      }
      if (line.startsWith('####')) {
        const clean = line.replace(/^####\s*/, '');
        return (
          <h5 key={idx} className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-3 mb-1">
            {clean}
          </h5>
        );
      }
      
      // Standard bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const clean = line.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-neutral-600 dark:text-neutral-300 text-xs py-1 leading-relaxed">
            {parseInlineStyles(clean)}
          </li>
        );
      }

      // Ordered lists
      const numberListMatch = line.match(/^(\d+)\.\s*(.*)/);
      if (numberListMatch) {
        return (
          <div key={idx} className="flex gap-2 text-xs py-1.5 leading-relaxed pl-1 text-neutral-600 dark:text-neutral-300">
            <span className="font-mono text-amber-600 dark:text-amber-500 font-bold">{numberListMatch[1]}.</span>
            <div className="flex-1">{parseInlineStyles(numberListMatch[2])}</div>
          </div>
        );
      }

      // Default paragraph
      if (line.trim() === '') return <div key={idx} className="h-2" />;
      return (
        <p key={idx} className="text-xs text-neutral-600 dark:text-neutral-300 py-1 leading-relaxed">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  // Helper to match bold **strings** with neat span elements
  const parseInlineStyles = (txt: string) => {
    const parts = txt.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // High contrast bold highlights
        return <strong key={index} className="font-bold text-neutral-900 dark:text-white bg-amber-500/10 px-1 py-0.5 rounded-sm">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div id="ai-coach-panel" className="bg-gradient-to-br from-neutral-50 to-amber-50/20 dark:from-neutral-900 dark:to-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col h-full">
      {/* Absolute top corner glow decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 dark:bg-amber-500/5 blur-3xl pointer-events-none" />
      
      {/* Coach Header info */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-md shadow-amber-500/25 select-none shrink-0 border border-amber-300 dark:border-amber-600">
          <Brain className="w-5.5 h-5.5 text-neutral-950 font-bold" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
            Mikhail AI
            <span className="text-2xs px-1.5 py-0.5 bg-neutral-950 text-amber-400 dark:bg-amber-500/15 dark:text-amber-400 rounded-full font-mono font-bold uppercase tracking-wider">
              PRO COACH
            </span>
          </h3>
          <p className="text-2xs text-neutral-500">
            Grandmaster insight at your fingertips.
          </p>
        </div>
      </div>

      {/* Main Sandbox for results */}
      <div className="flex-1 overflow-y-auto mt-4 bg-white/70 dark:bg-neutral-950/60 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-800/60 p-4 rounded-xl min-h-[160px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <div className="space-y-1">
              <p className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300">
                {loadingText}
              </p>
              <p className="text-2xs text-neutral-400 animate-pulse italic">
                Awaiting grandmaster response...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-3 text-center text-red-500 gap-2">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <p className="text-xs font-semibold">{error}</p>
            <button
              onClick={handleAnalyze}
              className="text-2xs underline hover:text-red-400 mt-1"
            >
              Retry Connection
            </button>
          </div>
        ) : analysis ? (
          <div className="scrollbar-thin pb-2 pr-1 select-text">
            {renderMarkdown(analysis)}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-neutral-400 font-medium">
            <MessageSquareText className="w-7 h-7 text-neutral-300 mb-2" />
            <p className="text-xs">
              Need strategic help? Click analyze to invoke the Grandmaster Coach for tactical candidate moves.
            </p>
          </div>
        )}
      </div>

      {/* Button footer trigger */}
      <div className="mt-4">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-950 dark:bg-amber-500 hover:bg-neutral-800 dark:hover:bg-amber-600 font-semibold text-xs text-amber-400 dark:text-neutral-950 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed group"
        >
          <Sparkles className="w-4 h-4 animate-pulse group-hover:scale-110 transition-transform" />
          <span>Ask Coach Mikhail</span>
        </button>
      </div>
    </div>
  );
}
