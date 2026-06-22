import { useState, useEffect } from 'react';
import { Share2, Link, Radio, CheckCircle } from 'lucide-react';

interface LiveMatch {
  match_id: string;
  player1: string;
  player2: string;
  status: string;
  academyName?: string;
}

interface AcademyLiveCastsProps {
  academyName?: string;
}

export function AcademyLiveCasts({ academyName }: AcademyLiveCastsProps) {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLive = () => {
      // Dynamic host resolution: use localhost:3000 on local machines, relative paths on cloud containers
      const apiOrigin = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
      fetch(`${apiOrigin}/api/active-matches`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Strictly show only currently live matches and remove any ended ones
            const onlyLive = data.filter((m: any) => m.status === 'live');
            setLiveMatches(onlyLive);
          }
        })
        .catch(err => {
          console.warn("Failed fetching live matches:", err);
        });
    };

    fetchLive();
    const interval = setInterval(fetchLive, 3000);
    return () => clearInterval(interval);
  }, []);

  const copyLink = (match_id: string) => {
    const link = `${window.location.origin}/live/${match_id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(match_id);
      setTimeout(() => setCopiedId(null), 2500);
      alert('Link copied: ' + link);
    }).catch(err => {
      console.error('Failed to copy!', err);
    });
  };

  const shareWithParents = (match: LiveMatch) => {
    const link = `${window.location.origin}/live/${match.match_id}`;
    const text = `Watch live: ${match.player1} vs ${match.player2}\n${link}`;
    if (navigator.share) {
      navigator.share({ title: 'CheckMate Live', text: text, url: link })
        .catch(err => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Link copied for parents');
      });
    }
  };

  return (
    <div className="lg:col-span-7 mt-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-md space-y-4">
      <h3 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider flex justify-between items-center pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-5xs font-mono font-bold tracking-wider rounded uppercase animate-pulse">
            <Radio className="w-2.5 h-2.5" />
            LIVE
          </span>
          ACADEMY LIVE CASTS ({liveMatches.length})
        </span>
        <span className="text-4xs font-mono bg-neutral-150 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-450 uppercase">
          Broadcast Workspace
        </span>
      </h3>

      {liveMatches.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/20">
          <p className="text-3xs text-neutral-455 italic font-mono">No active streams right now</p>
        </div>
      ) : (
        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
          {liveMatches.map(match => (
            <div
              key={match.match_id}
              className="p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-850 hover:border-amber-500/20 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            >
              <div className="text-left">
                <p className="text-xs font-black text-neutral-900 dark:text-white font-sans">
                  {match.player1} <span className="text-neutral-450 font-bold text-3xs mx-1">vs</span> {match.player2}
                </p>
                <div className="text-[10px] font-mono text-neutral-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Academy: {academyName || 'Sumeet Rasela'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 font-sans">
                <button
                  type="button"
                  onClick={() => copyLink(match.match_id)}
                  className="grow sm:grow-0 bg-neutral-950 hover:bg-neutral-800 border border-neutral-955 dark:bg-neutral-850 dark:hover:bg-neutral-750 dark:border-neutral-750 text-white font-black text-3xs uppercase tracking-wider py-2 px-3.5 rounded-xl transition-all cursor-pointer text-center inline-flex items-center justify-center gap-1.5"
                >
                  {copiedId === match.match_id ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      COPIED!
                    </>
                  ) : (
                    <>
                      <Link className="w-3.5 h-3.5" />
                      COPY LINK
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => shareWithParents(match)}
                  className="grow sm:grow-0 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-3xs uppercase tracking-widest py-2 px-3.5 rounded-xl transition-all text-center shadow inline-flex items-center justify-center gap-1.5 leading-none"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  SHARE WITH PARENTS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
