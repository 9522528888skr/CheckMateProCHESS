import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Crown, 
  ChevronRight, 
  Plus, 
  User, 
  Users, 
  CheckCircle, 
  VolumeX, 
  Flame, 
  Award, 
  Check, 
  UserCheck,
  ShieldCheck,
  Target
} from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  level: string;
  institution: string;
  rating: number;
}

interface BracketMatch {
  id: number;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  status: string;
  winner_id: string | null;
  winner_name: string | null;
  stage: string;
  tournament_id: string;
}

interface TournamentPageProps {
  currentUser: any;
}

const ADMIN_ID = 7; 

export default function TournamentPage({ currentUser }: TournamentPageProps) {
  const [stage, setStage] = useState('class_vs_class');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [brackets, setBrackets] = useState<BracketMatch[]>([]);
  const [allLevels, setAllLevels] = useState<string[]>([]); // class_vs_school ke liye
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const stageOrder = [
    { key: 'class_vs_class', name: 'Class vs Class', levels: ['class'] },
    { key: 'class_vs_school', name: 'Class vs School', levels: ['class', 'school'] },
    { key: 'school_vs_college', name: 'School vs College', levels: ['school', 'college'] },
    { key: 'college_vs_area', name: 'College vs Area', levels: ['college', 'area'] }
  ];

  // 1. Candidates load karo - Current stage ke hisab se
  useEffect(() => {
    const currentStageData = stageOrder.find(s => s.key === stage);
    if (!currentStageData) return;
    
    setAllLevels(currentStageData.levels);
    setIsLoading(true);

    // Saare required levels ke players fetch karo
    Promise.all(
      currentStageData.levels.map(level =>
        fetch(`/api/admin/candidates?level=${level}`, {
          headers: { 
            'user_id': String(ADMIN_ID),
            'user-role': currentUser?.role || 'academy'
          }
        }).then(r => r.json())
      )
    ).then(results => {
      setCandidates(results.flat()); // class + school dono merge ho jayenge
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setErrorMsg('Failed to load candidate list.');
      setIsLoading(false);
    });
  }, [stage]);

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const createTournament = async () => {
    if (selectedPlayers.length < 2) {
      alert('Kam se kam 2 players chuno');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const currentStageObj = stageOrder.find(s => s.key === stage);
      const res = await fetch('/api/admin/create-tournament', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'user_id': String(ADMIN_ID),
          'user-role': currentUser?.role || 'academy'
        },
        body: JSON.stringify({
          name: `${currentStageObj ? currentStageObj.name : 'Unknown'} Championship`,
          stage: stage,
          player_ids: selectedPlayers
        })
      });
      const data = await res.json();
      if(data.success) {
        setTournamentId(data.tournament_id);
        fetchBrackets(data.tournament_id);
        setSelectedPlayers([]);
        setSuccessMsg(`Successfully created tournament bracket for ${currentStageObj?.name}!`);
      } else {
        alert(data.error || 'Tournament creation failed');
        setErrorMsg(data.error);
      }
    } catch(err) {
      console.error(err);
      alert('Server error constructing bracket match pairs.');
    }
  };

  const fetchBrackets = async (id: number) => {
    try {
      const res = await fetch(`/api/tournament/${id}/brackets`);
      const data = await res.json();
      setBrackets(data || []);
    } catch(e) {
      console.error(e);
    }
  };

  // NEW: Winner Set Karo
  const setWinner = async (matchId: number, winnerId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/match/${matchId}/set-winner`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'user_id': String(ADMIN_ID),
          'user-role': currentUser?.role || 'academy'
        },
        body: JSON.stringify({ winner_id: winnerId })
      });
      const data = await res.json();
      if(data.success) {
        if (tournamentId) fetchBrackets(tournamentId); // Refresh brackets
        setSuccessMsg("Winner designated on administrative match sheets successfully!");
      } else {
        alert(data.error);
        setErrorMsg(data.error);
      }
    } catch(err) {
      console.error(err);
      alert('Server error updating bracket winner.');
    }
  };

  const nextStage = async () => {
    const currentIndex = stageOrder.findIndex(s => s.key === stage);
    if(currentIndex === stageOrder.length - 1) {
      alert('Tournament Complete! All stages fought through.');
      setSuccessMsg('Tournament Completed successfully!');
      return;
    }
    // Check karo saare matches complete hue ki nahi
    const pending = brackets.filter(b => !b.winner_name).length;
    if(pending > 0) {
      alert(`${pending} matches abhi pending hain. Pehle winner set karo.`);
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/tournament/${tournamentId}/next-stage`, {
        method: 'POST',
        headers: { 
          'user_id': String(ADMIN_ID),
          'user-role': currentUser?.role || 'academy'
        }
      });
      const data = await res.json();
      if(data.success) {
        setStage(data.new_stage);
        if (tournamentId) {
          fetchBrackets(tournamentId);
        }
        setSelectedPlayers([]);
        setSuccessMsg(`Transitioned successfully to next stage: ${stageOrder[currentIndex + 1].name}!`);
      } else {
        alert(data.error);
        setErrorMsg(data.error);
      }
    } catch(err) {
      console.error(err);
      alert('Server error generating next stage brackets.');
    }
  };

  const currentStageName = stageOrder.find(s => s.key === stage)?.name || 'Stage';

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-900 shadow-sm animate-in fade-in duration-300">
      
      {/* TITLE CONTAINER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-5 border-b border-neutral-200/60 dark:border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
            <h1 className="text-sm font-black tracking-tight text-neutral-950 dark:text-white uppercase font-sans">
              🏆 TOURNAMENT CONTROL PANEL
            </h1>
          </div>
          <p className="text-3xs font-mono text-neutral-500 dark:text-neutral-400 mt-1 uppercase">
            Privileged Admin / Academy Division Controls | Current Tier: <span className="text-amber-500 font-bold">{currentStageName}</span>
          </p>
        </div>

        {/* Stage Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-4xs font-mono uppercase text-neutral-400">Jump Stage:</label>
          <select 
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setTournamentId(null);
              setBrackets([]);
              setSelectedPlayers([]);
              setSuccessMsg(null);
            }}
            className="text-[11px] font-sans font-extrabold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 px-3 outline-none cursor-pointer focus:border-amber-500 text-neutral-850 dark:text-neutral-200"
          >
            {stageOrder.map((s) => (
              <option key={s.key} value={s.key}>⚔️ {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-3xs rounded-xl flex items-center gap-2 font-mono">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-3xs rounded-xl flex items-center gap-2 font-mono">
          <span>❌</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CANDIDATE SELECTION PANEL (cols-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200/50 dark:border-neutral-805/80">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="text-3xs font-black uppercase text-neutral-80s dark:text-neutral-200 tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              1. Candidates for {currentStageName}
            </h3>
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-400">
              Levels: {allLevels.join(', ')}
            </span>
          </div>

          <p className="text-[10px] text-neutral-450 dark:text-neutral-400 mb-4 bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-xl font-mono leading-relaxed">
            Choose standard players below to participate in this arena. Pairings are constructed side-by-side automatically.
          </p>

          {isLoading ? (
            <div className="py-12 text-center text-xs font-mono text-neutral-400">
              ⚡ Loading candidates database stream...
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {candidates.map(c => {
                const isSelected = selectedPlayers.includes(c.id);
                return (
                  <div 
                    key={c.id} 
                    onClick={() => togglePlayer(c.id)} 
                    className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-500 dark:border-amber-400/50 text-neutral-950 dark:text-amber-400 shadow-sm' 
                        : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950/60 dark:hover:bg-neutral-850 border-neutral-200/60 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-neutral-400" />
                        <span className="text-xs font-bold font-sans">{c.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 items-center font-mono text-5xs text-neutral-400 dark:text-neutral-405">
                        <span className="uppercase text-amber-600 dark:text-amber-500 font-bold bg-amber-500/5 px-1.5 rounded-md">{c.level}</span>
                        <span>•</span>
                        <span>{c.institution}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-mono bg-neutral-150/70 dark:bg-neutral-800 rounded-md p-1 px-1.5 font-bold">
                        {c.rating} ELO
                      </div>
                    </div>
                  </div>
                );
              })}

              {candidates.length === 0 && (
                <div className="py-8 text-center text-4xs font-mono text-neutral-400">
                  No competitive candidates matches current filter criteria
                </div>
              )}
            </div>
          )}

          <div className="mt-5">
            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mb-3">
              <span>Selected Candidates:</span>
              <span className="font-extrabold text-neutral-850 dark:text-neutral-100">{selectedPlayers.length} / {candidates.length}</span>
            </div>

            <button 
              onClick={createTournament} 
              disabled={!!tournamentId || selectedPlayers.length < 2}
              className={`w-full py-3 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                tournamentId 
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-750 cursor-not-allowed' 
                  : selectedPlayers.length < 2
                    ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-800 cursor-not-allowed'
                    : 'bg-amber-500 dark:bg-amber-600 hover:bg-amber-550 dark:hover:bg-amber-500 text-neutral-950 hover:shadow-md border-amber-600 dark:border-amber-400/40'
              }`}
            >
              {tournamentId ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  TOURNAMENT STARTED
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  CREATE {currentStageName.toUpperCase()} BRACKET
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: GENERATED MATCH BRACKETS (cols-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200/50 dark:border-neutral-850">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-105 dark:border-neutral-800">
            <h3 className="text-3xs font-black uppercase text-neutral-80s dark:text-neutral-200 tracking-wider flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              2. Dynamic Match Brackets
            </h3>
            <span className="text-[10px] font-mono text-neutral-400">
              Active Session: {tournamentId ? `#${tournamentId}` : 'None'}
            </span>
          </div>

          {brackets.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center p-4">
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-950 rounded-full flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-neutral-400" />
              </div>
              <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">No active tournament bracket</h4>
              <p className="text-[10px] text-neutral-400 max-w-xs mt-1 leading-normal font-mono">
                Select candidates in Section 1 and initialize the bracket engine to visualize pairwise matches here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {brackets.map(m => {
                const isP1Winner = m.winner_id === m.player1_id;
                const isP2Winner = m.winner_id === m.player2_id;
                
                return (
                  <div key={m.id} className="p-4 bg-neutral-50 dark:bg-neutral-950/45 rounded-xl border border-neutral-200/50 dark:border-neutral-800">
                    <div className="flex items-center justify-between gap-2.5 mb-3.5 font-mono text-5xs text-neutral-400 uppercase tracking-widest pb-1.5 border-b border-neutral-100/50 dark:border-neutral-900">
                      <span>Match Card #{m.id}</span>
                      <span className="bg-amber-500/10 px-2 rounded-full font-sans lowercase text-[9.5px] tracking-normal font-extrabold">{m.stage}</span>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
                      
                      {/* Left side: players */}
                      <div className="flex items-center gap-3 py-1 flex-1">
                        <div className="grow space-y-2">
                          {/* Player 1 */}
                          <div className={`flex items-center justify-between text-xs gap-2 ${isP1Winner ? 'font-black text-emerald-600 dark:text-emerald-400' : 'text-neutral-800 dark:text-neutral-350'}`}>
                            <span className="flex items-center gap-1.5 truncate">
                              {isP1Winner && <UserCheck className="w-3.5 h-3.5" />}
                              {m.player1_name}
                            </span>
                          </div>

                          <div className="text-[9px] font-mono text-neutral-400 text-center uppercase tracking-wide border-y border-neutral-200/20 dark:border-neutral-800 py-0.5">
                            VS
                          </div>

                          {/* Player 2 */}
                          <div className={`flex items-center justify-between text-xs gap-2 ${isP2Winner ? 'font-black text-emerald-600 dark:text-emerald-400' : 'text-neutral-800 dark:text-neutral-350'}`}>
                            <span className="flex items-center gap-1.5 truncate">
                              {isP2Winner && <UserCheck className="w-3.5 h-3.5" />}
                              {m.player2_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Winner Setter Action Buttons */}
                      <div className="flex md:flex-col justify-end gap-1.5 md:w-44 border-t md:border-t-0 md:border-l border-neutral-200/45 dark:border-neutral-800 pt-2.5 md:pt-0 md:pl-3.5">
                        {m.winner_name ? (
                          <div className="w-full flex md:flex-col items-center justify-center p-2 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold font-mono">
                            <span className="text-[9px] text-neutral-400 uppercase block mb-0.5">✓ WINNER SET</span>
                            <span className="truncate max-w-[140px] text-center">{m.winner_name}</span>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => setWinner(m.id, m.player1_id)} 
                              className="grow md:w-full py-1.5 px-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-805 text-neutral-700 dark:text-neutral-300 border border-neutral-250 dark:border-neutral-750 font-bold uppercase text-[9px] rounded-lg cursor-pointer transition-all truncate"
                            >
                              Set P1 Winner
                            </button>
                            <button 
                              onClick={() => setWinner(m.id, m.player2_id)} 
                              className="grow md:w-full py-1.5 px-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-805 text-neutral-700 dark:text-neutral-300 border border-neutral-250 dark:border-neutral-750 font-bold uppercase text-[9px] rounded-lg cursor-pointer transition-all truncate"
                            >
                              Set P2 Winner
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tournamentId && brackets.length > 0 && (
            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button 
                onClick={nextStage} 
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-550 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl cursor-pointer transition-all border border-emerald-700 hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <span>START NEXT STAGE</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-mono lowercase text-[9.5px] opacity-75">
                  ({stageOrder[stageOrder.findIndex(s => s.key === stage) + 1]?.name || 'complete'})
                </span>
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
