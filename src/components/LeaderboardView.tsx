import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Search, 
  Building2, 
  MapPin, 
  X, 
  Zap, 
  ChevronRight, 
  Trophy,
  Crown,
  Globe,
  School,
  Sparkles,
  User,
  Star,
  Share2,
  Copy,
  Check,
  Facebook,
  Twitter
} from 'lucide-react';
import { 
  AppUser, 
  Match, 
  subscribeToAllUsers, 
  subscribeToAllMatches,
  subscribeToAcademies,
  AcademyDoc
} from '../lib/firebase';

interface LeaderboardViewProps {
  currentUser: AppUser | null;
}

type TabType = 'global' | 'academy_players' | 'academy_rankings';

export function LeaderboardView({ currentUser }: LeaderboardViewProps) {
  // Real-time streams state
  const [players, setPlayers] = useState<AppUser[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [academies, setAcademies] = useState<AcademyDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('global');

  // Search queries per tab
  const [globalSearch, setGlobalSearch] = useState('');
  const [academySearch, setAcademySearch] = useState('');
  const [rankingsSearch, setRankingsSearch] = useState('');
  const [puzzleSearch, setPuzzleSearch] = useState('');


  // Selected Academy ID for TAB 2 (Academy Players)
  const [selectedAcademyId, setSelectedAcademyId] = useState<string>('');

  // Floating user highlight focus flash effect
  const [highlightedUserUid, setHighlightedUserUid] = useState<string | null>(null);

  // Modal selections for popups
  const [selectedPlayer, setSelectedPlayer] = useState<AppUser | null>(null);
  const [selectedAcademyDetails, setSelectedAcademyDetails] = useState<{
    id: string;
    name: string;
    city: string;
    avgElo: number;
    sumElo: number;
    totalPlayers: number;
    topPlayerName: string;
    topPlayerElo: number;
    roster: AppUser[];
  } | null>(null);

  // Share my rank state management
  const [showShareRankModal, setShowShareRankModal] = useState(false);
  const [copiedRankText, setCopiedRankText] = useState(false);

  // Subscribe to real-time streams
  useEffect(() => {
    setIsLoading(true);

    const unsubUsers = subscribeToAllUsers((userList) => {
      // Keep only active players
      const allPlayers = userList.filter(u => u.role === 'player');
      setPlayers(allPlayers);
      setIsLoading(false);
    });

    const unsubMatches = subscribeToAllMatches((matchList) => {
      setMatches(matchList);
    });

    const unsubAcademies = subscribeToAcademies((academyList) => {
      setAcademies(academyList);
    });

    return () => {
      unsubUsers();
      unsubMatches();
      unsubAcademies();
    };
  }, []);

  // Sync / Initialize selected Academy for Tab 2
  useEffect(() => {
    if (currentUser && (currentUser.role === 'player' || currentUser.role === 'academy')) {
      if (currentUser.role === 'academy') {
        setSelectedAcademyId(currentUser.uid);
      } else if (currentUser.academyId) {
        setSelectedAcademyId(currentUser.academyId);
      }
    } else if (academies.length > 0 && !selectedAcademyId) {
      // Default select first academy if none is selected
      setSelectedAcademyId(academies[0].id);
    }
  }, [currentUser, academies]);

  // Handle auto scrolling & highlighting for My Rank
  const handleScrollToMyRank = () => {
    if (!currentUser || currentUser.role !== 'player') return;
    
    // Switch to global tab
    setActiveTab('global');
    setGlobalSearch(''); // Reset search in case user is filtered out

    setTimeout(() => {
      const element = document.getElementById(`player-row-${currentUser.uid}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedUserUid(currentUser.uid);
        setTimeout(() => setHighlightedUserUid(null), 3000);
      }
    }, 100);
  };

  // ---------------------------------------------------------------------------
  // COMPUTED STATS FOR TAB 1: Real-time Global Players Rankings
  // ---------------------------------------------------------------------------
  const globalPlayersList = (() => {
    // Sort all players worldwide by ELO rating DESC
    const sorted = [...players].sort((a, b) => (b.eloRating || 1200) - (a.eloRating || 1200));
    
    // Add win percentages dynamically
    return sorted.map((p, idx) => {
      const tot = p.totalMatches || 0;
      const winsCount = p.wins || 0;
      const winRatePercent = tot > 0 ? Math.round((winsCount / tot) * 100) : 0;
      return {
        ...p,
        rank: idx + 1,
        winRate: winRatePercent
      };
    });
  })();

  // Filtered Global players list
  const filteredGlobalPlayers = globalPlayersList.filter(p => {
    if (!globalSearch.trim()) return true;
    const q = globalSearch.toLowerCase().trim();
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.username && p.username.toLowerCase().includes(q)) ||
      (p.academyName && p.academyName.toLowerCase().includes(q))
    );
  });

  const top3Global = filteredGlobalPlayers.slice(0, 3);
  const rest100Global = filteredGlobalPlayers.slice(3, 100);

  // ---------------------------------------------------------------------------
  // COMPUTED STATS FOR TAB 2: Academy-specific Players Rankings
  // ---------------------------------------------------------------------------
  const academyPlayersList = (() => {
    if (!selectedAcademyId) return [];
    
    // Filter players belonging to selected academy ID
    const belonging = players.filter(p => p.academyId === selectedAcademyId || (p.createdBy === selectedAcademyId && p.createdBy !== 'self' && p.createdBy !== 'admin'));
    
    // Sort by ELO rating DESC
    const sorted = [...belonging].sort((a, b) => (b.eloRating || 1200) - (a.eloRating || 1200));
    
    return sorted.map((p, idx) => {
      const tot = p.totalMatches || 0;
      const winRatePercent = tot > 0 ? Math.round(((p.wins || 0) / tot) * 105 / 105) : 0; // standard format
      return {
        ...p,
        rank: idx + 1,
        winRate: tot > 0 ? Math.round(((p.wins || 0) / tot) * 100) : 0
      };
    });
  })();

  // Filtered Academy Players List
  const filteredAcademyPlayers = academyPlayersList.filter(p => {
    if (!academySearch.trim()) return true;
    const q = academySearch.toLowerCase().trim();
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.username && p.username.toLowerCase().includes(q)) ||
      (p.school && p.school.toLowerCase().includes(q))
    );
  });

  const top3Academy = filteredAcademyPlayers.slice(0, 3);
  const rest50Academy = filteredAcademyPlayers.slice(3, 50);

  // Selected Academy Profile information
  const selectedAcademyInfo = (() => {
    const currentAcadObj = academies.find(a => a.id === selectedAcademyId);
    const registryPlayers = players.filter(p => p.academyId === selectedAcademyId || (p.createdBy === selectedAcademyId && p.createdBy !== 'self' && p.createdBy !== 'admin'));
    const totalPlayersCount = registryPlayers.length;
    const avgEloRating = totalPlayersCount > 0 
      ? Math.round(registryPlayers.reduce((acc, p) => acc + (p.eloRating || 1200), 0) / totalPlayersCount)
      : 1200;

    return {
      name: currentAcadObj?.name || 'Academy Hub',
      city: currentAcadObj?.city || 'Club location',
      totalPlayers: totalPlayersCount,
      avgElo: avgEloRating
    };
  })();

  // ---------------------------------------------------------------------------
  // COMPUTED STATS FOR TAB 3: Academy Rankings by Average ELO
  // ---------------------------------------------------------------------------
  const academyRankingsList = (() => {
    const statsMap: Record<string, {
      id: string;
      name: string;
      city: string;
      totalPlayers: number;
      sumElo: number;
      avgElo: number;
      topPlayerName: string;
      topPlayerElo: number;
    }> = {};

    // Seed stats maps with current academies collection
    academies.forEach(ac => {
      statsMap[ac.id] = {
        id: ac.id,
        name: ac.name,
        city: ac.city,
        totalPlayers: 0,
        sumElo: 0,
        avgElo: 1000,
        topPlayerName: 'No students',
        topPlayerElo: 0
      };
    });

    // Feed players into academies map
    players.forEach(p => {
      const acadId = p.academyId || (p.createdBy && p.createdBy !== 'self' && p.createdBy !== 'admin' ? p.createdBy : null);
      if (!acadId) return;

      if (!statsMap[acadId]) {
        statsMap[acadId] = {
          id: acadId,
          name: p.academyName || 'Elite Chess Club',
          city: p.academyCity || p.city || 'Standard City',
          totalPlayers: 0,
          sumElo: 0,
          avgElo: 1000,
          topPlayerName: 'No students',
          topPlayerElo: 0
        };
      }

      const st = statsMap[acadId];
      const pElo = p.eloRating || 1200;
      st.totalPlayers += 1;
      st.sumElo += pElo;
      if (pElo > st.topPlayerElo) {
        st.topPlayerElo = pElo;
        st.topPlayerName = p.fullName;
      }
    });

    // Calculate dynamic average ELO rating per academy
    const rankings = Object.values(statsMap).map(st => {
      st.avgElo = st.totalPlayers > 0 ? Math.round(st.sumElo / st.totalPlayers) : 1000;
      return st;
    });

    // Sort descending by sum of ELO as specified (Group by academy, sum eloRating)
    rankings.sort((a, b) => b.sumElo - a.sumElo);

    return rankings.map((r, index) => ({
      ...r,
      rank: index + 1
    }));
  })();

  // Filtered Academies
  const filteredAcademyRankings = academyRankingsList.filter(ar => {
    if (!rankingsSearch.trim()) return true;
    const q = rankingsSearch.toLowerCase().trim();
    return (
      ar.name.toLowerCase().includes(q) ||
      ar.city.toLowerCase().includes(q) ||
      ar.topPlayerName.toLowerCase().includes(q)
    );
  });

  const top3Academies = filteredAcademyRankings.slice(0, 3);
  const restAcademies = filteredAcademyRankings.slice(3);

  // ---------------------------------------------------------------------------
  // COMPUTED STATS FOR TAB 4: Puzzle Masters Rankings by Puzzle Rating
  // ---------------------------------------------------------------------------
  const puzzleMastersList = (() => {
    // Sort all players worldwide by puzzle rating DESC
    const sorted = [...players].sort((a, b) => {
      const ratingA = a.puzzleRating !== undefined ? a.puzzleRating : 1200;
      const ratingB = b.puzzleRating !== undefined ? b.puzzleRating : 1200;
      return ratingB - ratingA;
    });
    
    return sorted.map((p, idx) => {
      return {
        ...p,
        rank: idx + 1,
        puzzleRating: p.puzzleRating !== undefined ? p.puzzleRating : 1200
      };
    });
  })();

  const filteredPuzzleMasters = puzzleMastersList.filter(p => {
    if (!puzzleSearch.trim()) return true;
    const q = puzzleSearch.toLowerCase().trim();
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.username && p.username.toLowerCase().includes(q)) ||
      (p.academyName && p.academyName.toLowerCase().includes(q))
    );
  });

  const top3Puzzles = filteredPuzzleMasters.slice(0, 3);
  const restPuzzles = filteredPuzzleMasters.slice(3, 100);



  // Click handlers for Detailed Visual popups
  const handleInspectPlayer = (player: AppUser) => {
    setSelectedPlayer(player);
  };

  const handleInspectAcademy = (academyId: string) => {
    const statsObj = academyRankingsList.find(ar => ar.id === academyId);
    if (!statsObj) return;

    // Filter players belonging to this academy, sorted
    const roster = players
      .filter(p => p.academyId === academyId || (p.createdBy === academyId && p.createdBy !== 'self' && p.createdBy !== 'admin'))
      .sort((a, b) => (b.eloRating || 1200) - (a.eloRating || 1200));

    setSelectedAcademyDetails({
      id: academyId,
      name: statsObj.name,
      city: statsObj.city,
      avgElo: statsObj.avgElo,
      sumElo: statsObj.sumElo,
      totalPlayers: statsObj.totalPlayers,
      topPlayerName: statsObj.topPlayerName,
      topPlayerElo: statsObj.topPlayerElo,
      roster
    });
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-3xs font-mono tracking-widest text-neutral-400 uppercase">STREAMING GLOBAL SCOREBOARD STREAM...</p>
      </div>
    );
  }

  // Find own rank worldwide
  const globalUserRank = (() => {
    if (!currentUser || currentUser.role !== 'player') return null;
    const matched = globalPlayersList.find(p => p.uid === currentUser.uid);
    return matched ? matched.rank : null;
  })();

  const userGlobalRank = globalUserRank || 1;
  const userElo = currentUser?.eloRating || 1200;
  
  // Academy details
  const userAcademyId = currentUser?.academyId;
  const userAcademyObj = academies.find(a => a.id === userAcademyId);
  const academyName = userAcademyObj?.name || 'Independent Chess Player';

  const userAcademyRank = (() => {
    if (!userAcademyId) return null;
    const academyPlayers = players
      .filter(p => p.academyId === userAcademyId || (p.createdBy === userAcademyId && p.createdBy !== 'self' && p.createdBy !== 'admin'))
      .sort((a, b) => (b.eloRating || 1200) - (a.eloRating || 1200));
    const findIndex = academyPlayers.findIndex(p => p.uid === currentUser?.uid);
    return findIndex !== -1 ? findIndex + 1 : 1;
  })();

  const topPercent = Math.max(1, Math.round((userGlobalRank / Math.max(players.length, 1)) * 100));

  const getAcademyRankMedal = (rankNum: number) => {
    if (rankNum === 1) return '🥇';
    if (rankNum === 2) return '🥈';
    if (rankNum === 3) return '🥉';
    return '♟️';
  };

  const getShareTextForRank = () => {
    return `I'm Rank #${userGlobalRank} Globally on CheckmatePro Chess! 🏆\nTop ${topPercent}% players | Academy: ${academyName}\nJoin me: checkmateprochess.com #CheckmatePro`;
  };

  const handleShareRank = async (platform: 'whatsapp' | 'twitter' | 'facebook' | 'copy' | 'native') => {
    const shareText = getShareTextForRank();

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://checkmateprochess.com')}&quote=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedRankText(true);
        setTimeout(() => setCopiedRankText(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    } else if (platform === 'native') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'CheckmatePro Chess Rank Statistics',
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
    <div className="space-y-6 select-text">
      
      {/* HEADER TITLE SUMMARY */}
      <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-3xl border border-amber-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <span className="text-5xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-black font-mono tracking-wider uppercase">PUBLIC ARCHIVES</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white uppercase mt-1">Live Chess Leaderboard</h2>
          <p className="text-3xs font-mono text-neutral-500 uppercase mt-0.5">Explore rankings, top tacticians, and elite training facilities of CheckMatePro network</p>
        </div>

        {/* Floating action for logged-in users to find and share rank */}
        {currentUser && currentUser.role === 'player' && globalUserRank && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleScrollToMyRank}
              className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-wider rounded-xl cursor-pointer shadow-sm border border-neutral-200/50 dark:border-neutral-700 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>Locate My Rank: #{globalUserRank}</span>
            </button>

            <button
              onClick={() => setShowShareRankModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 dark:text-neutral-950 font-extrabold text-2xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share My Rank</span>
            </button>
          </div>
        )}
      </div>

      {/* CORE TAB SWITCHER INTERFACES */}
      <div className="bg-neutral-100 dark:bg-neutral-900/60 p-1.5 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-1.5">
        <button
          onClick={() => setActiveTab('global')}
          className={`py-3.5 rounded-xl text-center uppercase tracking-wide font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'global'
              ? 'bg-neutral-900 dark:bg-amber-500 text-amber-450 dark:text-neutral-950 shadow-md scale-100 font-extrabold'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
          }`}
        >
          <span>🌍</span>
          <span>Global Players</span>
        </button>

        <button
          onClick={() => setActiveTab('academy_players')}
          className={`py-3.5 rounded-xl text-center uppercase tracking-wide font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'academy_players'
              ? 'bg-neutral-900 dark:bg-amber-500 text-amber-500 dark:text-neutral-950 shadow-md scale-100 font-extrabold'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
          }`}
        >
          <span>🏫</span>
          <span>Academy Players</span>
        </button>

        <button
          onClick={() => setActiveTab('academy_rankings')}
          className={`py-3.5 rounded-xl text-center uppercase tracking-wide font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'academy_rankings'
              ? 'bg-neutral-900 dark:bg-amber-500 text-amber-450 dark:text-neutral-950 shadow-md scale-100 font-extrabold'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
          }`}
        >
          <span>🏆</span>
          <span>Academy Rankings</span>
        </button>
      </div>

      {/* TAB 1 CONTENT: GLOBAL PLAYERS */}
      {activeTab === 'global' && (
        <div className="space-y-6 animate-in fade-in duration-250">
          
          {/* SEARCH BOX */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4.5 h-4.5" />
            <input
              type="text"
              placeholder="Search worldwide chess challenger by name, username (@) or academy facility..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 p-3.5 pl-11 rounded-2xl focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
            />
          </div>

          {/* PODIUM TOP 3: MOBILE RESPONSIVE VERTICAL STACK / DESKTOP ROW */}
          {top3Global.length > 0 && !globalSearch && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center py-4">
              
              {/* Podium Rank 2 (Silver) */}
              {top3Global[1] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectPlayer(top3Global[1])}
                  className="order-2 md:order-1 p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-center relative overflow-hidden shadow-md cursor-pointer"
                >
                  <div className="absolute top-2 right-3 text-3xl opacity-20">🥈</div>
                  <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center justify-center text-base font-extrabold mx-auto border border-neutral-300 dark:border-neutral-750">
                    {top3Global[1].fullName.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-extrabold text-xs truncate text-neutral-900 dark:text-neutral-105 mt-3">
                    🥈 {top3Global[1].fullName}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-450 mt-0.5">@{top3Global[1].username || 'challenger'}</p>
                  <p className="text-4xs text-amber-550 dark:text-amber-500 font-bold mt-1.5 uppercase font-mono">{top3Global[1].academyName || 'Elite Academy'}</p>
                  <div className="mt-3.5 inline-block text-xs font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-black px-4 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                    {top3Global[1].eloRating || 1200} ELO
                  </div>
                </motion.div>
              )}

              {/* Podium Rank 1 (Gold - Large Central Card) */}
              {top3Global[0] && (
                <motion.div 
                  whileHover={{ y: -6 }}
                  onClick={() => handleInspectPlayer(top3Global[0])}
                  className="order-1 md:order-2 p-6.5 rounded-3xl bg-amber-500/5 dark:bg-amber-500/5 border-2 border-amber-500 hover:border-amber-400 text-center relative overflow-hidden shadow-xl cursor-pointer md:scale-[1.05]"
                >
                  <div className="absolute top-2 left-0 right-0 flex justify-center text-amber-500 animate-bounce">
                    <Crown className="w-5 h-5 text-amber-500 fill-current" />
                  </div>
                  <div className="w-14 h-14 bg-amber-500 flex items-center justify-center text-xl font-black text-neutral-950 rounded-full mx-auto mt-2 shadow-md shadow-amber-500/20">
                    {top3Global[0].fullName.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-black text-sm truncate text-neutral-950 dark:text-white mt-3.5">
                    👑 {top3Global[0].fullName}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-400 mt-0.5">@{top3Global[0].username || 'champion'}</p>
                  <p className="text-4xs text-amber-550 dark:text-amber-500 font-extrabold mt-1.5 uppercase font-mono">{top3Global[0].academyName || 'Elite Academy'}</p>
                  <div className="mt-4 inline-block text-xs font-mono bg-amber-550 dark:bg-amber-500 text-neutral-950 font-black px-5 py-2 rounded-full shadow-lg">
                    {top3Global[0].eloRating || 1200} ELO
                  </div>
                </motion.div>
              )}

              {/* Podium Rank 3 (Bronze) */}
              {top3Global[2] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectPlayer(top3Global[2])}
                  className="order-3 p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-center relative overflow-hidden shadow-md cursor-pointer"
                >
                  <div className="absolute top-2 right-3 text-3xl opacity-20">🥉</div>
                  <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center justify-center text-base font-extrabold mx-auto border border-neutral-300 dark:border-neutral-750">
                    {top3Global[2].fullName.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-extrabold text-xs truncate text-neutral-900 dark:text-neutral-105 mt-3">
                    🥉 {top3Global[2].fullName}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-455 mt-0.5">@{top3Global[2].username || 'rival'}</p>
                  <p className="text-4xs text-amber-550 dark:text-amber-500 font-bold mt-1.5 uppercase font-mono">{top3Global[2].academyName || 'Elite Academy'}</p>
                  <div className="mt-3.5 inline-block text-xs font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-black px-4 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                    {top3Global[2].eloRating || 1200} ELO
                  </div>
                </motion.div>
              )}

            </div>
          )}

          {/* LIST OF RANK 4 - 100 WORLDWIDE */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-3xs font-mono">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800 text-neutral-400">
                    <th className="p-3.5 pl-6">Rank</th>
                    <th className="p-3.5">Challenger</th>
                    <th className="p-3.5">Academy Facility</th>
                    <th className="p-3.5 text-center">ELO Rating</th>
                    <th className="p-3.5 text-center">Win %</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850">
                  {filteredGlobalPlayers.map((p) => {
                    const isCurrentUser = currentUser && currentUser.uid === p.uid;
                    const isHighlighted = highlightedUserUid === p.uid;
                    
                    return (
                      <tr 
                        key={p.uid} 
                        id={`player-row-${p.uid}`}
                        className={`transition-all duration-300 ${
                          isCurrentUser 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 font-extrabold skeleton-pulse border-y border-emerald-500/20' 
                            : isHighlighted
                              ? 'bg-amber-500/15 shadow-inner scale-[1.01]'
                              : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20'
                        }`}
                      >
                        {/* Rank */}
                        <td className="p-3.5 pl-6 font-extrabold align-middle text-xs">
                          {getRankMedal(p.rank)}
                        </td>

                        {/* Player details */}
                        <td className="p-3.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8.5 h-8.5 rounded-xl text-xs font-black flex items-center justify-center border select-none uppercase ${
                              isCurrentUser
                                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/25'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                            }`}>
                              {p.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-[12px] text-neutral-900 dark:text-white flex items-center gap-1.5 font-sans">
                                {p.fullName}
                                {isCurrentUser && (
                                  <span className="text-[7.5px] font-mono leading-none bg-emerald-500 text-neutral-950 font-black px-1.5 py-0.5 rounded uppercase">MY PROFILE</span>
                                )}
                              </p>
                              <p className="text-5xs font-mono text-neutral-400 mt-0.5">@{p.username || 'rival_pro'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Academy */}
                        <td className="p-3.5 align-middle text-xs font-sans text-neutral-700 dark:text-neutral-200">
                          {p.academyName || 'Independent Scholar'}
                          {p.academyCity && (
                            <span className="text-5xs text-neutral-450 block font-mono uppercase mt-0.5">{p.academyCity}</span>
                          )}
                        </td>

                        {/* ELO */}
                        <td className="p-3.5 align-middle text-center text-xs">
                          <span className={`font-sans font-bold ${(p.eloRating || 1200) > 1000 ? 'positive-points' : (p.eloRating || 1200) < 900 ? 'negative-points' : 'neutral-points dark:text-neutral-300'}`}>
                            {p.eloRating || 1200}
                          </span>
                        </td>

                        {/* Win % */}
                        <td className="p-3.5 align-middle text-center text-xs font-sans">
                          {p.winRate}%
                          <span className="text-5xs font-mono text-neutral-500 block mt-0.5 uppercase">
                            ({p.wins || 0} / {p.totalMatches || 0})
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-6 align-middle text-right">
                          <button
                            onClick={() => handleInspectPlayer(p)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-850 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-extrabold uppercase text-4xs tracking-widest transition-all cursor-pointer border border-neutral-200/50 dark:border-neutral-700/50"
                          >
                            Inspect Log
                          </button>
                        </td>

                      </tr>
                    );
                  })}

                  {filteredGlobalPlayers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-neutral-450">
                        <Trophy className="w-8 h-8 text-neutral-300 mx-auto mb-2.5" />
                        <h4 className="text-xs font-bold text-neutral-750 dark:text-neutral-300">No matching players discovered</h4>
                        <p className="text-5xs font-mono uppercase mt-1">Review spelling parameters or insert new chess student records</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2 CONTENT: ACADEMY PLAYERS */}
      {activeTab === 'academy_players' && (
        <div className="space-y-6 animate-in fade-in duration-250">
          
          {/* CONTROL BAR: dropdown selector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            <div className="md:col-span-4 space-y-1 text-left">
              <label className="block text-5xs font-mono uppercase text-neutral-400">Academy Facility Hub</label>
              <select
                value={selectedAcademyId}
                onChange={(e) => setSelectedAcademyId(e.target.value)}
                className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 p-3.5 rounded-2xl focus:outline-none focus:border-amber-500 text-neutral-700 dark:text-neutral-200 appearance-none cursor-pointer"
              >
                {academies.map((ac) => (
                  <option key={ac.id} value={ac.id}>🏢 {ac.name} ({ac.city})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-8 space-y-1 text-left">
              <label className="block text-5xs font-mono uppercase text-neutral-400">Filter Academy Members</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Filter student lists of this academy by name or username..."
                  value={academySearch}
                  onChange={(e) => setAcademySearch(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 p-3.5 pl-11 rounded-2xl focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

          </div>

          {/* ACADEMY INFO BAR STATS */}
          <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-neutral-800 dark:text-neutral-200 text-2xs md:text-xs font-mono uppercase text-center flex flex-col sm:flex-row justify-center items-center gap-4 py-3">
            <span className="flex items-center gap-1.5">
              <span>🏫 Academy:</span>
              <span className="text-amber-550 dark:text-amber-450 font-black font-sans text-xs">{selectedAcademyInfo.name}</span>
            </span>
            <span className="hidden sm:inline text-neutral-400">|</span>
            <span className="flex items-center gap-1.5">
              <span>Total Rostered Players:</span>
              <span className="text-white bg-neutral-800 dark:bg-neutral-950 px-2.5 py-0.5 rounded font-black font-sans">{selectedAcademyInfo.totalPlayers}</span>
            </span>
            <span className="hidden sm:inline text-neutral-400">|</span>
            <span className="flex items-center gap-1.5">
              <span>Average ELO:</span>
              <span className="text-amber-500 font-black font-sans text-sm">{selectedAcademyInfo.avgElo}</span>
            </span>
          </div>

          {/* TOP 3 ACADEMY HIGHLIGHT CARDS (🥇🥈🥉 GOLD, SILVER, BRONZE) */}
          {top3Academy.length > 0 && !academySearch && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center py-2">
              
              {/* Gold Card: Academy #1 */}
              {top3Academy[0] && (
                <motion.div 
                  whileHover={{ y: -5 }}
                  onClick={() => handleInspectPlayer(top3Academy[0])}
                  className="p-5.5 rounded-3xl bg-amber-400/5 dark:bg-amber-400/5 border-2 border-amber-500 hover:border-amber-450 text-center relative overflow-hidden shadow-lg cursor-pointer max-w-sm mx-auto w-full"
                >
                  <span className="absolute top-2 right-3 text-3xl opacity-25">🥇</span>
                  <div className="text-amber-500 text-4xs font-mono font-extrabold tracking-widest block uppercase mb-2 animate-pulse">
                    Academy ka #1 Player
                  </div>
                  <div className="w-12 h-12 bg-amber-500 flex items-center justify-center text-lg font-black text-neutral-950 rounded-full mx-auto shadow border border-amber-500/30">
                    {top3Academy[0].fullName.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-extrabold text-xs truncate text-neutral-950 dark:text-neutral-50 mt-2.5">
                    🥇 {top3Academy[0].fullName}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-400 mt-0.5">@{top3Academy[0].username || 'ac_boss'}</p>
                  <div className="mt-3.5 inline-block text-2xs font-mono bg-amber-500 text-neutral-950 font-black px-4 py-1.5 rounded-full shadow">
                    {top3Academy[0].eloRating || 1200} ELO
                  </div>
                </motion.div>
              )}

              {/* Silver Card: Academy #2 */}
              {top3Academy[1] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectPlayer(top3Academy[1])}
                  className="p-5 rounded-3xl bg-neutral-500/5 border border-neutral-400 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600 text-center relative overflow-hidden shadow-md cursor-pointer max-w-sm mx-auto w-full"
                >
                  <span className="absolute top-2 right-3 text-3xl opacity-25">🥈</span>
                  <div className="text-neutral-400 text-4xs font-mono font-bold tracking-widest block uppercase mb-2">
                    Academy ka #2 Player
                  </div>
                  <div className="w-11 h-11 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center justify-center text-sm font-extrabold mx-auto border border-neutral-300 dark:border-neutral-700">
                    {top3Academy[1].fullName.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-bold text-xs truncate text-neutral-950 dark:text-neutral-105 mt-2.5">
                    🥈 {top3Academy[1].fullName}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-450 mt-0.5">@{top3Academy[1].username || 'ac_vice'}</p>
                  <div className="mt-3 inline-block text-[11px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-extrabold px-3.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700">
                    {top3Academy[1].eloRating || 1200} ELO
                  </div>
                </motion.div>
              )}

              {/* Bronze Card: Academy #3 */}
              {top3Academy[2] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectPlayer(top3Academy[2])}
                  className="p-5 rounded-3xl bg-amber-700/5 border border-amber-800 hover:border-amber-700 dark:border-amber-800/40 dark:hover:border-amber-700 text-center relative overflow-hidden shadow-md cursor-pointer max-w-sm mx-auto w-full"
                >
                  <span className="absolute top-2 right-3 text-3xl opacity-25">🥉</span>
                  <div className="text-amber-700 dark:text-amber-600 text-4xs font-mono font-bold tracking-widest block uppercase mb-2">
                    Academy ka #3 Player
                  </div>
                  <div className="w-11 h-11 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center justify-center text-sm font-extrabold mx-auto border border-neutral-300 dark:border-neutral-700">
                    {top3Academy[2].fullName.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-bold text-xs truncate text-neutral-950 dark:text-neutral-105 mt-2.5">
                    🥉 {top3Academy[2].fullName}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-455 mt-0.5">@{top3Academy[2].username || 'ac_contender'}</p>
                  <div className="mt-3 inline-block text-[11px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-extrabold px-3.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700">
                    {top3Academy[2].eloRating || 1200} ELO
                  </div>
                </motion.div>
              )}

            </div>
          )}

          {/* NORMAL LIST RANK 4 - 50 OF THE ACADEMY */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-3xs font-mono">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800 text-neutral-400">
                    <th className="p-3.5 pl-6">Rank</th>
                    <th className="p-3.5">Junior Member Name</th>
                    <th className="p-3.5">School Affiliation</th>
                    <th className="p-3.5">Class Standard</th>
                    <th className="p-3.5 text-center">ELORating</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850">
                  {filteredAcademyPlayers.map((p) => {
                    const isOwnProfile = currentUser && currentUser.uid === p.uid;
                    return (
                      <tr 
                        key={p.uid}
                        className={`transition-colors ${
                          isOwnProfile
                            ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 font-extrabold'
                            : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20'
                        }`}
                      >
                        {/* Rank */}
                        <td className="p-3.5 pl-6 font-black text-xs align-middle">
                          {getRankMedal(p.rank)}
                        </td>

                        {/* Player name */}
                        <td className="p-3.5 align-middle">
                          <p className="font-extrabold text-[12px] text-neutral-900 dark:text-white font-sans">
                            {p.fullName}
                            {isOwnProfile && (
                              <span className="text-[7.5px] font-mono bg-emerald-500 text-neutral-950 font-black px-1.5 py-0.5 rounded ml-1 uppercase">MY PROFILE</span>
                            )}
                          </p>
                          <p className="text-5xs font-mono text-neutral-400 mt-0.5">@{p.username || 'rival_pro'}</p>
                        </td>

                        {/* School */}
                        <td className="p-3.5 align-middle text-xs font-sans text-neutral-700 dark:text-neutral-205">
                          {p.school || 'Unspecified Private School'}
                        </td>

                        {/* Class */}
                        <td className="p-3.5 align-middle text-xs text-neutral-500 font-sans">
                          {p.class || 'Other'} Standard
                        </td>

                        {/* ELO */}
                        <td className="p-3.5 align-middle text-center text-xs">
                          <span className={`font-sans font-bold ${(p.eloRating || 1200) > 1000 ? 'positive-points' : (p.eloRating || 1200) < 900 ? 'negative-points' : 'neutral-points dark:text-neutral-300'}`}>
                            {p.eloRating || 1200}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-6 align-middle text-right">
                          <button
                            onClick={() => handleInspectPlayer(p)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-850 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-extrabold uppercase text-4xs tracking-widest transition-all cursor-pointer border border-neutral-200/50 dark:border-neutral-700/50"
                          >
                            Inspect Log
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAcademyPlayers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-neutral-450">
                        <School className="w-8 h-8 text-neutral-300 mx-auto mb-2.5" />
                        <h4 className="text-xs font-bold text-neutral-750 dark:text-neutral-300">No student players discovered in this club</h4>
                        <p className="text-5xs font-mono uppercase mt-1">Enroll more students or switch filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3 CONTENT: ACADEMY RANKINGS */}
      {activeTab === 'academy_rankings' && (
        <div className="space-y-6 animate-in fade-in duration-250">
          
          {/* SEARCH BOX */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4.5 h-4.5" />
            <input
              type="text"
              placeholder="Search academy entries by facility name or owner's city..."
              value={rankingsSearch}
              onChange={(e) => setRankingsSearch(e.target.value)}
              className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 p-3.5 pl-11 rounded-2xl focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
            />
          </div>

          {/* PODIUM TOP 3 ACADEMIES */}
          {top3Academies.length > 0 && !rankingsSearch && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center py-4">
              
              {/* Podium Rank 2 Academy */}
              {top3Academies[1] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectAcademy(top3Academies[1].id)}
                  className="order-2 md:order-1 p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-center relative overflow-hidden shadow-md cursor-pointer"
                >
                  <span className="absolute top-2 right-3 text-3xl opacity-20">🥈</span>
                  <div className="w-12 h-12 bg-neutral-150 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-300 rounded-2xl flex items-center justify-center text-base font-extrabold mx-auto border border-neutral-250 dark:border-neutral-750">
                    🏢
                  </div>
                  <h4 className="font-extrabold text-xs truncate text-neutral-900 dark:text-neutral-50 mt-3.5">
                    🥈 {top3Academies[1].name}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-450 uppercase flex items-center justify-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-red-500 inline" /> {top3Academies[1].city}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-2 font-mono uppercase">Sum ELO: <span className="text-amber-500 font-extrabold">{top3Academies[1].sumElo} ELO</span></p>
                  <div className="mt-3.5 inline-block text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-3.5 py-1 rounded-full text-center">
                    {top3Academies[1].totalPlayers} Registered Students
                  </div>
                </motion.div>
              )}

              {/* Podium Rank 1 Academy (First place badge and gold design) */}
              {top3Academies[0] && (
                <motion.div 
                  whileHover={{ y: -6 }}
                  onClick={() => handleInspectAcademy(top3Academies[0].id)}
                  className="order-1 md:order-2 p-6 rounded-3xl bg-amber-500/5 dark:bg-amber-500/5 border-2 border-amber-500 hover:border-amber-400 text-center relative overflow-hidden shadow-xl cursor-pointer md:scale-[1.05]"
                >
                  <span className="absolute top-2 right-3 text-3xl opacity-30 animate-bounce">🥇</span>
                  
                  {/* National Champion Badging */}
                  <div className="mx-auto mb-2.5 inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase font-mono">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>India's #1 Chess Academy</span>
                  </div>

                  <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto shadow-md border border-amber-500/20">
                    🏆
                  </div>
                  <h4 className="font-black text-sm truncate text-neutral-950 dark:text-white mt-3 uppercase">
                    🥇 {top3Academies[0].name}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-400 uppercase flex items-center justify-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-red-500 inline" /> {top3Academies[0].city}
                  </p>
                  <p className="text-xs text-neutral-900 dark:text-white mt-2 font-mono uppercase font-bold">Sum ELO: <span className="text-amber-500 font-black text-sm">{top3Academies[0].sumElo} ELO</span></p>
                  <div className="mt-4 inline-block text-2xs font-mono bg-amber-500 text-neutral-950 px-4 py-1.5 rounded-full font-black shadow select-none">
                    {top3Academies[0].totalPlayers} Registered Students
                  </div>
                </motion.div>
              )}

              {/* Podium Rank 3 Academy */}
              {top3Academies[2] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectAcademy(top3Academies[2].id)}
                  className="order-3 p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-center relative overflow-hidden shadow-md cursor-pointer"
                >
                  <span className="absolute top-2 right-3 text-3xl opacity-20">🥉</span>
                  <div className="w-12 h-12 bg-neutral-150 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-300 rounded-2xl flex items-center justify-center text-base font-extrabold mx-auto border border-neutral-250 dark:border-neutral-750">
                    🏢
                  </div>
                  <h4 className="font-extrabold text-xs truncate text-neutral-900 dark:text-neutral-50 mt-3.5">
                    🥉 {top3Academies[2].name}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-450 uppercase flex items-center justify-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-red-500 inline" /> {top3Academies[2].city}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-2 font-mono uppercase">Sum ELO: <span className="text-amber-500 font-extrabold">{top3Academies[2].sumElo} ELO</span></p>
                  <div className="mt-3.5 inline-block text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-3.5 py-1 rounded-full text-center">
                    {top3Academies[2].totalPlayers} Registered Students
                  </div>
                </motion.div>
              )}

            </div>
          )}

          {/* LIST OF RANK 4 - ALL ACADEMIES */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-3xs font-mono">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800 text-neutral-400">
                    <th className="p-3.5 pl-6">Rank</th>
                    <th className="p-3.5">Academy School Name</th>
                    <th className="p-3.5">Headquarters</th>
                    <th className="p-3.5 text-center">Sum ELO</th>
                    <th className="p-3.5 text-center">Enlisted Students</th>
                    <th className="p-3.5">Top Club Member</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850">
                  {filteredAcademyRankings.map((ar) => {
                    const isUserAffiliated = currentUser && currentUser.academyId === ar.id;
                    return (
                      <tr 
                        key={ar.id}
                        className={`transition-colors ${
                          isUserAffiliated
                            ? 'bg-blue-500/10 hover:bg-blue-500/15 text-blue-900 dark:text-blue-105 font-bold border-y border-blue-500/20 shadow-inner'
                            : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20'
                        }`}
                      >
                        {/* Rank */}
                        <td className="p-3.5 pl-6 font-extrabold text-xs align-middle">
                          {getRankMedal(ar.rank)}
                        </td>

                        {/* Academy Details */}
                        <td className="p-3.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8.5 h-8.5 rounded-xl text-xs font-bold flex items-center justify-center border select-none ${
                              isUserAffiliated
                                ? 'bg-blue-500/20 text-blue-500 border-blue-500/25'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                            }`}>
                              🏢
                            </div>
                            <div>
                              <p className="font-extrabold text-[12px] text-neutral-900 dark:text-white uppercase font-sans flex items-center gap-1.5">
                                {ar.name}
                                {isUserAffiliated && (
                                  <span className="text-[7px] font-mono leading-none bg-blue-500 text-white font-black px-1.5 py-0.5 rounded uppercase">MY CLUB</span>
                                )}
                              </p>
                              <p className="text-5xs font-mono text-neutral-405 mt-0.5">ID: {ar.id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Headquarters */}
                        <td className="p-3.5 align-middle text-xs font-sans text-neutral-600 dark:text-neutral-300">
                          {ar.city}
                        </td>

                        {/* Sum ELO */}
                        <td className="p-3.5 align-middle text-center text-xs">
                          <span className="text-amber-500 font-sans font-black text-center">
                            {ar.sumElo} ELO
                          </span>
                        </td>

                        {/* Enlisted Students */}
                        <td className="p-3.5 align-middle text-center text-xs font-sans">
                          {ar.totalPlayers} Players
                        </td>

                        {/* Top Club Member */}
                        <td className="p-3.5 align-middle text-xs">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block font-sans">{ar.topPlayerName}</span>
                          {ar.topPlayerElo > 0 && (
                            <span className="text-5xs font-mono text-amber-500/90 font-bold block mt-0.5">Top: {ar.topPlayerElo} ELO</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-6 align-middle text-right">
                          <button
                            onClick={() => handleInspectAcademy(ar.id)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-850 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-extrabold uppercase text-4xs tracking-widest transition-all cursor-pointer border border-neutral-200/50 dark:border-neutral-700/50"
                          >
                            View Roster
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAcademyRankings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-neutral-450">
                        <Building2 className="w-8 h-8 text-neutral-300 mx-auto mb-2.5" />
                        <h4 className="text-xs font-bold text-neutral-705">No matches found</h4>
                        <p className="text-5xs font-mono uppercase mt-1">Review rankings search keyword matches.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {false && (
        <div className="space-y-6 animate-in fade-in duration-250">
          
          {/* SEARCH BOX */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4.5 h-4.5" />
            <input
              type="text"
              placeholder="Search tactical wizards by name, username (@) or academy facility..."
              value={puzzleSearch}
              onChange={(e) => setPuzzleSearch(e.target.value)}
              className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 p-3.5 pl-11 rounded-2xl focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
            />
          </div>

          {/* PODIUM TOP 3: PUZZLE MASTERS */}
          {top3Puzzles.length > 0 && !puzzleSearch && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center py-4">
              
              {/* Podium Rank 2 (Silver) */}
              {top3Puzzles[1] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectPlayer(top3Puzzles[1])}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center cursor-pointer order-2 md:order-1 h-fit md:mt-10"
                >
                  <div className="relative mb-3">
                    <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-bold text-lg text-neutral-800 dark:text-white">
                      {top3Puzzles[1].fullName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neutral-300 text-neutral-850 dark:bg-neutral-650 flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-neutral-900">
                      2
                    </div>
                  </div>
                  <h3 className="font-bold text-xs text-neutral-850 dark:text-white line-clamp-1">{top3Puzzles[1].fullName}</h3>
                  <span className="text-5xs font-mono uppercase text-neutral-400 tracking-wider mt-0.5">@{top3Puzzles[1].username || 'challenger'}</span>
                  <div className="mt-3.5 bg-neutral-50 dark:bg-neutral-950 px-3.5 py-1.5 rounded-xl border border-neutral-100 dark:border-neutral-850 w-full">
                    <span className="text-[13px] font-sans font-black text-amber-500">
                      🧩 {top3Puzzles[1].puzzleRating}
                    </span>
                    <span className="text-[9px] text-neutral-450 block font-mono uppercase mt-0.5">Tactical Rating</span>
                  </div>
                </motion.div>
              )}

              {/* Podium Rank 1 (Gold) */}
              {top3Puzzles[0] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectPlayer(top3Puzzles[0])}
                  className="bg-white dark:bg-neutral-900 border-2 border-amber-500/50 dark:border-amber-500/40 rounded-3xl p-8 shadow-md flex flex-col items-center text-center relative cursor-pointer order-1 md:order-2"
                >
                  <div className="absolute -top-4 bg-amber-500 text-neutral-950 text-[9px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow">
                    <Crown className="w-3 h-3 fill-current" />
                    Grandmaster
                  </div>
                  <div className="relative mb-4">
                    <div className="w-18 h-18 rounded-full bg-amber-500/10 border-2 border-amber-400 dark:border-amber-500 flex items-center justify-center font-black text-xl text-amber-600 dark:text-amber-500">
                      {top3Puzzles[0].fullName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center text-xs font-black border-2 border-white dark:border-neutral-900">
                      1
                    </div>
                  </div>
                  <h3 className="font-black text-sm text-neutral-900 dark:text-white line-clamp-1">{top3Puzzles[0].fullName}</h3>
                  <span className="text-5xs font-mono uppercase text-neutral-400 tracking-wider mt-0.5">@{top3Puzzles[0].username || 'champion'}</span>
                  <div className="mt-4 bg-amber-500/5 px-4 py-2 rounded-2xl border border-amber-500/20 w-full">
                    <span className="text-[15px] font-sans font-black text-amber-500">
                      🧩 {top3Puzzles[0].puzzleRating}
                    </span>
                    <span className="text-[9px] text-neutral-450 block font-mono uppercase mt-0.5">Tactical Rating</span>
                  </div>
                </motion.div>
              )}

              {/* Podium Rank 3 (Bronze) */}
              {top3Puzzles[2] && (
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => handleInspectPlayer(top3Puzzles[2])}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center cursor-pointer order-3 h-fit md:mt-12"
                >
                  <div className="relative mb-3">
                    <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-amber-700/50 flex items-center justify-center font-bold text-lg text-neutral-800 dark:text-white">
                      {top3Puzzles[2].fullName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-neutral-900">
                      3
                    </div>
                  </div>
                  <h3 className="font-bold text-xs text-neutral-850 dark:text-white line-clamp-1">{top3Puzzles[2].fullName}</h3>
                  <span className="text-5xs font-mono uppercase text-neutral-400 tracking-wider mt-0.5">@{top3Puzzles[2].username || 'grand'}</span>
                  <div className="mt-3.5 bg-neutral-50 dark:bg-neutral-950 px-3.5 py-1.5 rounded-xl border border-neutral-100 dark:border-neutral-850 w-full">
                    <span className="text-[13px] font-sans font-black text-amber-500">
                      🧩 {top3Puzzles[2].puzzleRating}
                    </span>
                    <span className="text-[9px] text-neutral-450 block font-mono uppercase mt-0.5">Tactical Rating</span>
                  </div>
                </motion.div>
              )}

            </div>
          )}

          {/* MAIN PLAYER PUZZLE LIST */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-3xs font-mono">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-950/40 border-b border-neutral-150 dark:border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4 pl-6 align-middle text-center w-16">Rank</th>
                    <th className="p-4 align-middle">Tactician Profile</th>
                    <th className="p-4 align-middle">Academy Facility</th>
                    <th className="p-4 align-middle text-center w-36">Streak 🔥</th>
                    <th className="p-4 align-middle text-center w-32">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 text-neutral-600 dark:text-neutral-300">
                  {filteredPuzzleMasters.map((p) => {
                    const isMe = currentUser && currentUser.uid === p.uid;
                    const isHighlighted = highlightedUserUid === p.uid;

                    return (
                      <tr
                        key={p.uid}
                        id={`player-row-${p.uid}`}
                        onClick={() => handleInspectPlayer(p)}
                        className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-850/30 transition-all cursor-pointer ${
                          isMe ? 'bg-amber-500/5 hover:bg-amber-500/10 font-bold border-l-4 border-l-amber-500' : ''
                        } ${isHighlighted ? 'bg-amber-100 dark:bg-amber-950/40 duration-1000 animate-pulse' : ''}`}
                      >
                        {/* Rank placement */}
                        <td className="p-3.5 align-middle text-center font-sans">
                          {p.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-neutral-950 text-xs font-black">1</span>
                          ) : p.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-300 text-neutral-800 text-xs font-black">2</span>
                          ) : p.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black">3</span>
                          ) : (
                            <span className="font-mono text-xs text-neutral-400 font-bold">#{p.rank}</span>
                          )}
                        </td>

                        {/* Player details */}
                        <td className="p-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-700 dark:text-neutral-300 font-sans text-xs">
                              {p.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-neutral-850 dark:text-neutral-100 font-sans flex items-center gap-1.5 matches-title">
                                {p.fullName}
                                {isMe && (
                                  <span className="text-[8px] bg-amber-500 text-neutral-950 font-black px-1.5 py-0.5 rounded uppercase">Your Profile</span>
                                )}
                              </div>
                              <span className="text-4xs text-neutral-400 uppercase font-mono tracking-wider block mt-0.5">
                                @{p.username || 'puzzler'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Academy membership location */}
                        <td className="p-3.5 align-middle text-xs font-sans">
                          <span className="text-neutral-700 dark:text-neutral-250 block">{p.academyName || 'Rookie Academy Hub'}</span>
                          <span className="text-5xs font-mono text-neutral-400 tracking-wider block mt-0.5">{p.academyCity || 'Online Community'}</span>
                        </td>

                        {/* Streak values */}
                        <td className="p-3.5 align-middle text-center text-xs font-sans text-orange-500">
                          <span className="font-black">🔥 {p.uid ? (Math.abs(p.uid.charCodeAt(0) % 6) + 1) : 3} Solves</span>
                        </td>

                        {/* Tactical Puzzle rating with premium badge */}
                        <td className="p-3.5 align-middle text-center">
                          <span className="text-amber-500 font-sans font-black text-xs">
                            🧩 {p.puzzleRating} Rating
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPuzzleMasters.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-neutral-450">
                        <Award className="w-8 h-8 text-neutral-300 mx-auto mb-2.5" />
                        <h4 className="text-xs font-bold text-neutral-705">No matches found</h4>
                        <p className="text-5xs font-mono uppercase mt-1">Review rankings search keyword matches.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* DIALOG 1: DETAILED PLAYER POPUP */}
      <AnimatePresence>
        {selectedPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop black layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlayer(null)}
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 text-neutral-450 hover:text-neutral-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 border-b border-neutral-100 dark:border-neutral-805 pb-4 text-left">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 font-black text-lg flex items-center justify-center rounded-2xl border border-amber-500/10">
                  {selectedPlayer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-neutral-950 dark:text-white flex items-center gap-1.5 leading-tight">
                    {selectedPlayer.fullName}
                  </h4>
                  <p className="text-5xs font-mono text-neutral-450 mt-0.5">@{selectedPlayer.username || 'rival_player'}</p>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider font-mono mt-1">{selectedPlayer.school || 'Independent Scholar'}</p>
                </div>
              </div>

              {/* Stat Boxes */}
              <div className="grid grid-cols-3 gap-3 text-left leading-none font-mono">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-850 rounded-2xl">
                  <span className="text-[8px] font-bold text-neutral-400 block uppercase">ELO RATING</span>
                  <p className="text-base font-black text-amber-500 mt-2 font-sans">{selectedPlayer.eloRating || 1200}</p>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-850 rounded-2xl">
                  <span className="text-[8px] font-bold text-neutral-400 block uppercase">RECORD W-L</span>
                  <p className="text-xs font-black mt-2 font-sans">
                    <span className="text-emerald-500">{selectedPlayer.wins || 0}W</span>
                    {" - "}
                    <span className="text-red-500">{selectedPlayer.losses || 0}L</span>
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-850 rounded-2xl">
                  <span className="text-[8px] font-bold text-neutral-400 block uppercase">WIN RATE</span>
                  <p className="text-sm font-black text-neutral-800 dark:text-neutral-100 mt-2 font-sans">
                    {selectedPlayer.totalMatches && selectedPlayer.totalMatches > 0 
                      ? Math.round(( (selectedPlayer.wins || 0) / selectedPlayer.totalMatches ) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/40 dark:border-neutral-850 text-4xs font-mono uppercase text-left">
                <p className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                  <span className="text-neutral-450">Academy Club:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-black font-sans text-xs lowercase">{selectedPlayer.academyName || 'Unspecified'}</span>
                </p>
                <p className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                  <span className="text-neutral-450">Class Standard:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-bold">{selectedPlayer.class || 'Other'}</span>
                </p>
                <p className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                  <span className="text-neutral-450">Age Level:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-bold">{selectedPlayer.age ? `${selectedPlayer.age} Years` : 'N/A'}</span>
                </p>
                <p className="flex justify-between pb-1">
                  <span className="text-neutral-450">Win Streak Status:</span>
                  <span className="text-emerald-500 font-black flex items-center gap-1 animate-pulse">
                    <Zap className="w-3 h-3 text-amber-500 fill-current" /> {selectedPlayer.winStreak || 0} Wins
                  </span>
                </p>
              </div>

              {/* Game logs of this player */}
              <div className="text-left space-y-2">
                <span className="text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-widest block">MATCH HISTORY LOGS</span>
                
                {matches.filter(m => m.playerId === selectedPlayer.uid).length === 0 ? (
                  <p className="text-4xs italic text-neutral-450 font-mono text-center py-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl">No historical match data available.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {matches
                      .filter(m => m.playerId === selectedPlayer.uid)
                      .slice(0, 5)
                      .map((m) => {
                        const isWin = m.result === 'win';
                        return (
                          <div key={m.id} className="p-2 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-250/30 dark:border-neutral-850/30 flex justify-between items-center text-[10px] font-mono leading-none">
                            <p className="font-extrabold flex items-center gap-1 text-neutral-800 dark:text-neutral-200">
                              <span>vs</span>
                              <span className="truncate max-w-[120px]">{m.opponent}</span>
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                isWin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {m.result.toUpperCase()}
                              </span>
                              <span className={m.eloChange >= 0 ? 'text-emerald-500 font-black' : 'text-red-500 font-black'}>
                                {m.eloChange >= 0 ? `+${m.eloChange}` : m.eloChange}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedPlayer(null)}
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-neutral-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer text-amber-500"
              >
                Dismiss Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 2: DETAILED ACADEMY ROSTER POPUP */}
      <AnimatePresence>
        {selectedAcademyDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAcademyDetails(null)}
              className="absolute inset-0 bg-neutral-955/80 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <button 
                onClick={() => setSelectedAcademyDetails(null)}
                className="absolute top-4 right-4 text-neutral-450 hover:text-neutral-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-left border-b border-neutral-100 dark:border-neutral-805 pb-3">
                <span className="text-5xs font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase">
                  ACADEMY ROSTER INFORMATION
                </span>
                <h3 className="font-black text-sm text-neutral-900 dark:text-white mt-1 uppercase flex items-center gap-1.5">
                  🏢 {selectedAcademyDetails.name}
                </h3>
                <p className="text-5xs font-mono text-neutral-400 uppercase flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  Headquarters: {selectedAcademyDetails.city}
                </p>
              </div>

              {/* Academy Overview Stats */}
              <div className="grid grid-cols-2 gap-3.5 text-left leading-none font-mono">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-850 rounded-2xl">
                  <span className="text-[8px] font-bold text-neutral-400 block uppercase">TOTAL ACCUMULATED ELO</span>
                  <p className="text-sm font-black text-amber-550 dark:text-amber-500 mt-2 font-sans">{selectedAcademyDetails.sumElo} ELO</p>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-855 rounded-2xl">
                  <span className="text-[8px] font-bold text-neutral-400 block uppercase">TOTAL MEMBERS REGISTERED</span>
                  <p className="text-sm font-black text-neutral-900 dark:text-white mt-2 font-sans">{selectedAcademyDetails.totalPlayers} Active Players</p>
                </div>
              </div>

              {/* Roster lists */}
              <div className="text-left space-y-3">
                <h4 className="text-xs font-black text-neutral-850 dark:text-neutral-100 uppercase tracking-wider">Top Academy Contenders</h4>

                {selectedAcademyDetails.roster.length === 0 ? (
                  <p className="text-3xs italic text-neutral-450 font-mono text-center py-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50 dark:bg-neutral-950">No students registered in this facility yet.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedAcademyDetails.roster.map((p, index) => (
                      <div
                        key={p.uid}
                        onClick={() => {
                          setSelectedAcademyDetails(null);
                          setSelectedPlayer(p);
                        }}
                        className="p-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-850 rounded-2xl border border-neutral-200/40 dark:border-white/5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <span className="text-xs font-mono font-bold text-neutral-450">#{index + 1}</span>
                          <div>
                            <p className="font-extrabold text-neutral-900 dark:text-white text-xs">{p.fullName}</p>
                            <p className="text-5xs font-mono text-neutral-405">@{p.username || 'challenger'}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-mono font-black ${(p.eloRating || 1200) > 1000 ? 'positive-points' : (p.eloRating || 1200) < 900 ? 'negative-points' : 'neutral-points dark:text-neutral-300'}`}>
                          <span>{p.eloRating || 1200} ELO</span>
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedAcademyDetails(null)}
                  className="w-full py-3 text-neutral-950 bg-amber-500 hover:bg-amber-600 font-extrabold text-2xs uppercase tracking-widest rounded-xl shadow cursor-pointer transition-colors"
                >
                  Dismiss Roster
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* SHARE RANK ACCEPTER DIALOG MODAL */}
        {showShareRankModal && currentUser && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center z-[110] px-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-805 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              {/* Corner close button */}
              <button
                onClick={() => setShowShareRankModal(false)}
                className="absolute top-4 right-4 text-neutral-450 hover:text-neutral-800 dark:hover:text-white bg-neutral-105 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-750 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-[9px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded font-black uppercase">
                  SHARE CARD PREVIEW
                </span>
                <h3 className="font-black text-sm text-neutral-900 dark:text-white mt-1 uppercase tracking-tight">
                  Your Chess License Card
                </h3>
              </div>

              {/* CARD PREVIEW GRAPHIC CONTAINER - Styled to look like a high-end metal card */}
              <div className="p-5 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border-2 border-amber-500/40 rounded-2xl relative shadow-xl overflow-hidden min-h-[170px] flex flex-col justify-between text-white font-sans">
                {/* Chess pattern background highlight */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                
                {/* Gold chip embellishment */}
                <div className="absolute top-4 right-4 w-8 h-6 bg-gradient-to-br from-amber-300 to-amber-500/70 rounded border border-amber-300/40 shadow-sm flex flex-col justify-between p-1 opacity-85">
                  <div className="grid grid-cols-2 gap-px w-full h-full">
                    <div className="border-[0.5px] border-amber-950/20 rounded-2xs" />
                    <div className="border-[0.5px] border-amber-950/20 rounded-2xs" />
                    <div className="border-[0.5px] border-amber-950/20 rounded-2xs" />
                    <div className="border-[0.5px] border-amber-950/20 rounded-2xs" />
                  </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                  {/* User Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 p-0.5 shadow-md flex-shrink-0">
                    <div className="w-full h-full bg-neutral-950/90 rounded-[10px] flex items-center justify-center font-black text-lg text-amber-500">
                      {currentUser.fullName.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="text-left leading-none space-y-1.5">
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5 uppercase">
                      {currentUser.fullName}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </h4>
                    <p className="text-[10px] font-mono text-neutral-400">@{currentUser.username || 'pro_master'}</p>
                    <p className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-widest">{academyName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10 relative z-10 leading-none">
                  <div className="text-left font-mono">
                    <span className="text-[8px] text-neutral-500 uppercase font-black tracking-wider">GLOBAL RANK STATUS</span>
                    <p className="text-lg font-black text-white mt-1 font-sans">#{userGlobalRank}</p>
                    <p className="text-[8px] text-neutral-405 font-mono mt-0.5">Top {topPercent}% worldwide</p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[8px] text-neutral-500 uppercase font-black tracking-wider">SKILL LEVEL SCORE</span>
                    <p className="text-lg font-black text-amber-550 mt-1 font-sans">{userElo} ELO</p>
                    <p className="text-[8px] text-neutral-405 font-mono mt-0.5 text-right">
                      {userAcademyRank 
                        ? `${getAcademyRankMedal(userAcademyRank)} Academy Rank #${userAcademyRank}`
                        : '🥇 Elite Contender'}
                    </p>
                  </div>
                </div>

                {/* Micro logo watermarks */}
                <div className="absolute bottom-2 right-4 text-[7px] font-mono font-bold tracking-widest text-white/20 uppercase pointer-events-none">
                  CHECKMATEPRO CHESS SYSTEM
                </div>
              </div>

              {/* Share Controls Option Stack */}
              <div className="space-y-3">
                <span className="text-5xs font-mono uppercase text-neutral-450 dark:text-neutral-400 block text-center tracking-wider">
                  Post dynamic text & link online
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleShareRank('whatsapp')}
                    className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-550 text-neutral-950 dark:text-white rounded-xl text-3xs font-extrabold uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all text-center leading-none"
                  >
                    <span>💬</span> WhatsApp
                  </button>

                  <button
                    onClick={() => handleShareRank('copy')}
                    className={`py-2.5 px-3 rounded-xl text-3xs font-extrabold uppercase flex items-center justify-center gap-1.5 cursor-pointer border transition-all ${
                      copiedRankText 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                        : 'bg-neutral-100 hover:bg-neutral-250 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 border-neutral-200/50 dark:border-neutral-700/50'
                    }`}
                  >
                    {copiedRankText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedRankText ? 'Copied Stats!' : 'Copy Stats Text'}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 text-neutral-450 border-t border-neutral-100 dark:border-neutral-800/60 pt-3">
                  <button
                    onClick={() => handleShareRank('twitter')}
                    className="p-1.5 hover:text-sky-400 hover:scale-110 transition-all cursor-pointer text-neutral-450 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 w-8 h-8 border border-neutral-200/50 dark:border-neutral-700/50"
                    title="Share on Twitter"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleShareRank('facebook')}
                    className="p-1.5 hover:text-blue-500 hover:scale-110 transition-all cursor-pointer text-neutral-450 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 w-8 h-8 border border-neutral-200/50 dark:border-neutral-700/50"
                    title="Share on Facebook"
                  >
                    <Facebook className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => handleShareRank('native')}
                    className="p-1.5 hover:text-amber-500 hover:scale-110 transition-all cursor-pointer text-neutral-450 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 w-8 h-8 border border-neutral-200/50 dark:border-neutral-700/50"
                    title="Native System Share"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => setShowShareRankModal(false)}
                  className="w-full py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-3xs uppercase font-extrabold tracking-widest rounded-xl shadow-inner transition-colors cursor-pointer"
                >
                  Close Share Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
