import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { motion } from 'motion/react';
import { 
  RotateCcw, 
  Flag, 
  Swords, 
  Bot, 
  Award, 
  Settings2, 
  Volume2, 
  VolumeX, 
  Timer, 
  Lightbulb, 
  User, 
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  LogOut,
  TrendingUp,
  BarChart3,
  History,
  Percent,
  Play,
  Share2,
  Copy,
  Check,
  Facebook,
  Twitter,
  Calendar,
  Trophy,
  Globe,
  Crown,
  GraduationCap,
  Trash2,
  Plus
} from 'lucide-react';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

import { 
  GameMode, 
  BoardTheme, 
  AIDifficulty, 
  MoveRecord, 
  GameSettings 
} from '../types';
import { getBestMove } from '../utils/engine';
import { CHESS_PUZZLES } from '../utils/puzzles';
import { io } from 'socket.io-client';

// Connect to socket.io server
const socket = io();

// Custom Components
import ChessBoard from './ChessBoard';
import MoveLog from './MoveLog';
import CoachPanel from './CoachPanel';
import ChessLearningKit from './ChessLearningKit';
import LiveChat from './LiveChat';
import { 
  AppUser, 
  Match, 
  subscribeToAllLiveGames, 
  LiveGameDoc, 
  subscribeToAllUsers,
  joinMatchmakerQueue,
  updateMatchReadyState,
  updateMatchRealtimeGame,
  subscribeToRealtimeMatch,
  getUserPuzzleProgress,
  fetchNextPuzzle,
  saveSolvedPuzzle,
  resetUserPuzzleProgress,
  updateMatchElo,
  updatePuzzleRating,
  updatePuzzleElo,
  updateQuizElo,
  subscribeToLiveGame,
  incrementSpectators,
  decrementSpectators
} from '../lib/firebase';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl text-4xs font-mono space-y-1 text-white shadow-xl">
        <p className="font-bold text-amber-400">{data.name}</p>
        <p>Rating: <span className="font-bold text-white">{payload[0].value} ELO</span></p>
        <p>vs: <span className="text-neutral-300">{data.opponent}</span></p>
        <p>Result: <span className={data.result === 'WIN' ? 'text-emerald-500' : data.result === 'LOSS' ? 'text-red-500' : 'text-neutral-400'}>{data.result} ({data.change})</span></p>
      </div>
    );
  }
  return null;
};

const getDifficultyLevelIndex = (diff: AIDifficulty): number => {
  switch (diff) {
    case 'novice': return 1;
    case 'casual': return 2;
    case 'intermediate': return 3;
    case 'advanced': return 4;
    case 'master': return 5;
    case 'grandmaster': return 6;
    case 'world_champion': return 7;
    case 'super_grandmaster': return 8;
    case 'stockfish_god': return 9;
    default: return 3;
  }
};

interface ChessGameProps {
  currentUser: AppUser;
  onLogout: () => void;
  forcedTab?: 'play' | 'history' | 'lessons';
  onNavigateSection?: (section: 'arena' | 'history' | 'events' | 'leaderboard' | 'certificates') => void;
}

export default function ChessGame({ currentUser, onLogout, forcedTab, onNavigateSection }: ChessGameProps) {
  // Game state
  const [chess, setChess] = useState(() => new Chess());
  const [mode, setMode] = useState<GameMode>('local');
  const [movesList, setMovesList] = useState<MoveRecord[]>([]);
  const [activeMoveIdx, setActiveMoveIdx] = useState<number>(-1); // history tracking
  const [isFlipped, setIsFlipped] = useState(false);
  const [gameStatus, setGameStatus] = useState<'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout'>('active');
  const [winner, setWinner] = useState<'w' | 'b' | 'draw' | null>(null);

  // Settings state
  const [settings, setSettings] = useState<GameSettings>({
    initialTimeMinutes: 10, // Default rapid 10 minutes, 0 means Casual (no timer)
    engineDifficulty: 'intermediate',
    theme: 'emerald',
    showLegalMoves: true,
    soundEnabled: true,
    playerColor: 'w' // User is White against AI by default
  });

  // Track the resolved color for Play vs AI (handles random selection dynamically)
  const [resolvedPlayerColor, setResolvedPlayerColor] = useState<'w' | 'b'>('w');

  // Timers state
  const [whiteTime, setWhiteTime] = useState(10 * 60);
  const [blackTime, setBlackTime] = useState(10 * 60);

  // Highlights and Chess Captures state
  const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, { backgroundColor: string }>>({});
  const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);

  // AI Thinking state
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Puzzle State
  const [activePuzzleIdx, setActivePuzzleIdx] = useState(0);
  const [puzzleStep, setPuzzleStep] = useState(0);
  const [puzzleFeedback, setPuzzleFeedback] = useState<{ status: 'idle' | 'correct' | 'incorrect' | 'completed'; text: string }>({
    status: 'idle',
    text: ''
  });
  const [showHint, setShowHint] = useState(false);
  const [puzzleTime, setPuzzleTime] = useState(0);
  const [puzzleAttempts, setPuzzleAttempts] = useState(0);
  const [puzzleHintsCount, setPuzzleHintsCount] = useState(0);
  const [puzzleSolvedScore, setPuzzleSolvedScore] = useState<{ ratingChange: number; newRating: number } | null>(null);

  // Online multiplayer matchmaking & Timer pausing state
  const [onlineMatchId, setOnlineMatchId] = useState<string | null>(null);
  const [onlineMatch, setOnlineMatch] = useState<any | null>(null);
  const [isOnlineFinding, setIsOnlineFinding] = useState(false);
  const [onlineMatchTimeCount, setOnlineMatchTimeCount] = useState(0);
  const [onlineReadyCountdown, setOnlineReadyCountdown] = useState(60);
  const [hasClickedReady, setHasClickedReady] = useState(false);

  // Tournament Modal & Candidate State
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [tournamentCandidates, setTournamentCandidates] = useState<any[]>([
    { id: 'c1', name: 'Aarav Sharma', type: 'class', affiliation: 'Class 12-A' },
    { id: 'c2', name: 'Ishaan Patel', type: 'class', affiliation: 'Class 12-B' },
    { id: 'c3', name: 'Rohan Gupta', type: 'class', affiliation: 'Class 10-A' },
    { id: 'c4', name: 'Priya Mehta', type: 'school', affiliation: 'Sunrise Public Secondary' },
    { id: 'c5', name: 'Kabir Singh', type: 'school', affiliation: 'Green Valley Senior Academy' },
    { id: 'c6', name: 'Aditi Roy', type: 'college', affiliation: 'National Science College' },
    { id: 'c7', name: 'Vikram Malhotra', type: 'class', affiliation: 'Class 10-C' },
    { id: 'c8', name: 'Siddharth Verma', type: 'class', affiliation: 'Class 12-C' },
    { id: 'c9', name: 'Ananya Mishra', type: 'school', affiliation: 'Baldwin High School' },
    { id: 'c10', name: 'Tanya Sen', type: 'college', affiliation: 'St. Xavier\'s College' }
  ]);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateType, setNewCandidateType] = useState<'class' | 'school' | 'college'>('class');
  const [newCandidateAffiliation, setNewCandidateAffiliation] = useState('');
  const [tournamentFeedback, setTournamentFeedback] = useState<string | null>(null);

  // Daily puzzle state & scoreboard leaderboard
  const [dailyScores, setDailyScores] = useState<any[]>([]);

  // Spectator / Live Watching states
  const [isSpectator, setIsSpectator] = useState(false);
  const [spectatingGameId, setSpectatingGameId] = useState<string | null>(null);
  const [spectatingGameData, setSpectatingGameData] = useState<LiveGameDoc | null>(null);

  const activePuzzle = CHESS_PUZZLES[activePuzzleIdx];
  const isReviewingHistory = activeMoveIdx !== movesList.length - 1;

  // Match history & Dashboard tab state
  const [activeTab, setActiveTab] = useState<'play' | 'history' | 'lessons'>('play');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchSaved, setMatchSaved] = useState(false);
  const [startTime, setStartTime] = useState<number>(() => Date.now());
  const [matchStarted, setMatchStarted] = useState<boolean>(false);
  const isMatchStarted = mode === 'online'
    ? (onlineMatch ? !!onlineMatch.gameStarted : false)
    : matchStarted;
  const setIsMatchStarted = setMatchStarted;
  const [showMatchEndModal, setShowMatchEndModal] = useState(false);
  const [pointsChangeOverlay, setPointsChangeOverlay] = useState<{ text: string; positive: boolean } | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [showQuitConfirmModal, setShowQuitConfirmModal] = useState(false);
  const [pendingQuitAction, setPendingQuitAction] = useState<(() => void) | null>(null);
  const [activeMatchAction, setActiveMatchAction] = useState<'none' | 'resign' | 'leave'>('none');

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  useEffect(() => {
    if (isMatchStarted) {
      setStartTime(Date.now());
    }
  }, [isMatchStarted]);

  // A helper to reconstruct game states (highlights & captures) from the move list
  const reconstructMoveVisuals = (historyMoves: any[]) => {
    const initialFen = (mode === 'puzzle' || mode === 'daily') && activePuzzle 
      ? activePuzzle.initialFen 
      : undefined;
    const temp = new Chess(initialFen);
    const wCaptured: string[] = [];
    const bCaptured: string[] = [];
    let lastMove: any = null;

    for (const m of historyMoves) {
      try {
        let moveResult;
        if (typeof m === 'string') {
          moveResult = temp.move(m);
        } else if (m.from && m.to) {
          moveResult = temp.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
        } else if (m.san) {
          moveResult = temp.move(m.san);
        }
        
        if (moveResult) {
          lastMove = moveResult;
          if (moveResult.captured) {
            if (moveResult.color === 'w') {
              // White captured a Black piece
              wCaptured.push(moveResult.captured);
            } else {
              // Black captured a White piece
              bCaptured.push(moveResult.captured);
            }
          }
        }
      } catch (err) {
        console.warn('Replay move failed:', err);
      }
    }

    setCapturedByWhite(wCaptured);
    setCapturedByBlack(bCaptured);

    if (lastMove) {
      setLastMoveSquares({
        [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
        [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
      });
    } else {
      setLastMoveSquares({});
    }
  };

  useEffect(() => {
    const visibleMoves = movesList.slice(0, activeMoveIdx + 1);
    reconstructMoveVisuals(visibleMoves);
  }, [movesList, activeMoveIdx, mode, activePuzzleIdx]);

  const [liveGameId, setLiveGameId] = useState<string | null>(null);

  // Player ranks calculation state & clipboard confirmation state
  const [players, setPlayers] = useState<AppUser[]>([]);
  const [copiedMatchText, setCopiedMatchText] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAllUsers((userList) => {
      const activePlayers = userList.filter(u => u.role === 'player');
      setPlayers(activePlayers);
    });
    return () => unsub();
  }, []);

  const initializeLiveBroadcast = async (currentChess: Chess, currentMode: GameMode, updatedSettings = settings) => {
    if (currentMode === 'puzzle') {
      setLiveGameId(null);
      return;
    }

    let whitePlayer = currentUser.fullName;
    let whiteElo = currentUser.eloRating || 1000;
    let blackPlayer = 'Opponent';
    let blackElo = 1000;

    if (currentMode === 'ai') {
      const activeColor = updatedSettings.playerColor === 'random'
        ? (Math.random() < 0.5 ? 'w' : 'b')
        : updatedSettings.playerColor;
        
      if (activeColor === 'b') {
        const diffIndex = getDifficultyLevelIndex(updatedSettings.engineDifficulty);
        whitePlayer = `Bot (Lvl ${diffIndex})`;
        whiteElo = 800 + diffIndex * 200;
        blackPlayer = currentUser.fullName;
        blackElo = currentUser.eloRating || 1000;
      } else {
        const diffIndex = getDifficultyLevelIndex(updatedSettings.engineDifficulty);
        whitePlayer = currentUser.fullName;
        whiteElo = currentUser.eloRating || 1000;
        blackPlayer = `Bot (Lvl ${diffIndex})`;
        blackElo = 800 + diffIndex * 200;
      }
    } else {
      whitePlayer = `${currentUser.fullName} (White)`;
      blackPlayer = 'Guest (Black)';
    }

    try {
      const { startMatch, createLiveGame } = await import('../lib/firebase');
      let gameId = '';
      try {
        const res = await startMatch(whitePlayer, blackPlayer);
        gameId = res.match_id;
      } catch (err) {
        console.warn("Backend startMatch failed, falling back to createLiveGame:", err);
      }

      if (!gameId) {
        gameId = await createLiveGame(
          whitePlayer,
          whiteElo,
          blackPlayer,
          blackElo,
          currentUser.academyName || 'Sumeet Rasela Academy'
        );
      }
      setLiveGameId(gameId);
      localStorage.setItem('current_match_id', gameId);
    } catch (e) {
      console.error("Failed to initialize live broadcast:", e);
      const fallbackId = 'live_' + Math.random().toString(36).substring(2, 11);
      setLiveGameId(fallbackId);
      localStorage.setItem('current_match_id', fallbackId);
    }
  };

  // Start live broadcast once match has started
  useEffect(() => {
    if (mode !== 'puzzle' && !liveGameId && isMatchStarted) {
      initializeLiveBroadcast(chess, mode);
    }
  }, [mode, isMatchStarted, liveGameId]);

  // Keep live game broadcast in sync with active moves and status
  useEffect(() => {
    if (!liveGameId || mode === 'puzzle') return;

    const syncLiveBroadcast = async () => {
      try {
        const { updateLiveGame } = await import('../lib/firebase');
        const fen = chess.fen();
        const moves = movesList.map(m => m.san);
        const turn = chess.turn();
        
        let status: 'active' | 'completed' = 'active';
        if (gameStatus !== 'active') {
          status = 'completed';
        }

        await updateLiveGame(
          liveGameId,
          fen,
          moves,
          turn,
          status,
          winner
        );

        // Synchronize live status but delegate API completion and state cleanup 
        // entirely to the synchronous Game Resolution Match Saver effect below.
      } catch (e) {
        console.warn("Failed to sync live broadcast step:", e);
      }
    };

    syncLiveBroadcast();
  }, [liveGameId, chess, movesList, gameStatus, winner, mode]);

  // Keep socket.io real-time stream updated with FEN and real-time clocks
  useEffect(() => {
    if (!liveGameId || mode === 'puzzle' || gameStatus !== 'active') return;

    const fen = chess.fen();
    socket.emit('move_made', {
      streamId: liveGameId,
      fen,
      clocks: { white: whiteTime, black: blackTime }
    });
  }, [liveGameId, chess, whiteTime, blackTime, gameStatus, mode]);

  const [availableLiveGames, setAvailableLiveGames] = useState<LiveGameDoc[]>([]);

  // Real-time watch list subscription
  useEffect(() => {
    const unsub = subscribeToAllLiveGames((list) => {
      // Filter out our own game to avoid duplication, and only show active streams
      const activeOnly = list.filter(g => g.status === 'active' && g.id !== liveGameId);
      setAvailableLiveGames(activeOnly);
    });
    return () => unsub();
  }, [liveGameId]);

  // Subscribe to the chosen Live Game being spectated
  useEffect(() => {
    if (!isSpectator || !spectatingGameId) {
      setSpectatingGameData(null);
      return;
    }

    // Increment spectator count
    incrementSpectators(spectatingGameId).catch(console.error);

    const unsubscribe = subscribeToLiveGame(spectatingGameId, (data) => {
      if (data) {
        setSpectatingGameData(data);
        try {
          const freshChess = new Chess(data.fen);
          setChess(freshChess);

          const movesArr = data.moves || [];
          const mapped: MoveRecord[] = movesArr.map((san, idx) => ({
            san,
            from: '',
            to: '',
            color: idx % 2 === 0 ? 'w' : 'b',
            piece: 'p',
            fen: ''
          }));
          setMovesList(mapped);
          setActiveMoveIdx(mapped.length - 1);
        } catch (e) {
          console.error("Failed to parse spectated FEN:", data.fen);
        }
      }
    });

    return () => {
      unsubscribe();
      decrementSpectators(spectatingGameId).catch(console.error);
    };
  }, [isSpectator, spectatingGameId]);

  // Load matches
  const loadMatches = () => {
    setIsLoadingMatches(true);
    import('../lib/firebase').then(({ fetchMatches }) => {
      fetchMatches(currentUser.uid).then((records) => {
        // Capped at last 50 games per specifications rules
        setMatches(records.slice(0, 50));
        setIsLoadingMatches(false);
      });
    });
  };

  useEffect(() => {
    loadMatches();
  }, [currentUser.uid]);

  // Listen to realtime online match updates
  useEffect(() => {
    if (!onlineMatchId || mode !== 'online') {
      setOnlineMatch(null);
      return;
    }

    const unsub = subscribeToRealtimeMatch(onlineMatchId, (matchData: any) => {
      if (matchData) {
        setOnlineMatch(matchData);
        setIsOnlineFinding(false);

        // If game started, let's sync local chessboard State with firebase state
        if (matchData.gameStarted) {
          if (!liveGameId) {
            setLiveGameId(onlineMatchId);
            localStorage.setItem('current_match_id', onlineMatchId);
          }
          // Sync timer countdowns
          if (matchData.whiteTime !== undefined) setWhiteTime(matchData.whiteTime);
          if (matchData.blackTime !== undefined) setBlackTime(matchData.blackTime);

          // Figure out player color
          const isPlayer1 = matchData.player1Id === currentUser?.uid;
          setResolvedPlayerColor(isPlayer1 ? 'w' : 'b');
          setIsFlipped(!isPlayer1);

          // If matchData has a newer position, load it
          if (matchData.fen && matchData.fen !== chess.fen()) {
            const nextChess = new Chess(matchData.fen);
            setChess(nextChess);
            
            // Map the moves
            const movesArr = matchData.moves || [];
            const mappedMoves: MoveRecord[] = movesArr.map((san: string, idx: number) => {
              return {
                san,
                from: '',
                to: '',
                color: idx % 2 === 0 ? 'w' : 'b',
                piece: 'p',
                fen: ''
              };
            });
            setMovesList(mappedMoves);
            setActiveMoveIdx(mappedMoves.length - 1);
          }

          // Sync game status
          if (matchData.status === 'finished') {
            if (matchData.reason === 'resigned' || matchData.reason === 'abandoned/left') {
              const isPlayer1 = matchData.player1Id === currentUser?.uid;
              const ourColor = isPlayer1 ? 'white' : 'black';
              const weAreWinner = matchData.winner === ourColor;
              if (weAreWinner) {
                // If we are the winner, do not mark matchSaved = true yet so our general useEffect can run to save our Win and update ELO!
                setMatchSaved(false);
              } else {
                setMatchSaved(true);
              }
              setGameStatus(matchData.reason === 'resigned' ? 'resigned' : 'timeout');
              setWinner(matchData.winner === 'white' ? 'w' : 'b');
            } else {
              if (matchData.winner === 'white') {
                setGameStatus('checkmate');
                setWinner('w');
              } else if (matchData.winner === 'black') {
                setGameStatus('checkmate');
                setWinner('b');
              } else if (matchData.winner === 'draw') {
                setGameStatus('draw');
                setWinner('draw');
              }
            }
          }
        }
      } else {
        setOnlineMatch(null);
      }
    });

    return () => unsub();
  }, [onlineMatchId, mode, currentUser?.uid]);

  // 60-seconds Lobby ready countdown timer
  useEffect(() => {
    if (mode !== 'online' || !onlineMatch || onlineMatch.gameStarted || gameStatus !== 'active') {
      return;
    }

    const interval = setInterval(() => {
      setOnlineReadyCountdown((prev) => {
        if (prev <= 1) {
          // Timeout! Cancel matchmaking and revert to local mode
          setOnlineMatchId(null);
          setOnlineMatch(null);
          setMode('local');
          clearInterval(interval);
          alert("Lobby timed out. Opponent did not join or ready up inside 60 seconds.");
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, onlineMatch, gameStatus]);

  // Reset matchSaved on new game
  useEffect(() => {
    if (gameStatus === 'active') {
      setMatchSaved(false);
      setStartTime(Date.now());
      setModalDismissed(false);
      setShowMatchEndModal(false);
      setPointsChangeOverlay(null);
    } else {
      setShowMatchEndModal(true);
    }
  }, [gameStatus, chess]);

  const generatePgnString = () => {
    let pgnText = `[Event "CheckMate Pro Casual Match"]\n`;
    pgnText += `[Site "CheckMate Pro Chess Arena"]\n`;
    pgnText += `[Date "${new Date().toLocaleDateString()}"]\n`;
    pgnText += `[White "${resolvedPlayerColor === 'w' ? currentUser.fullName : 'Mikhail Bot'}"]\n`;
    pgnText += `[Black "${resolvedPlayerColor === 'b' ? currentUser.fullName : 'Mikhail Bot'}"]\n`;
    pgnText += `[Result "${gameStatus === 'checkmate' ? (winner === 'w' ? '1-0' : '0-1') : (gameStatus === 'draw' || gameStatus === 'stalemate' ? '1/2-1/2' : '*') }"]\n\n`;

    let movesStr = '';
    for (let i = 0; i < movesList.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = movesList[i]?.san || '';
      const blackMove = movesList[i + 1] ? movesList[i + 1]?.san || '' : '';
      movesStr += `${moveNum}. ${whiteMove} ${blackMove} `;
    }
    
    pgnText += movesStr.trim();
    return pgnText;
  };

  const downloadPgnFile = () => {
    const pgn = generatePgnString();
    const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checkmate_match_${Date.now()}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Game Resolution Match Saver
  useEffect(() => {
    if (mode === 'puzzle') return;
    if (gameStatus === 'active') return;
    if (matchSaved) return;

    // We resolved a game and haven't saved this match yet!
    setMatchSaved(true);

    const endedMatchId = liveGameId || localStorage.getItem('current_match_id');
    if (endedMatchId) {
      // Only notify backend server for actual server-stored matches (starting with 'match_')
      if (endedMatchId.startsWith('match_')) {
        fetch(`/api/match/${endedMatchId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winner: winner || 'draw' })
        }).catch(err => {
          console.warn("Notice: Match end api notification ended:", err);
        });
      }

      if (socket) {
        socket.emit('end_stream', endedMatchId);
      }
      localStorage.removeItem('current_match_id');
      setLiveGameId(null);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const date = new Date().toISOString();

    // Determine the result from currentUser's perspective
    let result: 'win' | 'loss' | 'draw' = 'draw';
    
    if (gameStatus === 'checkmate') {
      result = winner === resolvedPlayerColor ? 'win' : 'loss';
    } else if (gameStatus === 'stalemate' || gameStatus === 'draw') {
      result = 'draw';
    } else if (gameStatus === 'resigned') {
      result = winner === resolvedPlayerColor ? 'win' : 'loss';
    } else if (gameStatus === 'timeout') {
      result = winner === resolvedPlayerColor ? 'win' : 'loss';
    }

    let pointsChange = 0;
    let oldElo = 1200;

    if (mode === 'ai') {
      oldElo = currentUser.botElo !== undefined ? currentUser.botElo : 1100;
      if (result === 'win') {
        pointsChange = 10;
      } else if (result === 'loss') {
        pointsChange = -8;
      }
    } else if (mode === 'local') {
      oldElo = currentUser.localElo !== undefined ? currentUser.localElo : 1050;
      if (result === 'win') {
        pointsChange = 15;
      } else if (result === 'loss') {
        pointsChange = -10;
      }
    } else {
      // ONLINE PVP or TOURNAMENT
      oldElo = currentUser.eloRating !== undefined ? currentUser.eloRating : 1200;
      if (result === 'win') {
        pointsChange = 25;
      } else if (result === 'loss') {
        pointsChange = -20;
      }
    }

    const newElo = Math.max(100, oldElo + pointsChange);
    const eloChange = newElo - oldElo; // actual rating points increment / decrement

    // Set floating feedback animation on screen
    setPointsChangeOverlay({
      text: `${eloChange >= 0 ? '+' : ''}${eloChange} ${mode === 'ai' ? 'Bot' : mode === 'local' ? 'Local' : 'PVP'} ELO`,
      positive: eloChange >= 0
    });

    // Opponent description
    let opponentName = "Mikhail Bot";
    let opponentId = "mikhail_bot";
    if (mode === 'ai') {
      opponentName = `Mikhail Bot (Lv. ${settings.engineDifficulty.toUpperCase()})`;
      opponentId = `mikhail_bot_${settings.engineDifficulty}`;
    } else if (mode === 'local') {
      opponentName = "Local Opponent";
      opponentId = "local_opponent";
    } else if (mode === 'online' && onlineMatch) {
      const isPlayer1 = onlineMatch.player1Id === currentUser?.uid;
      opponentName = isPlayer1 ? (onlineMatch.player2Name || 'Challenger') : (onlineMatch.player1Name || 'Challenger');
      opponentId = isPlayer1 ? (onlineMatch.player2Id || 'challenger_id') : (onlineMatch.player1Id || 'challenger_id');
    }

    let gameTypeDesc = mode === 'ai' ? 'VS Bot' : mode === 'local' ? 'Local Sandbox' : 'Online Match';
    if (settings.initialTimeMinutes > 0) {
      gameTypeDesc += ` (${settings.initialTimeMinutes}m Clock)`;
    } else {
      gameTypeDesc += " (Casual)";
    }

    import('../lib/firebase').then(({ saveMatchAndUpdateElo }) => {
      saveMatchAndUpdateElo(currentUser.uid, {
        playerId: currentUser.uid,
        opponent: opponentName,
        result,
        eloChange,
        oldElo,
        newElo,
        gameType: gameTypeDesc,
        date,
        duration,

        // Expanded Fields per criteria
        userId: currentUser.uid,
        opponentId,
        opponentName,
        userColor: resolvedPlayerColor,
        reason: gameStatus,
        eloBefore: oldElo,
        eloAfter: newElo,
        pointsChange: eloChange,
        moves: movesList.map(m => m.san),
        pgn: generatePgnString(),
        timestamp: date,
        academyId: currentUser.academyId || 'sumeet_rasela_parasia'
      }, mode as any).then(() => {
        loadMatches();
      }).catch((e) => {
        console.error("Match saving failed:", e);
      });
    });

  }, [gameStatus, winner, mode, resolvedPlayerColor, matchSaved, onlineMatch, currentUser]);

  // Active board is either starting, current, or historic
  const getDisplayFen = () => {
    if (activeMoveIdx === -1) {
      if (mode === 'puzzle') return activePuzzle.initialFen;
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    return movesList[activeMoveIdx].fen;
  };

  // Sync timers on settings change
  useEffect(() => {
    if (settings.initialTimeMinutes > 0) {
      setWhiteTime(settings.initialTimeMinutes * 60);
      setBlackTime(settings.initialTimeMinutes * 60);
    }
  }, [settings.initialTimeMinutes]);

  // Keep references to state values used in the continuous interval timer to prevent resets of the interval grid on every move
  const chessRef = useRef(chess);
  const gameStatusRef = useRef(gameStatus);
  const isReviewingHistoryRef = useRef(isReviewingHistory);
  const modeRef = useRef(mode);
  const isSpectatorRef = useRef(isSpectator);
  const isMatchStartedRef = useRef(isMatchStarted);
  const onlineMatchIdRef = useRef(onlineMatchId);
  const onlineMatchRef = useRef(onlineMatch);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    chessRef.current = chess;
    gameStatusRef.current = gameStatus;
    isReviewingHistoryRef.current = isReviewingHistory;
    modeRef.current = mode;
    isSpectatorRef.current = isSpectator;
    isMatchStartedRef.current = isMatchStarted;
    onlineMatchIdRef.current = onlineMatchId;
    onlineMatchRef.current = onlineMatch;
    currentUserRef.current = currentUser;
  }, [chess, gameStatus, isReviewingHistory, mode, isSpectator, isMatchStarted, onlineMatchId, onlineMatch, currentUser]);

  // Timers counter loop
  useEffect(() => {
    if (settings.initialTimeMinutes === 0) return;

    const interval = setInterval(() => {
      const currentStatus = gameStatusRef.current;
      const currentMode = modeRef.current;
      const isHistory = isReviewingHistoryRef.current;
      const spectating = isSpectatorRef.current;
      const started = isMatchStartedRef.current;

      if (currentStatus !== 'active' || isHistory || currentMode === 'puzzle' || spectating) return;
      if ((currentMode === 'ai' || currentMode === 'local') && !started) return;

      const currentChess = chessRef.current;
      const turn = currentChess.turn();

      const oMatchId = onlineMatchIdRef.current;
      const oMatch = onlineMatchRef.current;
      const user = currentUserRef.current;

      const isOnline = currentMode === 'online' && oMatchId && oMatch;
      const isMyTurn = isOnline && (
        (oMatch.player1Id === user?.uid && turn === 'w') ||
        (oMatch.player2Id === user?.uid && turn === 'b')
      );

      if (turn === 'w') {
        setWhiteTime((prev) => {
          const nextVal = prev <= 1 ? 0 : prev - 1;

          if (prev <= 1) {
            setGameStatus('timeout');
            setWinner('b');
            clearInterval(interval);
          }

          if (isOnline && isMyTurn) {
            updateMatchRealtimeGame(oMatchId, { whiteTime: nextVal }).catch(console.error);
          }

          return nextVal;
        });
      } else {
        setBlackTime((prev) => {
          const nextVal = prev <= 1 ? 0 : prev - 1;

          if (prev <= 1) {
            setGameStatus('timeout');
            setWinner('w');
            clearInterval(interval);
          }

          if (isOnline && isMyTurn) {
            updateMatchRealtimeGame(oMatchId, { blackTime: nextVal }).catch(console.error);
          }

          return nextVal;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.initialTimeMinutes]);

  // Auto-trigger AI move
  useEffect(() => {
    if (gameStatus !== 'active' || isReviewingHistory) return;
    if (mode !== 'ai') return;
    if (!isMatchStarted) return;

    const currentTurn = chess.turn();
    const aiColor = resolvedPlayerColor === 'w' ? 'b' : 'w';

    if (currentTurn === aiColor) {
      setIsAiThinking(true);
      // Give a dynamic calculating delay so that the Mikhail AI calculation is realistic and its timer ticks down noticeably!
      const delay = settings.engineDifficulty === 'easy' ? 1200 
                  : settings.engineDifficulty === 'medium' ? 2200 
                  : 3200;

      const timer = setTimeout(() => {
        const bestMove = getBestMove(chess, settings.engineDifficulty);
        if (bestMove) {
          try {
            const result = chess.move(bestMove);
            if (result) {
              const nextChess = new Chess(chess.fen());
              const newRec: MoveRecord = {
                san: result.san,
                from: result.from,
                to: result.to,
                color: result.color,
                piece: result.piece,
                fen: nextChess.fen()
              };

              const updatedMoves = [...movesList, newRec];
              setMovesList(updatedMoves);
              setActiveMoveIdx(updatedMoves.length - 1);
              setChess(nextChess);
            }
          } catch (err) {
            console.error('AI failed move generation:', err);
          }
        }
        setIsAiThinking(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [chess, mode, resolvedPlayerColor, settings.engineDifficulty, gameStatus, isReviewingHistory, isMatchStarted]);

  // Evaluate active game outcomes internally
  useEffect(() => {
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        setGameStatus('checkmate');
        setWinner(chess.turn() === 'w' ? 'b' : 'w');
      } else if (chess.isStalemate()) {
        setGameStatus('stalemate');
        setWinner('draw');
      } else {
        setGameStatus('draw');
        setWinner('draw');
      }
    }
  }, [chess]);

  // Triggered when any manual move executes on screen
  const handleMove = (from: string, to: string, promotion?: string) => {
    // If we're reviewing past history, don't allow modifying game state
    if (isReviewingHistory && mode !== 'puzzle' && mode !== 'daily') return;

    if (mode === 'puzzle' || mode === 'daily') {
      handlePuzzleMove(from, to, promotion);
      return;
    }

    if (mode === 'online') {
      if (!onlineMatchId || !onlineMatch) return;
      if (!onlineMatch.gameStarted || onlineMatch.status !== 'active') {
        console.warn("Match has not started yet or is inactive. Make sure both players clicked 'Start Play'.");
        return;
      }
      const isPlayer1 = onlineMatch.player1Id === currentUser?.uid;
      const isPlayer2 = onlineMatch.player2Id === currentUser?.uid;
      const turn = chess.turn();
      const isMyTurn = (isPlayer1 && turn === 'w') || (isPlayer2 && turn === 'b');
      if (!isMyTurn) {
        console.warn("It is not your turn!");
        return;
      }

      try {
        const activeMove = chess.move({ from, to, promotion: promotion || 'q' });
        if (activeMove) {
          const nextChess = new Chess(chess.fen());
          const newRec: MoveRecord = {
            san: activeMove.san,
            from: activeMove.from,
            to: activeMove.to,
            color: activeMove.color,
            piece: activeMove.piece,
            fen: nextChess.fen()
          };

          const updatedMoves = [...movesList.slice(0, activeMoveIdx + 1), newRec];
          setMovesList(updatedMoves);
          setActiveMoveIdx(updatedMoves.length - 1);
          setChess(nextChess);

          // Update match in Firestore!
          const isGameOver = nextChess.isGameOver();
          const p1Wins = isGameOver && nextChess.isCheckmate() && turn === 'w';
          const p2Wins = isGameOver && nextChess.isCheckmate() && turn === 'b';
          const isDraw = isGameOver && !nextChess.isCheckmate();

          const updatePayload: any = {
            fen: nextChess.fen(),
            moves: updatedMoves.map(m => m.san),
            turn: nextChess.turn(),
            whiteTime,
            blackTime
          };

          if (isGameOver && onlineMatch) {
            updatePayload.status = 'finished';
            if (p1Wins) {
              updatePayload.winner = 'white';
              updateMatchElo(onlineMatch.player1Id, 15).catch(console.error);
              updateMatchElo(onlineMatch.player2Id, -15).catch(console.error);
            } else if (p2Wins) {
              updatePayload.winner = 'black';
              updateMatchElo(onlineMatch.player2Id, 15).catch(console.error);
              updateMatchElo(onlineMatch.player1Id, -15).catch(console.error);
            } else if (isDraw) {
              updatePayload.winner = 'draw';
              updateMatchElo(onlineMatch.player1Id, 2).catch(console.error);
              updateMatchElo(onlineMatch.player2Id, 2).catch(console.error);
            }
          }

          updateMatchRealtimeGame(onlineMatchId, updatePayload).catch(console.error);
        }
      } catch (e) {
        console.warn('Illegal online move:', e);
      }
      return;
    }

    try {
      const activeMove = chess.move({ from, to, promotion: promotion || 'q' });
      if (activeMove) {
        const nextChess = new Chess(chess.fen());
        const newRec: MoveRecord = {
          san: activeMove.san,
          from: activeMove.from,
          to: activeMove.to,
          color: activeMove.color,
          piece: activeMove.piece,
          fen: nextChess.fen()
        };

        const updatedMoves = [...movesList.slice(0, activeMoveIdx + 1), newRec];
        setMovesList(updatedMoves);
        setActiveMoveIdx(updatedMoves.length - 1);
        setChess(nextChess);
      }
    } catch (e) {
      console.warn('Illegal move attempted:', e);
    }
  };

  // Puzzle validation logic
  const handlePuzzleMove = (from: string, to: string, promotion?: string) => {
    const tempChess = new Chess(chess.fen());
    try {
      const move = tempChess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      const userSan = move.san;
      const correctSan = activePuzzle.solutionMoves[puzzleStep];

      if (userSan === correctSan) {
        chess.move({ from, to, promotion: promotion || 'q' });
        const nextChess = new Chess(chess.fen());
        
        const newRec: MoveRecord = {
          san: move.san,
          from: move.from,
          to: move.to,
          color: move.color,
          piece: move.piece,
          fen: nextChess.fen()
        };

        const updatedMoves = [...movesList, newRec];
        setMovesList(updatedMoves);
        setActiveMoveIdx(updatedMoves.length - 1);
        setChess(nextChess);
        setShowHint(false);

        const nextStep = puzzleStep + 1;
        if (nextStep >= activePuzzle.solutionMoves.length) {
          setPuzzleFeedback({
            status: 'completed',
            text: `👑 Magnificent! You successfully solved the puzzle: "${activePuzzle.title}"!`
          });
          setGameStatus('draw'); // blocks extra moves

          // Sync rating isolated from match ELO or daily logic
          if (currentUser) {
            if (mode === 'puzzle') {
              let puzzleChange = 10;
              if (puzzleHintsCount === 1) {
                puzzleChange = 7;
              } else if (puzzleHintsCount >= 2) {
                puzzleChange = 5;
              }
              
              updatePuzzleElo(currentUser.uid, puzzleChange, true).catch(console.error);
              saveSolvedPuzzle(currentUser.uid, activePuzzle.id, {
                timeTaken: puzzleTime,
                hintsUsed: puzzleHintsCount,
                attempts: puzzleAttempts
              }).then((res) => {
                if (res) {
                  const actualChange = res.ratingChange || puzzleChange;
                  setPuzzleSolvedScore({
                    ratingChange: actualChange,
                    newRating: currentUser.puzzleElo !== undefined ? currentUser.puzzleElo + actualChange : 1450 + actualChange
                  });
                  setPointsChangeOverlay({
                    text: `+${actualChange} Puzzle ELO`,
                    positive: true
                  });
                }
              }).catch(console.error);
            } else if (mode === 'daily') {
              updateQuizElo(currentUser.uid, 20).catch(console.error);
              // Add entry to daily scores leaderboard
              const freshScore = {
                fullName: currentUser.fullName,
                username: currentUser.username || 'puzzler',
                timeTaken: puzzleTime,
                puzzleId: activePuzzle.id,
                solvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
              setDailyScores(prev => [...prev, freshScore].sort((a, b) => a.timeTaken - b.timeTaken));
              setPointsChangeOverlay({
                text: `+20 Quiz ELO`,
                positive: true
              });
            }
          }
        } else {
          setPuzzleStep(nextStep);
          setPuzzleFeedback({
            status: 'correct',
            text: `✨ Correct! Now defend against opponent's response...`
          });

          // Execute automatic opponent counter move response
          setTimeout(() => {
            const oppMoveLine = activePuzzle.opponentMovesResponse[puzzleStep];
            if (oppMoveLine) {
              const oppMoveObj = chess.move(oppMoveLine);
              if (oppMoveObj) {
                const afterOppChess = new Chess(chess.fen());
                const oppRec: MoveRecord = {
                  san: oppMoveObj.san,
                  from: oppMoveObj.from,
                  to: oppMoveObj.to,
                  color: oppMoveObj.color,
                  piece: oppMoveObj.piece,
                  fen: afterOppChess.fen()
                };

                const afterMoves = [...updatedMoves, oppRec];
                setMovesList(afterMoves);
                setActiveMoveIdx(afterMoves.length - 1);
                setChess(afterOppChess);
                setPuzzleFeedback({
                  status: 'idle',
                  text: `🔥 Opponent countered with ${oppMoveLine}. Find the winning follow-up!`
                });
              }
            }
          }, 1000);
        }
      } else {
        setPuzzleAttempts(prev => prev + 1);
        setPuzzleFeedback({
          status: 'incorrect',
          text: `❌ That is not the best tactical line. Mikhail AI Coach recommends trying another approach.`
        });
        if (currentUser) {
          if (mode === 'puzzle') {
            updatePuzzleElo(currentUser.uid, -5, false).catch(console.error);
            setPointsChangeOverlay({
              text: `-5 Puzzle ELO`,
              positive: false
            });
          } else if (mode === 'daily') {
            updateQuizElo(currentUser.uid, 0).catch(console.error);
            setPointsChangeOverlay({
              text: `+0 Quiz ELO`,
              positive: false
            });
          }
        }
      }
    } catch (err) {
      console.warn('Illegal move in puzzle:', err);
    }
  };

  // Skip or change puzzles
  const startPuzzle = (index: number) => {
    setActivePuzzleIdx(index);
    const pz = CHESS_PUZZLES[index];
    const initialChess = new Chess(pz.initialFen);
    
    setChess(initialChess);
    setMovesList([]);
    setActiveMoveIdx(-1);
    setPuzzleStep(0);
    setGameStatus('active');
    setWinner(null);
    setShowHint(false);
    setPuzzleFeedback({
      status: 'idle',
      text: `🎯 Objective: ${pz.description}`
    });

    // Reset analytical tracking stats
    setPuzzleTime(0);
    setPuzzleAttempts(0);
    setPuzzleHintsCount(0);
    setPuzzleSolvedScore(null);
    
    const isBlackToMove = pz.initialFen.split(' ')[1] === 'b';
    setIsFlipped(isBlackToMove);
  };

  // Reset Game fully
  const resetGame = () => {
    const freshChess = new Chess();
    setChess(freshChess);
    setMovesList([]);
    setActiveMoveIdx(-1);
    setIsAiThinking(false);
    setGameStatus('active');
    setWinner(null);
    setIsMatchStarted(false);

    if (settings.initialTimeMinutes > 0) {
      setWhiteTime(settings.initialTimeMinutes * 60);
      setBlackTime(settings.initialTimeMinutes * 60);
    }

    if (mode === 'puzzle') {
      startPuzzle(activePuzzleIdx);
    } else if (mode === 'ai') {
      const activeColor: 'w' | 'b' = settings.playerColor === 'random'
        ? (Math.random() < 0.5 ? 'w' : 'b')
        : settings.playerColor;
      setResolvedPlayerColor(activeColor);
      setIsFlipped(activeColor === 'b');
    } else {
      setIsFlipped(false);
    }
    setLiveGameId(null);
  };

  const handleStartPlay = async () => {
    setMatchStarted(true);
    await initializeLiveBroadcast(chess, mode, settings);
  };

  // Save match record and rating when player resigns or leaves
  const saveResignOrQuitMatch = async (actionType: 'resign' | 'leave') => {
    if (gameStatus !== 'active' || !currentUser) return;

    // Prevent the standard game completion useEffect selector from saving this match again
    setMatchSaved(true);

    const result = 'loss'; // Resigning or leaving is always a loss for the player who does it
    const duration = Math.round((Date.now() - startTime) / 1000) || 0;
    const date = new Date().toISOString();

    let oldElo = 1200;
    let pointsChange = -10; // -10 penalty as explicitly noted in the UI warning

    if (mode === 'ai') {
      oldElo = currentUser.botElo !== undefined ? currentUser.botElo : 1100;
    } else if (mode === 'local') {
      oldElo = currentUser.localElo !== undefined ? currentUser.localElo : 1050;
    } else {
      // ONLINE PVP or TOURNAMENT
      oldElo = currentUser.eloRating !== undefined ? currentUser.eloRating : 1200;
    }

    const newElo = Math.max(100, oldElo + pointsChange);
    const eloChange = newElo - oldElo;

    // Determine opponent details
    let opponentName = "Mikhail Bot";
    let opponentId = "mikhail_bot";

    if (mode === 'ai') {
      opponentName = `Mikhail Bot (Lv. ${settings.engineDifficulty.toUpperCase()})`;
      opponentId = `mikhail_bot_${settings.engineDifficulty}`;
    } else if (mode === 'local') {
      opponentName = "Local Opponent";
      opponentId = "local_opponent";
    } else if (mode === 'online' && onlineMatch) {
      const isPlayer1 = onlineMatch.player1Id === currentUser?.uid;
      opponentName = isPlayer1 ? (onlineMatch.player2Name || 'Challenger') : (onlineMatch.player1Name || 'Challenger');
      opponentId = isPlayer1 ? (onlineMatch.player2Id || 'challenger_id') : (onlineMatch.player1Id || 'challenger_id');
    }

    let gameTypeDesc = mode === 'ai' ? 'VS Bot' : mode === 'local' ? 'Local Sandbox' : 'Online Match';
    if (settings.initialTimeMinutes > 0) {
      gameTypeDesc += ` (${settings.initialTimeMinutes}m Clock)`;
    } else {
      gameTypeDesc += " (Casual)";
    }

    try {
      const { saveMatchAndUpdateElo } = await import('../lib/firebase');
      await saveMatchAndUpdateElo(currentUser.uid, {
        playerId: currentUser.uid,
        opponent: opponentName,
        result,
        eloChange,
        oldElo,
        newElo,
        gameType: gameTypeDesc,
        date,
        duration,

        // Expanded Fields per criteria
        userId: currentUser.uid,
        opponentId,
        opponentName,
        userColor: resolvedPlayerColor || 'w',
        reason: actionType === 'resign' ? 'resigned' : 'abandoned/left',
        eloBefore: oldElo,
        eloAfter: newElo,
        pointsChange: eloChange,
        moves: movesList.map(m => m.san) || [],
        pgn: generatePgnString() || '',
        timestamp: date,
        academyId: currentUser.academyId || 'sumeet_rasela_parasia'
      }, mode as any);

      console.log('Forfeited/Resigned match saved successfully');
      loadMatches();

      // Ensure Firestore real-time match state is updated with correct winner color so winner client receives it and receives their point increase
      if (mode === 'online' && onlineMatchId && onlineMatch) {
        const winnerColor = resolvedPlayerColor === 'w' ? 'black' : 'white';
        try {
          await updateMatchRealtimeGame(onlineMatchId, {
            status: 'finished',
            winner: winnerColor as any,
            reason: actionType === 'resign' ? 'resigned' : 'abandoned/left'
          });
          console.log('Online opponent resignation synced to Firestore successfully. Winner client will handle their ELO update.');
        } catch (syncErr) {
          console.error('Failed to sync resignation finish to Firestore:', syncErr);
        }
      }
    } catch (err) {
      console.error('Failed to save forfeited match on client:', err);
    }
  };

  // Resign match manually
  const handleResign = async (skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmResign = confirm('Resign match? Opponent wins and you lose 10 ELO.');
      if (!confirmResign) return;
    }

    // 1. Manually trigger the match history log and ELO penalty in the database
    await saveResignOrQuitMatch('resign');

    // 2. Set game statuses
    setGameStatus('resigned');
    setWinner(resolvedPlayerColor === 'w' ? 'b' : 'w');

    // 3. Keep standard live api quit synchronization
    const match_id = localStorage.getItem('current_match_id') || liveGameId;
    const playerName = currentUser?.fullName || 'sumeet rasela';

    try {
      if (match_id) {
        await fetch(`/api/match/${match_id}/quit`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ player: playerName, action: 'resign' })
        });
      }
    } catch (err) {
      console.error("Resign API failed:", err);
    }

    // Clean up current match cache
    localStorage.removeItem('current_match_id');
    setLiveGameId(null);

    // Cleanly transition user back to arena section instead of a hard full page reload!
    setIsMatchStarted(false);
    if (onNavigateSection) {
      onNavigateSection('arena');
    } else {
      window.location.href = '/chess-arena';
    }
  };

  const handleQuit = async (skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmQuit = confirm('Quit match? This counts as abandon and -10 ELO.');
      if (!confirmQuit) return;
    }

    // 1. Manually trigger the match history log and ELO penalty in the database as 'leave'
    await saveResignOrQuitMatch('leave');

    // 2. Set game statuses
    setGameStatus('timeout');
    setWinner(resolvedPlayerColor === 'w' ? 'b' : 'w');

    // 3. Keep standard live api quit synchronization
    const match_id = localStorage.getItem('current_match_id') || liveGameId;
    const playerName = currentUser?.fullName || 'sumeet rasela';

    try {
      if (match_id) {
        await fetch(`/api/match/${match_id}/quit`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ player: playerName, action: 'quit' })
        });
      }
    } catch (err) {
      console.error("Abandon/Quit API failed:", err);
    }

    // Clean up current match cache
    localStorage.removeItem('current_match_id');
    setLiveGameId(null);

    // Cleanly transition user back to arena section instead of a hard full page reload!
    setIsMatchStarted(false);
    if (onNavigateSection) {
      onNavigateSection('arena');
    } else {
      window.location.href = '/chess-arena';
    }
  };

  const triggerQuitWithWarning = (action: () => void) => {
    if (gameStatus === 'active' && (isMatchStarted || mode === 'puzzle' || mode === 'daily' || mode === 'online' || mode === 'tournament')) {
      setPendingQuitAction(() => action);
      setShowQuitConfirmModal(true);
    } else {
      action();
    }
  };

  const handleQuitAction = () => {
    if (isSpectator) {
      setIsSpectator(false);
      setSpectatingGameId(null);
      setSpectatingGameData(null);
      // Reset board to starting position
      setChess(new Chess());
      setMovesList([]);
      setActiveMoveIdx(-1);
      return;
    }

    // If the game has already completed or is finished, directly exit to the mode selection lobby menu
    if (gameStatus !== 'active') {
      setIsMatchStarted(false);
      setGameStatus('active');
      setChess(new Chess());
      setMovesList([]);
      setActiveMoveIdx(-1);
      setWinner(null);
      if (mode === 'online') {
        selectGameMode('local');
      }
      return;
    }

    triggerQuitWithWarning(() => {
      // Gracefully exit and completely reset game states to return to play selection lobby menu
      setIsMatchStarted(false);
      setGameStatus('active');
      setChess(new Chess());
      setMovesList([]);
      setActiveMoveIdx(-1);
      setWinner(null);
      if (mode === 'online') {
        selectGameMode('local');
      }
    });
  };

  // Join the worldwide matchmaking network
  const handleJoinOnlineQueue = async (selectedMode: 'online' | 'tournament' = 'online') => {
    if (!currentUser) {
      alert("Please login first to play online multiplayer.");
      return;
    }
    setMode(selectedMode);
    setIsOnlineFinding(true);
    setOnlineMatchId(null);
    setOnlineMatch(null);
    setHasClickedReady(false);
    setOnlineReadyCountdown(60);

    try {
      const matchId = await joinMatchmakerQueue(
        currentUser.uid, 
        currentUser.username || 'puzzler',
        currentUser.fullName, 
        currentUser.eloRating !== undefined ? currentUser.eloRating : 1200
      );
      if (matchId) {
        setOnlineMatchId(matchId);
      } else {
        throw new Error("Invalid match lobby returned.");
      }
    } catch (err) {
      console.error("Matchmaker queuing failed:", err);
      setIsOnlineFinding(false);
      setMode('local');
      alert("Error joining matches lobby. Please test again in a few seconds.");
    }
  };

  // Toggle modes
  const selectGameMode = (newMode: GameMode) => {
    setMode(newMode);
    setLiveGameId(null);
    setOnlineMatchId(null);
    setOnlineMatch(null);
    setIsOnlineFinding(false);
    setLastMoveSquares({});
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setIsMatchStarted(false);

    if (newMode === 'puzzle') {
      const randIdx = Math.floor(Math.random() * CHESS_PUZZLES.length);
      startPuzzle(randIdx);
    } else if (newMode === 'daily') {
      const randIdx = Math.floor(Math.random() * CHESS_PUZZLES.length);
      startPuzzle(randIdx);
    } else if (newMode === 'tournament') {
      setMode('tournament');
      setShowTournamentModal(true);
    } else if (newMode === 'online') {
      handleJoinOnlineQueue(newMode);
    } else {
      const freshChess = new Chess();
      setChess(freshChess);
      setMovesList([]);
      setActiveMoveIdx(-1);
      setGameStatus('active');
      setWinner(null);
      setPuzzleFeedback({ status: 'idle', text: '' });
      if (newMode === 'ai') {
        const activeColor: 'w' | 'b' = settings.playerColor === 'random'
          ? (Math.random() < 0.5 ? 'w' : 'b')
          : settings.playerColor;
        setResolvedPlayerColor(activeColor);
        setIsFlipped(activeColor === 'b');
      } else {
        setIsFlipped(false);
      }
    }
  };

  // Render timer formatted text: "09:45"
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to convert structured captured pieces count into a flat list of solid/hollow symbols
  const getCapturesList = (captured: { p: number; n: number; b: number; r: number; q: number }, isWhiteTaker: boolean) => {
    const list: string[] = [];
    const pieceDefs = [
      { type: 'p', symbol: isWhiteTaker ? '♟' : '♙' },
      { type: 'n', symbol: isWhiteTaker ? '♞' : '♘' },
      { type: 'b', symbol: isWhiteTaker ? '♝' : '♗' },
      { type: 'r', symbol: isWhiteTaker ? '♜' : '♖' },
      { type: 'q', symbol: isWhiteTaker ? '♛' : '♕' },
    ];
    
    pieceDefs.forEach(({ type, symbol }) => {
      const count = (captured as any)[type] || 0;
      for (let i = 0; i < count; i++) {
        list.push(symbol);
      }
    });
    return list;
  };

  const currentChessRepresentation = isReviewingHistory && activeMoveIdx > -1 
    ? new Chess(movesList[activeMoveIdx].fen) 
    : chess;
  
  const countCapturedArray = (arr: string[]) => {
    const res = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    arr.forEach(val => {
      const char = val.toLowerCase();
      if (char in res) {
        res[char as keyof typeof res]++;
      }
    });
    return res;
  };

  const countSpectatorPieces = () => {
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
    return {
      capturedByWhite: {
        p: Math.max(0, 8 - count.b.p),
        n: Math.max(0, 2 - count.b.n),
        b: Math.max(0, 2 - count.b.b),
        r: Math.max(0, 2 - count.b.r),
        q: Math.max(0, 1 - count.b.q),
      },
      capturedByBlack: {
        p: Math.max(0, 8 - count.w.p),
        n: Math.max(0, 2 - count.w.n),
        b: Math.max(0, 2 - count.w.b),
        r: Math.max(0, 2 - count.w.r),
        q: Math.max(0, 1 - count.w.q),
      }
    };
  };

  const currentCaptured = isSpectator ? countSpectatorPieces() : {
    capturedByWhite: countCapturedArray(capturedByWhite),
    capturedByBlack: countCapturedArray(capturedByBlack)
  };

  const currentTurn = chess.turn();

  // Stats Calculations
  const totalGames = matches.length;
  const wins = matches.filter(m => m.result === 'win').length;
  const losses = matches.filter(m => m.result === 'loss').length;
  const draws = matches.filter(m => m.result === 'draw').length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const highestElo = matches.reduce((max, m) => Math.max(max, m.newElo), Math.max(currentUser.eloRating || 1000, 1000));
  const currentElo = currentUser.eloRating || 1000;

  const chartData = [...matches]
    .slice(0, 30)
    .reverse()
    .map((m, index) => ({
      name: `G ${index + 1}`,
      elo: m.newElo,
      opponent: m.opponent,
      result: m.result.toUpperCase(),
      change: m.eloChange >= 0 ? `+${m.eloChange}` : `${m.eloChange}`
    }));

  const displayChartData = chartData.length > 0 
    ? chartData 
    : [{ name: 'Setup', elo: 1000, opponent: 'None', result: 'STARTING', change: '0' }];

  // Render-time calculation of perspective result for Match End Dialog Modal
  const gameOutcomeDetails = (() => {
    if (gameStatus === 'active') return null;
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (gameStatus === 'checkmate') {
      result = winner === resolvedPlayerColor ? 'win' : 'loss';
    } else if (gameStatus === 'stalemate' || gameStatus === 'draw') {
      result = 'draw';
    } else if (gameStatus === 'resigned') {
      result = winner === resolvedPlayerColor ? 'win' : 'loss';
    } else if (gameStatus === 'timeout') {
      result = winner === resolvedPlayerColor ? 'win' : 'loss';
    }

    let title = "Match Drawn 🤝";
    let iconEmoji = "🤝";
    if (result === 'win') {
      iconEmoji = "🏆";
      if (gameStatus === 'checkmate') title = "Checkmate! You Won 🎉";
      else if (gameStatus === 'timeout') title = "Time Out - You Won 🎉";
      else if (gameStatus === 'resigned') title = "Opponent Resigned! You Won 🎉";
      else title = "You Won 🎉";
    } else if (result === 'loss') {
      iconEmoji = "😢";
      if (gameStatus === 'checkmate') title = "Checkmate! You Lost 😢";
      else if (gameStatus === 'timeout') title = "Time Out - You Lost 😢";
      else if (gameStatus === 'resigned') title = "You Resigned! You Lost 😢";
      else title = "You Lost 😢";
    } else {
      if (gameStatus === 'stalemate') title = "Stalemate - Draw 🤝";
    }

    return { result, title, iconEmoji };
  })();

  // Helper for actual ranking of ELO rating among active players
  const getRankForElo = (targetElo: number) => {
    const list = [...players];
    const updatedList = list.some(p => p.uid === currentUser.uid)
      ? list.map(p => p.uid === currentUser.uid ? { ...p, eloRating: targetElo } : p)
      : [...list, { ...currentUser, eloRating: targetElo }];
    const sorted = updatedList.sort((a, b) => (b.eloRating || 1000) - (a.eloRating || 1050)); // sort helper
    const finalRank = sorted.findIndex(p => p.uid === currentUser.uid) + 1;
    return finalRank > 0 ? finalRank : 1;
  };

  const getShareTextForOutcome = () => {
    if (!gameOutcomeDetails) return '';
    const res = gameOutcomeDetails.result;
    const rawOpponent = mode === 'ai' ? `MikhailBot` : mode === 'puzzle' ? `TacticsDefender` : `Opponent`;
    const opponentSlug = `@${rawOpponent}`;
    
    const adjustedElo = res === 'win' 
      ? (currentUser.eloRating || 1000) + 30 
      : res === 'loss' 
        ? Math.max(800, (currentUser.eloRating || 1000) - 20) 
        : (currentUser.eloRating || 1000);
    
    const currentRank = getRankForElo(adjustedElo);

    if (res === 'win') {
      return `🏆 I just won a chess match on CheckmatePro Chess! \nCheckmate vs ${opponentSlug} ♟️\nMy New ELO: ${adjustedElo} | Rank: #${currentRank} Global\nCan you beat me? Play now: checkmateprochess.com\n#CheckmatePro #ChessKing`;
    } else if (res === 'loss') {
      return `😤 Close game! Lost to ${opponentSlug} on CheckmatePro Chess\nCurrent ELO: ${adjustedElo} | Rank: #${currentRank}\nI'll be back stronger! Challenge me: checkmateprochess.com\n#CheckmatePro #Chess`;
    } else {
      return `🤝 Hard fought draw vs ${opponentSlug} on CheckmatePro Chess!\nELO: ${adjustedElo} | Rank: #${currentRank}\nRematch? Play here: checkmateprochess.com\n#CheckmatePro`;
    }
  };

  const handleShareOutcome = async (platform: 'whatsapp' | 'twitter' | 'facebook' | 'copy' | 'native') => {
    const shareText = getShareTextForOutcome();
    if (!shareText) return;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://checkmateprochess.com')}&quote=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedMatchText(true);
        setTimeout(() => setCopiedMatchText(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    } else if (platform === 'native') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'CheckmatePro Chess',
            text: shareText,
            url: 'https://checkmateprochess.com'
          });
        } catch (err) {
          console.log('Web Share API failed, fallback to WhatsApp', err);
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        }
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    }
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-3xl border border-neutral-200 dark:border-neutral-900 shadow-xl">
      {/* Top dashboard panel representing current logged-in chess player details */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 mb-6 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl gap-4">
        <div className="flex items-center gap-3">
          {(() => {
            const eloRating = currentUser.eloRating !== undefined ? currentUser.eloRating : 1200;
            const globalRank = getRankForElo(eloRating);
            const botElo = currentUser.botElo !== undefined ? currentUser.botElo : 1100;
            const localElo = currentUser.localElo !== undefined ? currentUser.localElo : 1050;
            const puzzleElo = currentUser.puzzleElo !== undefined ? currentUser.puzzleElo : 1450;
            const quizElo = currentUser.quizElo !== undefined ? currentUser.quizElo : 890;

            return (
              <div className="elo-section p-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-2xl border border-amber-500/20 max-w-sm">
                <div 
                  className="main-elo font-black font-sans text-sm tracking-tight flex items-center gap-1 cursor-help select-none"
                  title="Only ONLINE PVP + TOURNAMENT affect Global Rank"
                >
                  🏆 MATCH ELO: {eloRating} | Rank #{globalRank}
                </div>
                <div className="mode-elos text-[10px] text-neutral-600 dark:text-neutral-400 font-mono mt-1 w-full leading-relaxed">
                  🤖 Bot: {botElo} | 🏠 Local: {localElo} | 🧩 Puzzle: {puzzleElo} | 🎯 Quiz: {quizElo}
                </div>
              </div>
            );
          })()}
          <div>
            <h2 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm">
              Logged in: <span className="text-amber-500">{currentUser.fullName}</span>
            </h2>
            <p className="text-4xs font-mono text-neutral-400 mt-0.5">
              Role: PLAYER • Register Type: {currentUser.createdBy === 'self' ? 'Independent' : 'Academy Enrolled'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer text-neutral-500 hover:text-neutral-805 dark:hover:text-amber-400 border border-neutral-200/40 dark:border-neutral-800/60"
            title={settings.soundEnabled ? 'Mute' : 'Unmute'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>
          
          <button
            onClick={() => setIsFlipped((f) => !f)}
            className="p-2 px-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-1.5 cursor-pointer text-2xs font-semibold font-mono border border-neutral-200/45 dark:border-neutral-850"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Flip</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2 px-4 shadow-sm bg-red-500 hover:bg-red-650 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer text-2xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-neutral-200/60 dark:border-neutral-808/80 pb-4">
        <button
          onClick={() => {
            setActiveTab('play');
            onNavigateSection?.('arena');
          }}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
            activeTab === 'play'
              ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
              : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>Chess Arena</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            onNavigateSection?.('history');
          }}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
            activeTab === 'history'
              ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
              : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-905 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Match History & Stats</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('lessons');
          }}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
            activeTab === 'lessons'
              ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
              : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-905 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-amber-550 dark:text-amber-405" />
          <span>Learning Kit</span>
        </button>

        <button
          onClick={() => onNavigateSection?.('events')}
          className="flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-905 dark:hover:bg-neutral-805 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800"
        >
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span>Events</span>
        </button>

        <button
          onClick={() => onNavigateSection?.('leaderboard')}
          className="flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-905 dark:hover:bg-neutral-805 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800"
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Leaderboard</span>
        </button>

        {(currentUser.role === 'academy' || currentUser.role === 'admin') && (
          <button
            onClick={() => onNavigateSection?.('certificates')}
            className="flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-905 dark:hover:bg-neutral-805 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800"
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Certificates</span>
          </button>
        )}
      </div>

      {activeTab === 'lessons' ? (
        <ChessLearningKit boardTheme={settings.theme} soundEnabled={settings.soundEnabled} />
      ) : activeTab === 'play' ? (() => {
        const isMatchActive = isSpectator || (gameStatus === 'active' && (
          mode === 'online' 
            ? (onlineMatch && onlineMatch.gameStarted) 
            : (movesList.length > 0)
        ));
        const showMatchArea = isMatchStarted || isSpectator || mode === 'puzzle' || mode === 'daily' || isMatchActive;
        return (
          <div className={`chess-container ${showMatchArea ? '' : 'justify-center items-center py-6 sm:py-12'}`}>
          
          {/* Left Arena: Width 7 */}
          <div className={`${isMatchActive ? 'match-screen' : 'pre-match-screen'} space-y-4 ${showMatchArea ? '' : 'hidden'}`}>

            {tournamentFeedback && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-sans text-2xs font-semibold rounded-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-350">
                <div className="flex items-center gap-2.5">
                  <Crown className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                  <span className="leading-tight">{tournamentFeedback}</span>
                </div>
                <button 
                  onClick={() => setTournamentFeedback(null)} 
                  className="text-neutral-400 hover:text-white text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors font-black leading-none"
                >
                  ✕
                </button>
              </div>
            )}
          
          {/* Opponent / Top Avatar Banner using modern chess.com / lichess styled classes */}
          {(() => {
            const isTopBlack = !isFlipped;
            const topTurn = isTopBlack ? 'b' : 'w';
            const topTime = isTopBlack ? blackTime : whiteTime;
            const isTopTurnActive = currentTurn === topTurn;
            
            const topName = isSpectator && spectatingGameData
              ? (isTopBlack ? spectatingGameData.blackPlayer : spectatingGameData.whitePlayer)
              : (isTopBlack
                ? (mode === 'ai' 
                    ? `Mikhail Bot (Lv. ${settings.engineDifficulty.toUpperCase()})` 
                    : mode === 'puzzle' ? 'Tactics Defender' : 'Black (Opponent)')
                : currentUser.fullName);
              
            const topSub = isSpectator && spectatingGameData
              ? `Rating: ${isTopBlack ? spectatingGameData.blackElo : spectatingGameData.whiteElo} ELO`
              : (isTopBlack
                ? (mode === 'ai' 
                    ? `Search depth limit: ${getDifficultyLevelIndex(settings.engineDifficulty)}` 
                    : 'Offline matches')
                : `Rating: ${
                    mode === 'ai' ? (currentUser.botElo !== undefined ? currentUser.botElo : 1100) :
                    mode === 'local' ? (currentUser.localElo !== undefined ? currentUser.localElo : 1050) :
                    mode === 'puzzle' ? (currentUser.puzzleElo !== undefined ? currentUser.puzzleElo : 1450) :
                    mode === 'daily' ? (currentUser.quizElo !== undefined ? currentUser.quizElo : 890) :
                    (currentUser.eloRating || 1200)
                  } ELO`);

            const topCapturesSource = isTopBlack ? currentCaptured.capturedByBlack : currentCaptured.capturedByWhite;
            const topIsWhiteTaker = !isTopBlack;
            const topCaptures = getCapturesList(topCapturesSource, topIsWhiteTaker);

            return (
              <div className="p-bar rounded-xl border border-neutral-800 shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm">
                    {isTopBlack ? (
                      mode === 'ai' ? <Bot className="w-4.5 h-4.5 text-amber-500" /> : <User className="w-4.5 h-4.5 text-neutral-400" />
                    ) : (
                      <User className="w-4.5 h-4.5 text-amber-700" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5 leading-none">
                      {topName} {isTopBlack ? '(Black)' : '(White)'}
                      {isTopTurnActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </h4>
                    <span className="text-5xs font-mono text-neutral-400 mt-1 uppercase leading-none">
                      {topSub}
                    </span>
                  </div>

                  {/* Captures next to player name */}
                  {topCaptures.length > 0 && (
                    <div className="captures ml-2">
                      {topCaptures.map((sym, idx) => (
                        <span key={idx} className="select-none leading-none">{sym}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="right">
                  {settings.initialTimeMinutes > 0 && mode !== 'puzzle' && (
                    <span className={`timer clock ${isTopTurnActive ? 'active' : ''} ${topTime <= 60 ? 'low animate-pulse' : ''}`}>
                      {formatTimer(topTime)}
                    </span>
                  )}
                  {(isSpectator || ((isTopBlack && resolvedPlayerColor === 'b') || (!isTopBlack && resolvedPlayerColor === 'w'))) && (
                    <button onClick={handleQuitAction} className="quit-btn">
                      {isSpectator ? 'LEAVE' : 'QUIT'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Central Chessboard Canvas Frame */}
          {/* Embedded Custom CSS Keyframes for Shake, Confetti, and Float ELO animations */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes shake {
              0%, 100% { transform: translate(-50%, -50%) translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translate(-50%, -50%) translateX(-8px); }
              20%, 40%, 60%, 80% { transform: translate(-50%, -50%) translateX(8px); }
            }
            @keyframes confettiFall {
              0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
            }
            @keyframes floatUp {
              0% { transform: translate(-50%, -10%) scale(0.85); opacity: 0; }
              15% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
              85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              100% { transform: translate(-50%, -120%) scale(0.9); opacity: 0; }
            }
            .animate-shake-modal {
              animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
            }
            .animate-confetti-piece {
              animation: confettiFall 4s linear infinite;
            }
            .animate-float-up-elo {
              animation: floatUp 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            }
          `}} />

          <div className="relative">
            {/* ONLINE PvP LOBBY OVERLAYS */}
            {mode === 'online' && isOnlineFinding && (
              <div id="matching_finding_overlay" className="absolute inset-0 z-40 bg-neutral-950/85 backdrop-blur flex flex-col items-center justify-center p-6 text-center rounded-3xl animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin mb-4"></div>
                <h3 className="text-sm font-black text-white tracking-widest uppercase">Finding Tactical Opponent</h3>
                <p className="text-4xs font-mono uppercase text-neutral-400 mt-1">ELO Arena Queue Active</p>
                <div className="mt-4 bg-neutral-900 px-4 py-2 rounded-xl text-3xs font-mono border border-neutral-800">
                  <span>Matchmaking ELO: </span>
                  <span className="text-amber-500 font-bold">{currentUser?.eloRating || 1200} ELO</span>
                </div>
                <button
                  onClick={() => selectGameMode('local')}
                  className="mt-6 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Cancel Matchmaking
                </button>
              </div>
            )}

            {mode === 'online' && onlineMatch && !onlineMatch.gameStarted && (
              <div id="pvp_lobby_overlay" className="absolute inset-0 z-40 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center rounded-3xl animate-in fade-in duration-300">
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">🎮 MULTIPLAYER MATCH FOUND</span>
                <h2 className="text-lg font-black text-white uppercase mb-4 matches-title">LOBBY MATCH ROOM</h2>
                
                {/* Lobby matchers */}
                <div className="grid grid-cols-3 items-center gap-6 w-full max-w-sm bg-neutral-900 border border-neutral-800 p-5 rounded-2xl mb-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-11 h-11 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lg text-white border border-neutral-700">
                      {(onlineMatch.player1Name || 'Player').charAt(0)}
                    </div>
                    <span className="text-[10px] font-black text-neutral-200 mt-2 line-clamp-1">{onlineMatch.player1Name || 'Challenger'}</span>
                    <span className="text-5xs text-amber-500 font-mono mt-0.5">{onlineMatch.player1Elo || 1200} ELO</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 mt-2 rounded font-sans uppercase ${onlineMatch.player1Ready ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/35' : 'bg-neutral-850 text-neutral-400'}`}>
                      {onlineMatch.player1Ready ? '✓ Ready' : '⏸ Waiting'}
                    </span>
                  </div>

                  <div className="text-center font-bold text-neutral-500 text-xs">
                    VS
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-11 h-11 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lg text-white border border-neutral-700">
                      {(onlineMatch.player2Name || 'Player').charAt(0)}
                    </div>
                    <span className="text-[10px] font-black text-neutral-200 mt-2 line-clamp-1">{onlineMatch.player2Name || 'Guest'}</span>
                    <span className="text-5xs text-amber-500 font-mono mt-0.5">{onlineMatch.player2Elo || 1200} ELO</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 mt-2 rounded font-sans uppercase ${onlineMatch.player2Ready ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/35' : 'bg-neutral-850 text-neutral-400'}`}>
                      {onlineMatch.player2Ready ? '✓ Ready' : '⏸ Waiting'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 w-full max-w-sm">
                  <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-center">
                    <span className="text-4xs font-mono uppercase text-orange-500 tracking-widest block mb-0.5">AUTO DISMISS TIMER</span>
                    <span className="text-xs text-white font-sans font-black">Dismissing and Cancelling in {onlineReadyCountdown}s</span>
                  </div>

                  {/* Ready up triggering start play button */}
                  {!(onlineMatch.player1Id === currentUser?.uid ? onlineMatch.player1Ready : onlineMatch.player2Ready) ? (
                    <button
                      onClick={async () => {
                        setHasClickedReady(true);
                        const isPlayer1 = onlineMatch.player1Id === currentUser?.uid;
                        await updateMatchReadyState(onlineMatchId!, isPlayer1 ? 1 : 2, true);
                      }}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black tracking-widest uppercase text-xs rounded-xl shadow-lg transition-all transform hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Play ▶️
                    </button>
                  ) : (
                    <div className="w-full py-4 bg-neutral-850 text-neutral-400 font-bold uppercase text-xs rounded-xl border border-neutral-850 animate-pulse text-center">
                      Waiting for Opponent to start play...
                    </div>
                  )}

                  <button
                    onClick={() => selectGameMode('local')}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white font-extrabold uppercase text-[10px] tracking-widest rounded-xl transition-all cursor-pointer border border-neutral-800"
                  >
                    ⬅ CANCEL & GO BACK
                  </button>
                </div>
              </div>
            )}

            <ChessBoard
              chess={currentChessRepresentation}
              boardTheme={settings.theme}
              isFlipped={isFlipped}
              onMove={handleMove}
              showLegalMoves={settings.showLegalMoves}
              soundEnabled={settings.soundEnabled}
              playableColor={
                isSpectator
                  ? 'none'
                  : ((mode === 'ai' || mode === 'local') && !isMatchStarted)
                    ? 'none'
                    : mode === 'puzzle' 
                      ? (activePuzzle.initialFen.split(' ')[1] as 'w' | 'b')
                      : mode === 'ai' 
                        ? resolvedPlayerColor 
                        : 'both'
              }
              gameStatus={gameStatus}
              customSquareStyles={lastMoveSquares}
            />

            {pointsChangeOverlay && (
              <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none text-2xl font-black font-mono tracking-widest px-6 py-3.5 rounded-2xl bg-neutral-950/95 text-white border shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-float-up-elo flex items-center gap-3 backdrop-blur ${
                  pointsChangeOverlay.positive 
                    ? 'text-emerald-400 border-emerald-500/40' 
                    : 'text-red-500 border-red-500/40'
                }`}
              >
                <span>{pointsChangeOverlay.positive ? '📈' : '📉'}</span>
                <span>{pointsChangeOverlay.text}</span>
              </div>
            )}

            {isAiThinking && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-neutral-900/95 text-white border border-neutral-800 rounded-full text-xs font-mono flex items-center gap-2 shadow-xl backdrop-blur">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <span>Mikhail AI is calculating...</span>
              </div>
            )}
          </div>

          {/* Active Player / Bottom Avatar Banner using modern chess.com / lichess styled classes */}
          {(() => {
            const isBottomWhite = !isFlipped;
            const bottomTurn = isBottomWhite ? 'w' : 'b';
            const bottomTime = isBottomWhite ? whiteTime : blackTime;
            const isBottomTurnActive = currentTurn === bottomTurn;
            
            const bottomName = isSpectator && spectatingGameData
              ? (isBottomWhite ? spectatingGameData.whitePlayer : spectatingGameData.blackPlayer)
              : (isBottomWhite
                ? currentUser.fullName
                : (mode === 'ai' 
                    ? `Mikhail Bot (Lv. ${settings.engineDifficulty.toUpperCase()})` 
                    : mode === 'puzzle' ? 'Tactics Defender' : 'Black (Opponent)'));
              
            const bottomSub = isSpectator && spectatingGameData
              ? `Rating: ${isBottomWhite ? spectatingGameData.whiteElo : spectatingGameData.blackElo} ELO`
              : (isBottomWhite
                ? `Rating: ${
                    mode === 'ai' ? (currentUser.botElo !== undefined ? currentUser.botElo : 1100) :
                    mode === 'local' ? (currentUser.localElo !== undefined ? currentUser.localElo : 1050) :
                    mode === 'puzzle' ? (currentUser.puzzleElo !== undefined ? currentUser.puzzleElo : 1450) :
                    mode === 'daily' ? (currentUser.quizElo !== undefined ? currentUser.quizElo : 890) :
                    (currentUser.eloRating || 1200)
                  } ELO`
                : (mode === 'ai' 
                    ? `Search depth limit: ${getDifficultyLevelIndex(settings.engineDifficulty)}` 
                    : 'Offline matches'));

            const bottomCapturesSource = isBottomWhite ? currentCaptured.capturedByWhite : currentCaptured.capturedByBlack;
            const bottomIsWhiteTaker = isBottomWhite;
            const bottomCaptures = getCapturesList(bottomCapturesSource, bottomIsWhiteTaker);

            return (
              <div className="p-bar rounded-xl border border-neutral-800 shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm">
                    {isBottomWhite ? (
                      <User className="w-4.5 h-4.5 text-amber-500" />
                    ) : (
                      mode === 'ai' ? <Bot className="w-4.5 h-4.5 text-amber-500" /> : <User className="w-4.5 h-4.5 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5 leading-none">
                      {bottomName} {isBottomWhite ? '(White)' : '(Black)'}
                      {isBottomTurnActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </h4>
                    <span className="text-5xs font-mono text-neutral-400 mt-1 uppercase leading-none">
                      {bottomSub}
                    </span>
                  </div>

                  {/* Captures next to player name */}
                  {bottomCaptures.length > 0 && (
                    <div className="captures ml-2">
                      {bottomCaptures.map((sym, idx) => (
                        <span key={idx} className="select-none leading-none">{sym}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="right">
                  {settings.initialTimeMinutes > 0 && mode !== 'puzzle' && (
                    <span className={`timer clock ${isBottomTurnActive ? 'active' : ''} ${bottomTime <= 60 ? 'low animate-pulse' : ''}`}>
                      {formatTimer(bottomTime)}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* MATCH STARTED IN-GAME CONTROLS: LEAVE & RESIGN BUTTONS WITH STATE-BASED YES/NO CONFIRMATION */}
          {isMatchStarted && gameStatus === 'active' && !isSpectator && (() => {
            const playingColorForButtons = mode === 'local' ? chess.turn() : (resolvedPlayerColor || 'w');
            const colorLabel = playingColorForButtons === 'w' ? 'WHITE' : 'BLACK';
            
            return (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in duration-205">
                {activeMatchAction === 'none' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setActiveMatchAction('leave');
                      }}
                      className="bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white font-bold py-2.5 px-4 rounded-xl border border-neutral-750 cursor-pointer flex items-center justify-center gap-2 text-2xs uppercase tracking-wider transition-all"
                    >
                      🚪 LEAVE GAME ({colorLabel})
                    </button>
                    <button
                      onClick={() => {
                        setActiveMatchAction('resign');
                      }}
                      className="bg-red-955/45 hover:bg-red-900/65 text-red-500 hover:text-red-400 font-bold py-2.5 px-4 rounded-xl border border-red-900/40 cursor-pointer flex items-center justify-center gap-2 text-2xs uppercase tracking-wider transition-all"
                    >
                      🏳️ RESIGN ({colorLabel})
                    </button>
                  </div>
                ) : activeMatchAction === 'resign' ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center animate-in zoom-in-95 duration-150 space-y-3">
                    <p className="text-2xs font-bold text-red-400">
                      ⚠️ Resign as {colorLabel}? Opponent wins and you lose 10 ELO.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setActiveMatchAction('none');
                          handleResign(true);
                        }}
                        className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-3xs uppercase tracking-wider cursor-pointer shadow-sm"
                      >
                        Yes, Resign ({colorLabel})
                      </button>
                      <button
                        onClick={() => setActiveMatchAction('none')}
                        className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-lg text-3xs uppercase tracking-wider cursor-pointer border border-neutral-700"
                      >
                        No, Keep Playing
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center animate-in zoom-in-95 duration-150 space-y-3">
                    <p className="text-2xs font-bold text-amber-400">
                      ⚠️ Abandon & Leave as {colorLabel}? This counts as forfeit (-10 ELO).
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setActiveMatchAction('none');
                          handleQuit(true);
                        }}
                        className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold rounded-lg text-3xs uppercase tracking-wider cursor-pointer shadow-sm"
                      >
                        Yes, Leave ({colorLabel})
                      </button>
                      <button
                        onClick={() => setActiveMatchAction('none')}
                        className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-lg text-3xs uppercase tracking-wider cursor-pointer border border-neutral-700"
                      >
                        No, Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}



          {/* DAILY CHALLENGE SCOREBOARD PANEL */}
          {mode === 'daily' && (
            <div id="daily_scoreboard_panel" className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-xs font-black text-neutral-850 dark:text-white uppercase tracking-wider">DAILY BOARD SPEEDRUN</h4>
                    <p className="text-[10px] text-neutral-400 font-mono font-bold uppercase">FASTEST SOLVERS WORLDWIDE</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[14px] font-sans font-black text-amber-500">⏱️ {puzzleTime}s</span>
                  <p className="text-[9px] text-neutral-450 block font-mono uppercase mt-0.5">Your Active Timer</p>
                </div>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {dailyScores.length === 0 ? (
                  <div className="text-center py-6 text-neutral-450">
                    <Trophy className="w-6 h-6 text-neutral-300 mx-auto opacity-40 mb-1.5" />
                    <p className="text-xs font-bold text-neutral-705">No submissions yet today</p>
                    <p className="text-5xs font-mono uppercase mt-0.5">Solve the puzzle above to claim your spot!</p>
                  </div>
                ) : (
                  dailyScores.map((score, idx) => {
                    const isBest = idx === 0;
                    return (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isBest 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold'
                            : 'bg-neutral-50 dark:bg-neutral-950/60 border-neutral-150 dark:border-neutral-850'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                            idx === 0 ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-150 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block font-sans">{score.fullName}</span>
                            <span className="text-5xs font-mono text-neutral-400 uppercase tracking-wide">@{score.username || 'puzzler'} • {score.solvedAt}</span>
                          </div>
                        </div>
                        <div className="text-right font-mono font-black text-xs">
                          ⏱️ {score.timeTaken}s
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Interactive Game Status alerts & Modal Resolution Popup */}
          {gameStatus !== 'active' && (
            <div className="space-y-4">
              <div className="p-5 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase flex items-center gap-2">
                    <span>⚔️ Game Resolved: {gameStatus.toUpperCase()}</span>
                    <span className="px-2 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold animate-pulse">MATCH ENDED</span>
                  </h4>
                  <p className="text-2xs text-neutral-600 dark:text-neutral-400 mt-1">
                    {winner === 'w' 
                      ? 'White won! Exceptional play.' 
                      : winner === 'b' 
                        ? 'Black won! Deep strategy prevailed.' 
                        : 'Match drawn.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setModalDismissed(false);
                      setShowMatchEndModal(true);
                    }}
                    className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-655 dark:text-amber-400 font-extrabold text-2xs uppercase tracking-wide rounded-xl cursor-pointer transition-colors"
                  >
                    View Match Stats Summary
                  </button>
                  <button
                    onClick={resetGame}
                    className="px-4 py-2 bg-neutral-950 dark:bg-amber-500 text-amber-300 dark:text-neutral-950 hover:bg-neutral-800 font-extrabold text-2xs uppercase tracking-wide rounded-xl cursor-pointer"
                  >
                    Rematch
                  </button>
                </div>
              </div>

              {/* Quit Match Warning Confirmation Modal */}
              {showQuitConfirmModal && (
                <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center z-[110] px-4 animate-in fade-in duration-300">
                  <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl z-[111] text-center space-y-5 animate-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 dark:bg-red-500/15 flex items-center justify-center text-red-500 text-2xl shadow-sm border border-red-500/20">
                      ⚠️
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-neutral-850 dark:text-white uppercase tracking-wider">Confirm Quit</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed dark:text-neutral-450">
                        Are you sure you want to quit? Leaving the match now will record a resignation/forfeit.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                       <button
                        onClick={() => {
                          setShowQuitConfirmModal(false);
                          
                          // 1. Live stream band karo
                          if (socket && liveGameId) {
                            socket.emit('end_stream', liveGameId);
                          }
                          
                          // 2. Perform resignation / quit logic
                          if (pendingQuitAction) {
                            pendingQuitAction();
                            setPendingQuitAction(null);
                          } else {
                            handleResign();
                            setIsMatchStarted(false);
                          }
                          
                          // 3. Keep them in the Arena section of the game lobby rather than navigating them away
                          if (onNavigateSection) {
                            onNavigateSection('arena');
                          }
                        }}
                        className="py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-2xs font-extrabold uppercase tracking-wide cursor-pointer transition-all shadow-md shadow-red-500/15 text-center"
                      >
                        Yes, Quit
                      </button>
                      <button
                        onClick={() => {
                          setShowQuitConfirmModal(false);
                          setPendingQuitAction(null);
                        }}
                        className="py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 rounded-xl text-2xs font-extrabold uppercase tracking-wide cursor-pointer transition-all text-center border border-neutral-200 dark:border-neutral-700/50"
                      >
                        No, Play
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Popup Modal dialog for Match Summary */}
              {showMatchEndModal && !modalDismissed && gameOutcomeDetails && (
                <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center z-[100] px-4 animate-in fade-in duration-300">
                  
                  {/* Confetti element overlays for clean rewarding wins */}
                  {gameOutcomeDetails.result === 'win' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[101]">
                      {Array.from({ length: 45 }).map((_, i) => {
                        const left = `${Math.random() * 100}%`;
                        const delay = `${Math.random() * 5}s`;
                        const size = `${Math.random() * 10 + 6}px`;
                        const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        return (
                          <div 
                            key={i}
                            className="animate-confetti-piece fixed top-0 pointer-events-none"
                            style={{
                              left,
                              animationDelay: delay,
                              width: size,
                              height: size,
                              backgroundColor: color,
                              borderRadius: Math.random() < 0.5 ? '50%' : '2px',
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Modal Panel container */}
                  <div 
                    className={`relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl z-[102] ${
                      gameOutcomeDetails.result === 'loss' ? 'animate-shake-modal' : 'animate-in zoom-in-95 duration-200'
                    }`}
                    style={{ position: 'relative' }}
                  >
                    {/* Corner close button */}
                    <button
                      onClick={() => {
                        setShowMatchEndModal(false);
                        setModalDismissed(true);
                      }}
                      className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm font-bold w-7 h-7 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ✕
                    </button>

                    <div className="text-center space-y-4">
                      {/* Big Animated Icon representing user status */}
                      <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center text-4xl shadow-sm border border-amber-500/20">
                        {gameOutcomeDetails.iconEmoji}
                      </div>

                      <div className="space-y-1">
                        <span className="text-5xs font-mono uppercase text-neutral-400 tracking-extrawide">Match Outcome</span>
                        <h3 className="text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-50 uppercase leading-none">
                          {gameOutcomeDetails.title}
                        </h3>
                        <p className="text-3xs text-neutral-500 dark:text-neutral-400 font-mono mt-1">
                          Opponent Rank Status: Level AI 
                        </p>
                      </div>

                      {/* ELO calculations summary display */}
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-950/60 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/80 text-left space-y-3 font-mono">
                        <div className="flex justify-between items-center text-3xs">
                          <span className="text-neutral-400 uppercase">Starting Rating</span>
                          <span className="font-bold text-neutral-600 dark:text-neutral-300">
                            {currentUser.eloRating || 1000} ELO
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-3xs border-t border-neutral-200/30 dark:border-neutral-800/30 pt-2.5">
                          <span className="text-neutral-400 uppercase">Points Type</span>
                          <span className={`font-black uppercase flex items-center gap-1 text-[11px] ${
                            gameOutcomeDetails.result === 'win' 
                              ? 'text-emerald-500' 
                              : gameOutcomeDetails.result === 'loss' 
                                ? 'text-red-500' 
                                : 'text-neutral-400'
                          }`}>
                            {gameOutcomeDetails.result === 'win' ? `+30 (Checkmate/Underdog Bonus)` : gameOutcomeDetails.result === 'loss' ? '-20 ELO' : '0 ELO (Constant)'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-3xs border-t border-neutral-200/30 dark:border-neutral-800/30 pt-2.5">
                          <span className="text-amber-500 uppercase font-black">Adjusted Rating</span>
                          <span className="font-black text-amber-500 text-xs">
                            {gameOutcomeDetails.result === 'win' 
                              ? Math.max(800, (currentUser.eloRating || 1000) + 30) 
                              : gameOutcomeDetails.result === 'loss' 
                                ? Math.max(800, (currentUser.eloRating || 1000) - 20) 
                                : Math.max(800, currentUser.eloRating || 1000)} ELO
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic details */}
                      <div className="text-left space-y-1 bg-neutral-50/50 dark:bg-neutral-955 p-3 rounded-xl text-[10px] text-neutral-505 dark:text-neutral-404 leading-relaxed font-sans">
                        <p>💡 <span className="font-bold">Checkmate Victory Bonus:</span> +5 ELO points change accrued automatically on checkmates.</p>
                        <p>💡 <span className="font-bold">Underdog bonus:</span> +3 ELO adjustments applied for victory over high ratings.</p>
                      </div>

                      {/* Modal Footer Controls */}
                      <div className="grid grid-cols-1 gap-2 pt-2">
                        <button
                          onClick={resetGame}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 dark:text-neutral-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          ⚔️ Rematch Game
                        </button>

                        {/* WhatsApp share & copy option */}
                        <div className="bg-neutral-50 dark:bg-neutral-950/60 p-3 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-neutral-450 dark:text-neutral-400">⚡ Share Achievement</span>
                            <span className="text-[9px] text-amber-500 font-mono font-bold">PROMOTION BONUS</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleShareOutcome('whatsapp')}
                              className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-955 dark:text-neutral-955 font-extrabold text-[11px] uppercase tracking-wide rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-all"
                            >
                              💬 WhatsApp
                            </button>
                            
                            <button
                              onClick={() => handleShareOutcome('copy')}
                              className={`py-2 px-3 rounded-xl text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-1 cursor-pointer border transition-all ${
                                copiedMatchText 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                                  : 'bg-neutral-100 hover:bg-neutral-250 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 border-neutral-250 dark:border-neutral-700'
                              }`}
                            >
                              {copiedMatchText ? <Check className="w-3.5 h-3.5 animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedMatchText ? 'Copied!' : 'Copy Link'}
                            </button>
                          </div>

                          <div className="flex items-center justify-center gap-3 pt-0.5 border-t border-neutral-200/20 dark:border-neutral-800/20">
                            <span className="text-[9px] text-neutral-400 uppercase">Other:</span>
                            <button
                              onClick={() => handleShareOutcome('twitter')}
                              className="p-1 hover:text-sky-400 transition-colors cursor-pointer text-neutral-505 flex items-center gap-1"
                              title="Share on Twitter"
                            >
                              <Twitter className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold">X</span>
                            </button>
                            <button
                              onClick={() => handleShareOutcome('facebook')}
                              className="p-1 hover:text-blue-500 transition-colors cursor-pointer text-neutral-505 flex items-center gap-1"
                              title="Share on Facebook"
                            >
                              <Facebook className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold">Facebook</span>
                            </button>
                            <button
                              onClick={() => handleShareOutcome('native')}
                              className="p-1 hover:text-amber-500 transition-colors cursor-pointer text-neutral-550 flex items-center gap-1"
                              title="System Share"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold">System</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={downloadPgnFile}
                            className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 rounded-xl text-3xs font-extrabold uppercase flex items-center justify-center gap-1.5 border border-neutral-200/50 dark:border-neutral-700/50 cursor-pointer"
                          >
                            💾 Save PGN
                          </button>
                          
                          <button
                            onClick={() => {
                              setShowMatchEndModal(false);
                              setModalDismissed(true);
                            }}
                            className="py-2.5 px-3 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-white rounded-xl text-3xs font-extrabold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            ↩️ View Board
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE TOURNAMENT PAIRING CENTER MODAL */}
              {showTournamentModal && (
                <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center z-[120] px-4 animate-in fade-in duration-350 overflow-y-auto">
                  <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-3xl shadow-2xl p-6 md:p-8 my-8 text-neutral-800 dark:text-neutral-100 max-h-[90vh] overflow-y-auto space-y-6">
                    
                    {/* Header Banner */}
                    <div className="text-center relative">
                      <button
                        onClick={() => setShowTournamentModal(false)}
                        className="absolute -top-2 -right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm font-bold w-7 h-7 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                      >
                        ✕
                      </button>
                      <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl mb-3 text-amber-500">
                        <Crown className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center justify-center gap-2">
                        <span>🏆 Tournament Matchmaker & Pairing Center</span>
                      </h3>
                      <p className="text-4xs font-mono uppercase tracking-widest text-[#f59e0b] mt-1.5 font-extrabold">
                        Dynamic Competitive Cohort Auto-Matcher
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left Side Column: Candidate Registration Form & Active Roster */}
                      <div className="lg:col-span-5 space-y-5 bg-neutral-50/50 dark:bg-neutral-955 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800/60">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-850 dark:text-neutral-200 flex items-center gap-1.5 pb-2 border-b border-neutral-200/55 dark:border-neutral-805">
                            <Plus className="w-4 h-4 text-amber-500" />
                            Enroll Participant
                          </h4>
                          <p className="text-5xs text-neutral-450 mt-1">Enroll player candidates to generate priority group pairings</p>
                        </div>

                        <div className="space-y-3.5 text-left">
                          {/* Player Name */}
                          <div className="space-y-1">
                            <label className="block text-5xs font-mono uppercase text-neutral-450 font-extrabold tracking-wide">Player Full Name *</label>
                            <input
                              type="text"
                              value={newCandidateName}
                              onChange={(e) => setNewCandidateName(e.target.value)}
                              placeholder="e.g. Priyanshu Sharma"
                              className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-805 rounded-xl p-2.5 outline-none font-medium focus:border-amber-500 transition-colors"
                            />
                          </div>

                          {/* Level Cohort Group selection */}
                          <div className="space-y-1">
                            <label className="block text-5xs font-mono uppercase text-neutral-450 font-extrabold tracking-wide">Player Category / Level</label>
                            <div className="grid grid-cols-3 gap-1.5 pt-1">
                              {[
                                { value: 'class', label: 'Class', note: 'Class level' },
                                { value: 'school', label: 'School', note: 'School level' },
                                { value: 'college', label: 'College', note: 'College level' }
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setNewCandidateType(opt.value as any)}
                                  className={`p-2 rounded-xl border text-[10px] font-black uppercase text-center cursor-pointer transition-all ${
                                    newCandidateType === opt.value
                                      ? 'bg-neutral-950 dark:bg-amber-500 text-amber-500 dark:text-neutral-950 border-neutral-950 dark:border-amber-500'
                                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-50/50'
                                  }`}
                                >
                                  <div>{opt.label}</div>
                                  <div className="text-[7.5px] lowercase font-normal opacity-75">{opt.note}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Affiliation input */}
                          <div className="space-y-1">
                            <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wide">Institutional Group / Affiliation</label>
                            <input
                              type="text"
                              value={newCandidateAffiliation}
                              onChange={(e) => setNewCandidateAffiliation(e.target.value)}
                              placeholder={
                                newCandidateType === 'class' ? 'e.g. Class 12-A' :
                                newCandidateType === 'school' ? 'e.g. St. Peter Public School' :
                                'e.g. Imperial Science Institute'
                              }
                              className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-805 rounded-xl p-2.5 outline-none font-medium focus:border-amber-500 transition-colors"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!newCandidateName.trim()) return;
                              const newC = {
                                id: 'c_' + Date.now().toString(36),
                                name: newCandidateName.trim(),
                                type: newCandidateType,
                                affiliation: newCandidateAffiliation.trim() || (newCandidateType === 'class' ? 'Class Level' : newCandidateType === 'school' ? 'School Level' : 'College Level')
                              };
                              setTournamentCandidates(prev => [...prev, newC]);
                              setNewCandidateName('');
                              setNewCandidateAffiliation('');
                            }}
                            className="w-full py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-neutral-905 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Register Entrant
                          </button>
                        </div>

                        {/* Registered Roster */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-4xs font-mono uppercase text-[#9ca3af] mb-2 font-bold">
                            <span>Participating Field</span>
                            <span className="font-bold text-[#f59e0b] bg-[#f59e0b]/10 px-2.5 py-0.5 rounded-full">{tournamentCandidates.length} Active Players</span>
                          </div>
                          
                          <div className="max-h-[180px] overflow-y-auto divide-y divide-neutral-200/50 dark:divide-neutral-805 space-y-1.5 pr-1 font-sans">
                            {tournamentCandidates.map((c) => (
                              <div key={c.id} className="flex items-center justify-between py-1.5 first:pt-0">
                                <div className="text-left">
                                  <div className="text-[11px] font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 leading-none">
                                    {c.name}
                                    <span className={`px-1.5 py-px rounded-full font-mono text-[7px] uppercase font-bold tracking-wider leading-none ${
                                      c.type === 'class' ? 'bg-indigo-500/10 text-indigo-400' :
                                      c.type === 'school' ? 'bg-sky-500/10 text-sky-400' :
                                      'bg-emerald-500/10 text-emerald-400'
                                    }`}>
                                      {c.type}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-[#9ca3af] mt-1 font-semibold">{c.affiliation}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setTournamentCandidates(prev => prev.filter(item => item.id !== c.id))}
                                  className="text-neutral-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            {tournamentCandidates.length === 0 && (
                              <p className="text-[10px] text-neutral-400 italic text-center py-4">No candidates registered. Create above!</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side Column: Dynamically Computed Priority Matches */}
                      <div className="lg:col-span-7 space-y-5">
                        
                        {/* Interactive Queue Strategy Guide */}
                        <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-2xl space-y-1.5 text-left leading-relaxed">
                          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                            ⚙️ ENTRANT MATCHMAKER SORTING CRITERIA
                          </span>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-405">
                            Our automatic matcher computes the draw based on structured candidate constraints to maximize competitive balance. The priority queue executes pairing matching in this specific preference order:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-mono text-[9px] uppercase font-bold text-center">
                            <div className="bg-white dark:bg-neutral-950 p-2 rounded-xl border border-neutral-200 dark:border-neutral-805 text-indigo-500">
                              <span className="text-neutral-400 block text-[7px] font-black">Group 1 Priority</span> a. Class vs Class
                            </div>
                            <div className="bg-white dark:bg-neutral-955 p-2 rounded-xl border border-neutral-200 dark:border-neutral-805 text-sky-400">
                              <span className="text-neutral-400 block text-[7px] font-black">Group 2 Priority</span> b. Class vs School
                            </div>
                            <div className="bg-white dark:bg-neutral-955 p-2 rounded-xl border border-neutral-200 dark:border-neutral-805 text-emerald-400">
                              <span className="text-neutral-400 block text-[7px] font-black">Group 3 Priority</span> c. School vs College
                            </div>
                          </div>
                        </div>

                        {/* MATCH LIST SECTION */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-850 dark:text-neutral-200 flex items-center gap-1.5 pb-2 border-b border-neutral-200/50 dark:border-neutral-805 justify-between">
                            <span className="flex items-center gap-1.5">
                              <Swords className="w-4 h-4 text-[#f59e0b]" />
                              Generated Dynamic Match Brackets
                            </span>
                            <span className="font-mono text-5xs bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full font-bold">SYSTEM ACTIVE</span>
                          </h4>

                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                            {(() => {
                              // Perform matcher priorities partition
                              let classPool = [...tournamentCandidates.filter(c => c.type === 'class')];
                              let schoolPool = [...tournamentCandidates.filter(c => c.type === 'school')];
                              let collegePool = [...tournamentCandidates.filter(c => c.type === 'college')];

                              const priorityAMatches: any[] = [];
                              const priorityBMatches: any[] = [];
                              const priorityCMatches: any[] = [];
                              const leftoverMatches: any[] = [];
                              let byeCandidate: any = null;

                              // Preference A: Class vs Class
                              while (classPool.length >= 2) {
                                const p1 = classPool.shift();
                                const p2 = classPool.shift();
                                priorityAMatches.push({ p1, p2 });
                              }

                              // Preference B: Class vs School
                              while (classPool.length >= 1 && schoolPool.length >= 1) {
                                const p1 = classPool.shift();
                                const p2 = schoolPool.shift();
                                priorityBMatches.push({ p1, p2 });
                              }

                              // Preference C: School vs College
                              while (schoolPool.length >= 1 && collegePool.length >= 1) {
                                const p1 = schoolPool.shift();
                                const p2 = collegePool.shift();
                                priorityCMatches.push({ p1, p2 });
                              }

                              // Leftovers
                              const leftovers = [...classPool, ...schoolPool, ...collegePool];
                              while (leftovers.length >= 2) {
                                const p1 = leftovers.shift();
                                const p2 = leftovers.shift();
                                leftoverMatches.push({ p1, p2 });
                              }

                              if (leftovers.length === 1) {
                                byeCandidate = leftovers.shift();
                              }

                              const totalComp = priorityAMatches.length + priorityBMatches.length + priorityCMatches.length + leftoverMatches.length;

                              if (totalComp === 0 && !byeCandidate) {
                                return (
                                  <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-neutral-805 rounded-2xl bg-neutral-50/20">
                                    <p className="text-2xs text-neutral-400 italic">No pairings generated yet. Enroll class / school / college players on the left panel to populate matches!</p>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-4">
                                  {/* Preference A */}
                                  {priorityAMatches.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wide uppercase text-indigo-500">
                                        <span>🌟 a. Class vs Class Matches</span>
                                        <span className="text-[8px] bg-indigo-500/10 px-2 py-0.5 rounded-full font-black">Group A</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                                        {priorityAMatches.map((m, idx) => (
                                          <div key={idx} className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1 relative">
                                            <div className="flex justify-between items-center text-[11px] font-bold">
                                              <span>{m.p1.name}</span>
                                              <span className="text-indigo-400 text-4xs font-mono">VS</span>
                                              <span>{m.p2.name}</span>
                                            </div>
                                            <div className="flex justify-between text-[8px] text-[#9ca3af] font-mono leading-none">
                                              <span>{m.p1.affiliation}</span>
                                              <span>{m.p2.affiliation}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Preference B */}
                                  {priorityBMatches.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wide uppercase text-sky-400">
                                        <span>🏫 b. Class vs School Matches</span>
                                        <span className="text-[8px] bg-sky-500/10 px-2 py-0.5 rounded-full font-black">Group B</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                                        {priorityBMatches.map((m, idx) => (
                                          <div key={idx} className="p-3 bg-sky-500/5 border border-sky-500/10 rounded-xl space-y-1 relative">
                                            <div className="flex justify-between items-center text-[11px] font-bold">
                                              <span>{m.p1.name}</span>
                                              <span className="text-sky-400 text-4xs font-mono">VS</span>
                                              <span>{m.p2.name}</span>
                                            </div>
                                            <div className="flex justify-between text-[8px] text-[#9ca3af] font-mono leading-none">
                                              <span>{m.p1.affiliation}</span>
                                              <span>{m.p2.affiliation}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Preference C */}
                                  {priorityCMatches.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wide uppercase text-emerald-400">
                                        <span>🎓 c. School vs College Matches</span>
                                        <span className="text-[8px] bg-emerald-500/10 px-2 py-0.5 rounded-full font-black">Group C</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                                        {priorityCMatches.map((m, idx) => (
                                          <div key={idx} className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1 relative">
                                            <div className="flex justify-between items-center text-[11px] font-bold">
                                              <span>{m.p1.name}</span>
                                              <span className="text-emerald-400 text-4xs font-mono">VS</span>
                                              <span>{m.p2.name}</span>
                                            </div>
                                            <div className="flex justify-between text-[8px] text-[#9ca3af] font-mono leading-none">
                                              <span>{m.p1.affiliation}</span>
                                              <span>{m.p2.affiliation}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Leftovers matches */}
                                  {leftoverMatches.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wide uppercase text-neutral-400">
                                        <span>⚙️ General pairings / Leftover Matches</span>
                                        <span className="text-[8px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full font-black">Standard pool</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                                        {leftoverMatches.map((m, idx) => (
                                          <div key={idx} className="p-3 bg-neutral-100/30 dark:bg-neutral-805 border border-neutral-200 dark:border-neutral-805 rounded-xl space-y-1 relative">
                                            <div className="flex justify-between items-center text-[11px] font-bold">
                                              <span>{m.p1.name}</span>
                                              <span className="text-neutral-400 text-4xs font-mono">VS</span>
                                              <span>{m.p2.name}</span>
                                            </div>
                                            <div className="flex justify-between text-[8px] text-[#9ca3af] font-mono leading-none">
                                              <span>{m.p1.affiliation} ({m.p1.type})</span>
                                              <span>{m.p2.affiliation} ({m.p2.type})</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Bye Entry */}
                                  {byeCandidate && (
                                    <div className="p-3 border border-dashed border-amber-500/20 bg-amber-500/5 rounded-xl text-left">
                                      <span className="text-[9px] font-mono uppercase font-black text-amber-500 block mb-0.5">🎰 Bye Entrant (Odd Pool Count)</span>
                                      <div className="text-[11px] font-bold">{byeCandidate.name} ({byeCandidate.affiliation})</div>
                                      <span className="text-[8.5px] text-neutral-400 mt-1 block leading-tight">Gets an automatic bye directly to progress to the next round of tournament play!</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              // Reset to pre-made complete sample set
                              setTournamentCandidates([
                                { id: 'c1', name: 'Aarav Sharma', type: 'class', affiliation: 'Class 12-A' },
                                { id: 'c2', name: 'Ishaan Patel', type: 'class', affiliation: 'Class 12-B' },
                                { id: 'c3', name: 'Rohan Gupta', type: 'class', affiliation: 'Class 10-A' },
                                { id: 'c4', name: 'Priya Mehta', type: 'school', affiliation: 'Sunrise Public Secondary' },
                                { id: 'c5', name: 'Kabir Singh', type: 'school', affiliation: 'Green Valley Senior Academy' },
                                { id: 'c6', name: 'Aditi Roy', type: 'college', affiliation: 'National Science College' },
                                { id: 'c7', name: 'Vikram Malhotra', type: 'class', affiliation: 'Class 10-C' },
                                { id: 'c8', name: 'Siddharth Verma', type: 'class', affiliation: 'Class 12-C' },
                                { id: 'c9', name: 'Ananya Mishra', type: 'school', affiliation: 'Baldwin High School' },
                                { id: 'c10', name: 'Tanya Sen', type: 'college', affiliation: 'St. Xavier\'s College' }
                              ]);
                            }}
                            className="py-2.5 bg-neutral-100 hover:bg-neutral-205 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 font-extrabold text-2xs uppercase tracking-widest rounded-xl transition-all border border-neutral-200 dark:border-neutral-700 cursor-pointer text-center"
                          >
                            🔄 Reset Sample Field
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              // Retrieve first pair matching the rules
                              let classPool = [...tournamentCandidates.filter(c => c.type === 'class')];
                              let schoolPool = [...tournamentCandidates.filter(c => c.type === 'school')];
                              let collegePool = [...tournamentCandidates.filter(c => c.type === 'college')];

                              let firstMatch: any = null;
                              
                              if (classPool.length >= 2) {
                                firstMatch = { p1: classPool[0], p2: classPool[1], level: 'Class vs Class Pair' };
                              } else if (classPool.length >= 1 && schoolPool.length >= 1) {
                                firstMatch = { p1: classPool[0], p2: schoolPool[0], level: 'Class vs School Pair' };
                              } else if (schoolPool.length >= 1 && collegePool.length >= 1) {
                                firstMatch = { p1: schoolPool[0], p2: collegePool[0], level: 'School vs College Pair' };
                              } else {
                                const leftovers = [...classPool, ...schoolPool, ...collegePool];
                                if (leftovers.length >= 2) {
                                  firstMatch = { p1: leftovers[0], p2: leftovers[1], level: 'Leftover Pair' };
                                }
                              }

                              if (firstMatch) {
                                const freshChess = new Chess();
                                setChess(freshChess);
                                setMovesList([]);
                                setActiveMoveIdx(-1);
                                setGameStatus('active');
                                setWinner(null);
                                setIsMatchStarted(true);
                                setTournamentFeedback(`🏆 TOURNAMENT ENGAGED: ${firstMatch.p1.name} [${firstMatch.p1.affiliation}] vs ${firstMatch.p2.name} [${firstMatch.p2.affiliation}] (${firstMatch.level})`);
                              } else {
                                setTournamentFeedback(`⚠️ Not enough candidates to play round. Please enroll at least 2 participants!`);
                              }
                              
                              setShowTournamentModal(false);
                            }}
                            className="py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-neutral-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            ⚔️ Begin Match Round
                          </button>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* Puzzle panel logic */}
          {(mode === 'puzzle' || mode === 'daily') && (
            <div className="p-4 rounded-2xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <Award className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h5 className="text-4xs font-mono uppercase text-neutral-400">Puzzle Target: {activePuzzle.title}</h5>
                  <p className="text-xs font-bold leading-relaxed">{puzzleFeedback.text || `Objective: ${activePuzzle.description}`}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!showHint) {
                      setPuzzleHintsCount((c) => c + 1);
                    }
                    setShowHint((s) => !s);
                  }}
                  className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-3xs font-bold rounded-lg cursor-pointer hover:bg-amber-500/20"
                >
                  {showHint ? 'Hide Hint' : 'Reveal Hint'}
                </button>

                <button
                  onClick={() => {
                    const randomIndex = Math.floor(Math.random() * CHESS_PUZZLES.length);
                    startPuzzle(randomIndex);
                  }}
                  className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-805 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 text-3xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                >
                  <span>Random Level 🎲</span>
                </button>
              </div>
              {showHint && (
                <p className="text-3xs italic text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/10">💡 Hint: {activePuzzle.hint}</p>
              )}
            </div>
          )}

        </div>

        {/* Right Cockpit controls: Width 5 */}
        <div className={`${isMatchActive ? 'hidden md:block' : 'w-full md:max-w-[400px]'} space-y-6 flex-1 xl:max-w-[400px]`}>
          
          <div className="space-y-6">


            {/* Play Modes Selector */}
            <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm ${isMatchStarted ? 'hidden' : ''}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-3">
                <Swords className="w-4 h-4" />
                Select Mode
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                {[
                  { name: 'Local', value: 'local', icon: Swords },
                  { name: 'VS Bot', value: 'ai', icon: Bot },
                  { name: 'Online PvP', value: 'online', icon: Globe },
                  { name: 'Tournament', value: 'tournament', icon: Crown },
                  { name: 'Inf Puzzles', value: 'puzzle', icon: Award },
                  { name: 'Daily Quiz', value: 'daily', icon: Trophy },
                ].map((item) => {
                  const isActive = mode === item.value;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      onClick={() => selectGameMode(item.value as GameMode)}
                      className={`p-2 py-3 rounded-xl flex flex-col items-center text-center gap-1 border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-neutral-950 dark:bg-amber-500 text-amber-400 dark:text-neutral-950 border-neutral-950'
                          : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-0.5" />
                      <span className="text-[10px] font-black uppercase whitespace-nowrap">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Broadcast Sharing & Watch Center */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800 pb-1.5 justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  LIVE BROADCAST SYSTEM
                </span>
                {liveGameId && gameStatus === 'active' && (
                  <span className="live-tag">
                    LIVE
                  </span>
                )}
              </h3>

              {liveGameId && gameStatus === 'active' && mode !== 'puzzle' ? (
                // IF PLAYING: SHOW SHARE SHIELD
                <div className="space-y-2.5">
                  <p className="text-[11px] text-neutral-500 leading-relaxed dark:text-neutral-400">
                    Your current game is being broadcast live to the academy! Share this stream with parents, fans, and coaches so they can watch in real-time.
                  </p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/live/${liveGameId}`}
                      className="grow bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-600 dark:text-neutral-400 outline-none select-all"
                    />
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/live/${liveGameId}`;
                        navigator.clipboard.writeText(link);
                        const btn = document.getElementById(`share-copy-btn-${liveGameId}`);
                        if (btn) {
                          const oldHTML = btn.innerHTML;
                          btn.innerHTML = `<span class="text-3xs font-black uppercase text-emerald-500">COPIED!</span>`;
                          setTimeout(() => { btn.innerHTML = oldHTML; }, 2000);
                        }
                      }}
                      id={`share-copy-btn-${liveGameId}`}
                      className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-950 dark:bg-amber-500 dark:hover:bg-amber-600 dark:border-amber-500 text-amber-500 dark:text-neutral-950 font-black text-3xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[76px]"
                    >
                      COPY LINK
                    </button>
                  </div>
                </div>
              ) : (
                // IF NOT PLAYING: SHOW ACTIVE BRANDS STREAMS
                <div className="space-y-2.5">
                  <p className="text-[11px] text-neutral-500 leading-relaxed dark:text-neutral-400">
                    You are not currently streaming. Browse live matches happening in the academy right now:
                  </p>

                  {availableLiveGames.length === 0 ? (
                    <div className="text-center py-5 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20">
                      <p className="text-[11px] text-neutral-400 italic">No other players are broadcasting currently.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {availableLiveGames.map((g) => (
                        <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 text-neutral-800 dark:text-neutral-200">
                          <div className="space-y-0.5 text-left">
                            <p className="text-[11px] font-bold tracking-tight">
                              {g.whitePlayer} <span className="text-neutral-400 font-normal">vs</span> {g.blackPlayer}
                            </p>
                            <p className="text-[9px] font-mono text-neutral-400">
                              {g.academyName || "Sumeet Rasela Academy"}
                            </p>
                          </div>
                          <button
                            onClick={() => window.open(`/live/${g.id}`, '_blank')}
                            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1 shrink-0"
                          >
                            <span>👁</span> WATCH
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Settings Configuration */}
            <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm space-y-4 ${isMatchStarted ? 'hidden' : ''}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4" />
                Match Settings
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-4xs font-mono uppercase text-neutral-400">Board Board Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value as BoardTheme }))}
                    className="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 rounded-lg p-2 outline-none"
                  >
                    <option value="emerald">Emerald Forest</option>
                    <option value="wood">Golden Mahogany</option>
                    <option value="slate">Carbon Slate</option>
                    <option value="royal">Royal Cobalt</option>
                  </select>
                </div>

                {mode !== 'puzzle' && (
                  <div className="space-y-1">
                    <label className="text-4xs font-mono uppercase text-neutral-400">Match Clock</label>
                    <select
                      value={settings.initialTimeMinutes}
                      onChange={(e) => setSettings((s) => ({ ...s, initialTimeMinutes: parseInt(e.target.value) }))}
                      className="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 rounded-lg p-2 outline-none"
                    >
                      <option value="1">Bullet (1m)</option>
                      <option value="3">Blitz (3m)</option>
                      <option value="5">Blitz (5m)</option>
                      <option value="10">Rapid (10m)</option>
                      <option value="0">Casual Play</option>
                    </select>
                  </div>
                )}

                {mode === 'ai' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-4xs font-mono uppercase text-neutral-400">Engine Difficulty</label>
                      <select
                        value={settings.engineDifficulty}
                        onChange={(e) => setSettings((s) => ({ ...s, engineDifficulty: e.target.value as AIDifficulty }))}
                        className="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 rounded-lg p-2.5 outline-none transition-all hover:border-amber-500/55 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 dark:hover:border-amber-500/40 cursor-pointer"
                      >
                        <option value="novice">Level 1: Novice</option>
                        <option value="casual">Level 2: Casual</option>
                        <option value="intermediate">Level 3: Intermediate</option>
                        <option value="advanced">Level 4: Advanced</option>
                        <option value="master">Level 5: Master</option>
                        <option value="grandmaster">Level 6: Grandmaster 👑</option>
                        <option value="world_champion">Level 7: World Champion 🏆</option>
                        <option value="super_grandmaster">Level 8: Super Grandmaster 🥇</option>
                        <option value="stockfish_god">Level 9: Chess Engine God ⚡</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-4xs font-mono uppercase text-neutral-400">Your Color</label>
                      <select
                        value={settings.playerColor}
                        onChange={(e) => {
                          const col = e.target.value as 'w' | 'b' | 'random';
                          setSettings((s) => ({ ...s, playerColor: col }));
                          let activeColor: 'w' | 'b' = col === 'random'
                            ? (Math.random() < 0.5 ? 'w' : 'b')
                            : col;
                          setResolvedPlayerColor(activeColor);
                          setIsFlipped(activeColor === 'b');
                        }}
                        className="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 rounded-lg p-2 outline-none"
                      >
                        <option value="w">White</option>
                        <option value="b">Black</option>
                        <option value="random">Random</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                <button
                  id="startMatch"
                  disabled={matchStarted}
                  onClick={handleStartPlay}
                  className={`w-full py-2.5 px-4 font-black text-2xs uppercase tracking-extrawide rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 transition-all ${
                    matchStarted
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-50'
                      : 'bg-amber-500 hover:bg-amber-600 text-neutral-950 cursor-pointer'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Match</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={resetGame}
                    className="py-1.5 px-3 bg-neutral-100 hover:bg-neutral-250 dark:bg-neutral-950 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-300 rounded-lg text-3xs font-extrabold uppercase flex items-center justify-center gap-1 border border-neutral-200/50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart</span>
                  </button>
                  <button
                    onClick={handleResign}
                    disabled={gameStatus !== 'active' || mode === 'puzzle'}
                    className="py-1.5 px-3 bg-red-100/10 hover:bg-red-500 hover:text-white dark:bg-red-950/15 dark:hover:bg-red-900/60 text-red-650 rounded-lg text-3xs font-extrabold uppercase flex items-center justify-center gap-1 border border-red-500/10 disabled:opacity-30 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Resign</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Puzzles List Drawer */}
            {mode === 'puzzle' && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Puzzles Studio
                  </h3>
                  <button
                    onClick={() => {
                      const randomIndex = Math.floor(Math.random() * CHESS_PUZZLES.length);
                      startPuzzle(randomIndex);
                    }}
                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-black uppercase rounded cursor-pointer transition-colors"
                  >
                    Random 🎲
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {CHESS_PUZZLES.map((puzzle, i) => {
                    const isActive = activePuzzleIdx === i;
                    return (
                      <button
                        key={puzzle.id}
                        onClick={() => startPuzzle(i)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isActive
                            ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-400 scale-[1.01]'
                            : 'bg-neutral-50/50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-850 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div>
                          <h4 className="text-3xs font-black uppercase tracking-tight">{puzzle.title}</h4>
                          <p className="text-5xs font-mono text-neutral-500">{puzzle.category} • {puzzle.difficulty}</p>
                        </div>
                        <span className="text-3xs font-mono px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">Run</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Coach AI Advice Panel */}
            {showMatchArea && (
              <CoachPanel
                currentFen={getDisplayFen()}
                moveHistory={movesList.map((m) => m.san)}
                mode={mode}
                difficulty={settings.initialTimeMinutes > 0 ? `${settings.initialTimeMinutes}m mode` : 'Casual'}
                playerColor={mode === 'ai' ? resolvedPlayerColor : 'w'}
              />
            )}

            {/* Premium Match Live Chat Commentary */}
            {showMatchArea && (onlineMatchId || spectatingGameId || mode === 'online' || isSpectator) && (
              <LiveChat
                matchId={onlineMatchId || spectatingGameId || 'live-arena'}
                username={currentUser?.fullName || currentUser?.username || currentUser?.email || 'GuestPlayer'}
              />
            )}

            {/* Move Logging history board */}
            {showMatchArea && (
              <div className="h-56">
                <MoveLog
                  moves={movesList}
                  activeMoveIndex={activeMoveIdx}
                  onSelectMoveIndex={setActiveMoveIdx}
                />
              </div>
            )}
          </div>

        </div>

      </div>
      );
      })() : (
        <div className="space-y-6">
          {/* STATS CARDS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-5xs font-mono uppercase text-neutral-400 font-bold">Total Games</span>
                <span className="p-1 px-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded text-5xs font-bold">ALL</span>
              </div>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">{totalGames}</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-5xs font-mono uppercase text-neutral-400 font-bold">Wins</span>
                <span className="p-1 px-1.5 bg-emerald-500/10 text-emerald-500 rounded text-5xs font-bold">WIN</span>
              </div>
              <p className="text-xl font-bold text-emerald-500 mt-2">{wins}</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-5xs font-mono uppercase text-neutral-400 font-bold">Losses</span>
                <span className="p-1 px-1.5 bg-red-500/10 text-red-500 rounded text-5xs font-bold">LOST</span>
              </div>
              <p className="text-xl font-bold text-red-500 mt-2">{losses}</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-5xs font-mono uppercase text-neutral-400 font-bold">Win Rate</span>
                <Percent className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-amber-500 mt-2">{winRate}%</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-5xs font-mono uppercase text-neutral-400 font-bold">Highest ELO</span>
                <TrendingUp className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">{highestElo}</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-5xs font-mono uppercase text-neutral-400 font-bold">Current ELO</span>
                <Award className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-amber-500 mt-2">{currentElo}</p>
            </div>
          </div>

          {/* ELO PROGRESS GRAPH */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                ELO Progression (Last 30 Games)
              </h3>
              <p className="text-5xs text-neutral-450 mt-1">Shows real-time rating adjustments over played game sessions</p>
            </div>

            <div className="w-full">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={displayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 50', 'dataMax + 50']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="elo" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorElo)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MATCH HISTORY LIST TABLE */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-500" />
                Game Matchbook History
              </h3>
              <p className="text-5xs text-neutral-450 mt-1">Detailed list of previous standard play sessions</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-950 text-4xs font-mono uppercase text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="p-3.5 pl-5">Date</th>
                    <th className="p-3.5">Opponent</th>
                    <th className="p-3.5">Result</th>
                    <th className="p-3.5">ELO Change</th>
                    <th className="p-3.5 pr-5">New ELO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-2xs text-neutral-400">
                        No matches saved on record yet. Select "Chess Arena" to play your first game.
                      </td>
                    </tr>
                  ) : (
                    matches.map((m) => {
                      const matchDate = new Date(m.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      const isWin = m.result === 'win';
                      const isLoss = m.result === 'loss';
                      
                      return (
                        <tr key={m.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-905 transition-all">
                          <td className="p-3.5 pl-5 font-mono text-3xs text-neutral-400">{matchDate}</td>
                          <td className="p-3.5 font-bold text-neutral-800 dark:text-neutral-200">{m.opponent}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-3xs uppercase tracking-wider ${
                              isWin 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : isLoss 
                                  ? 'bg-red-500/10 text-red-500' 
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                            }`}>
                              {m.result}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-2xs font-bold">
                            <span className={m.eloChange > 0 ? 'text-emerald-500' : m.eloChange < 0 ? 'text-red-500' : 'text-neutral-500'}>
                              {m.eloChange >= 0 ? `+${m.eloChange}` : m.eloChange}
                            </span>
                          </td>
                          <td className="p-3.5 pr-5 font-mono text-2xs font-bold text-neutral-800 dark:text-neutral-100">{m.newElo}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
