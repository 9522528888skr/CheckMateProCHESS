import { useState, useEffect, FormEvent } from 'react';
import { 
  User, 
  Building2, 
  Shield, 
  Mail, 
  Lock, 
  Sparkles, 
  LogOut, 
  UserPlus, 
  Activity, 
  MapPin, 
  PhoneCall, 
  Award, 
  Users, 
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Flame,
  Globe,
  Loader2,
  GraduationCap
} from 'lucide-react';
import { 
  loginUser, 
  registerPlayer, 
  registerPlayerByAcademy, 
  registerAcademyByAdmin, 
  logoutSession, 
  onAuthChange, 
  fetchPlayersByAcademy, 
  updateAcademyPlayer,
  fetchAllAcademies, 
  fetchAllUsers,
  isMockActive, 
  AppUser,
  subscribeToAcademies,
  AcademyDoc,
  subscribeToAllLiveGames,
  LiveGameDoc
} from './lib/firebase';
import ChessGame from './components/ChessGame';
import { EventsView } from './components/EventsView';
import { LeaderboardView } from './components/LeaderboardView';
import LoginPage from './components/LoginPage';
import ChessCertificate from './components/ChessCertificate';
import { AcademyLiveCasts } from './components/AcademyLiveCasts';
import TournamentPage from './components/TournamentPage';

type ActiveTab = 'player' | 'academy' | 'admin';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeSection, setActiveSection] = useState<'arena' | 'history' | 'events' | 'leaderboard' | 'certificates' | 'tournaments'>(() => {
    if (window.location.pathname.includes('/lobby')) {
      return 'arena';
    }
    return 'events';
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [loggedOutSection, setLoggedOutSection] = useState<'auth' | 'leaderboard'>('auth');

  // Dashboard submission states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Academies data state
  const [academies, setAcademies] = useState<AcademyDoc[]>([]);

  // Academy dashboard state
  const [academyPlayers, setAcademyPlayers] = useState<AppUser[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerPassword, setNewPlayerPassword] = useState('');

  // Editing Academy Player state
  const [editingPlayer, setEditingPlayer] = useState<AppUser | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerAge, setEditPlayerAge] = useState('');
  const [editPlayerPhone, setEditPlayerPhone] = useState('');
  const [editPlayerEmail, setEditPlayerEmail] = useState('');
  const [editPlayerElo, setEditPlayerElo] = useState('');

  const handleStartEditing = (player: AppUser) => {
    setEditingPlayer(player);
    setEditPlayerName(player.fullName || '');
    setEditPlayerAge(player.age ? player.age.toString() : '');
    setEditPlayerPhone(player.phone || '');
    setEditPlayerEmail(player.email || '');
    setEditPlayerElo(player.eloRating ? player.eloRating.toString() : '1200');
  };

  const handleSaveEditPlayer = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateAcademyPlayer(editingPlayer.uid, {
        fullName: editPlayerName,
        age: parseInt(editPlayerAge) || 0,
        phone: editPlayerPhone,
        eloRating: parseInt(editPlayerElo) || 1200,
        email: editPlayerEmail,
      });
      setSuccessMsg(`Player profile details for "${editPlayerName}" updated successfully!`);
      setEditingPlayer(null);
      if (currentUser) {
        await loadAcademyPlayers(currentUser.uid);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update player profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin dashboard state
  const [allAcademies, setAllAcademies] = useState<AppUser[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [newAcademyName, setNewAcademyName] = useState('');
  const [newAcademyCity, setNewAcademyCity] = useState('');
  const [newAcademyOwner, setNewAcademyOwner] = useState('');
  const [newAcademyEmail, setNewAcademyEmail] = useState('');
  const [newAcademyPhone, setNewAcademyPhone] = useState('');
  const [newAcademyPassword, setNewAcademyPassword] = useState('');

  const [allLiveGames, setAllLiveGames] = useState<LiveGameDoc[]>([]);

  // Subscribe to all live games
  useEffect(() => {
    const unsub = subscribeToAllLiveGames((list) => {
      setAllLiveGames(list);
    });
    return () => unsub();
  }, []);

  // Subscribe to academies in real-time
  useEffect(() => {
    const unsubscribe = subscribeToAcademies((list) => {
      setAcademies(list);
    });
    return () => unsubscribe();
  }, []);

  // Listen for login changes on app setup
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      
      // Auto-fetch related collections depending on modern user role
      if (user) {
        if (user.role === 'academy') {
          loadAcademyPlayers(user.uid);
        } else if (user.role === 'admin') {
          loadAdminAcademies();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch academy cataloged players list
  const loadAcademyPlayers = async (uid: string) => {
    try {
      const data = await fetchPlayersByAcademy(uid);
      setAcademyPlayers(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch administrator academies summary list
  const loadAdminAcademies = async () => {
    try {
      const data = await fetchAllAcademies();
      setAllAcademies(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch global user ranking logs
  const loadGlobalUsers = async () => {
    try {
      const data = await fetchAllUsers();
      setAllUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Load global player ranks when on admin history panel
  useEffect(() => {
    if (currentUser?.role === 'admin' && activeSection === 'history') {
      loadGlobalUsers();
    }
  }, [currentUser, activeSection]);

  // Academy registering an independent player to join their club
  const handleAcademyAddPlayer = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if (!newPlayerName || !newPlayerEmail || !newPlayerPassword || !newPlayerPhone || !newPlayerAge) {
      setErrorMsg("Please populate all fields to enroll the player.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      await registerPlayerByAcademy({
        fullName: newPlayerName,
        age: newPlayerAge,
        phone: newPlayerPhone,
        email: newPlayerEmail,
        password: newPlayerPassword,
        academyName: currentUser.academyName || '',
        academyCity: currentUser.city || currentUser.academyCity || ''
      }, currentUser.uid);

      setSuccessMsg(`Successfully registered and enrolled student player ${newPlayerName}!`);
      
      // Reset inputs
      setNewPlayerName('');
      setNewPlayerAge('');
      setNewPlayerPhone('');
      setNewPlayerEmail('');
      setNewPlayerPassword('');

      // Reload academy profiles
      loadAcademyPlayers(currentUser.uid);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to add user account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin registers another Academy node
  const handleAdminAddAcademy = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAcademyName || !newAcademyCity || !newAcademyOwner || !newAcademyEmail || !newAcademyPhone || !newAcademyPassword) {
      setErrorMsg("Please complete all parameters to construct an academy account.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      await registerAcademyByAdmin({
        academyName: newAcademyName,
        city: newAcademyCity,
        ownerName: newAcademyOwner,
        ownerEmail: newAcademyEmail,
        ownerPhone: newAcademyPhone,
        tempPassword: newAcademyPassword
      });

      setSuccessMsg(`Successfully constructed academy franchise: ${newAcademyName}!`);

      // Reset values
      setNewAcademyName('');
      setNewAcademyCity('');
      setNewAcademyOwner('');
      setNewAcademyEmail('');
      setNewAcademyPhone('');
      setNewAcademyPassword('');

      // Reload list
      loadAdminAcademies();
    } catch (e: any) {
      setErrorMsg(e.message || "Franchise creation error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutSession();
    setCurrentUser(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Standard requested WhatsApp template
  const renderWhatsAppButton = () => {
    return (
      <div className="flex justify-center pt-2">
        <a 
          href="https://wa.me/917000263828" 
          className="bg-green-500 hover:bg-green-650 text-white font-extrabold text-2xs uppercase tracking-wide px-5 py-3 rounded-xl transition-all shadow-md inline-flex items-center gap-2"
        >
          Need Help? Chat: 7000263828
        </a>
      </div>
    );
  };

  // Display absolute load screen setup
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <h2 className="text-sm font-mono tracking-wider text-neutral-400">LOADING CHECKMATE PRO AUTH SECURE SHIELD...</h2>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW RENDERER (IF LOGGED UNLOCK PORTALS OVERVIEWS)
  // -------------------------------------------------------------
  // PRIMARY APP DOM SHELL (ONLY FOR LOGGED IN USERS OR MAIN PORTAL)
  // -------------------------------------------------------------
  if (currentUser) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 transition-colors duration-300">
        
        {/* Dynamic Tournament page */}
        {activeSection === 'tournaments' && (
          <main className="max-w-7xl mx-auto p-4 sm:p-6 min-h-[70vh] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setActiveSection('arena')}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-850 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-2 transition-all border border-neutral-200/40 dark:border-neutral-800"
              >
                <span>⬅</span>
                <span>Back to Workspace</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-850 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-2 transition-all border border-neutral-200/40 dark:border-neutral-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
            <TournamentPage currentUser={currentUser} />
          </main>
        )}

        {/* Dynamic Events hub workspace, common for all roles */}
        {activeSection === 'events' && (
          <main className="max-w-7xl mx-auto p-4 sm:p-6 min-h-[70vh] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setActiveSection('arena')}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-805 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-2 transition-all border border-neutral-200/40 dark:border-neutral-800"
              >
                <span>⬅</span>
                <span>Back to Workspace</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-805 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-2 transition-all border border-neutral-200/40 dark:border-neutral-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
            <EventsView currentUser={currentUser} />
          </main>
        )}

        {/* Dynamic Leaderboard workspace, common for all roles */}
        {activeSection === 'leaderboard' && (
          <main className="max-w-7xl mx-auto p-4 sm:p-6 min-h-[70vh] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setActiveSection('arena')}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-805 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-2 transition-all border border-neutral-200/40 dark:border-neutral-800"
              >
                <span>⬅</span>
                <span>Back to Workspace</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-805 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-2 transition-all border border-neutral-200/40 dark:border-neutral-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
            <LeaderboardView currentUser={currentUser} />
          </main>
        )}

        {/* Dynamic Certificates workspace, common for all roles */}
        {activeSection === 'certificates' && (currentUser.role === 'academy' || currentUser.role === 'admin') && (
          <main className="max-w-7xl mx-auto p-4 sm:p-6 min-h-[70vh] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setActiveSection('arena')}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-805 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-2 transition-all border border-neutral-200/40 dark:border-neutral-800"
              >
                <span>⬅</span>
                <span>Back to Workspace</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-805 text-neutral-800 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-2 transition-all border border-neutral-200/40 dark:border-neutral-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
            <ChessCertificate currentUser={currentUser} academyPlayers={academyPlayers} />
          </main>
        )}

        {/* Play Sandbox Gateway screen for standard Users */}
        {currentUser.role === 'player' && activeSection !== 'events' && activeSection !== 'leaderboard' && activeSection !== 'certificates' && (
          <main className="max-w-7xl mx-auto p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-black tracking-tight text-neutral-950 dark:text-white uppercase">
                {activeSection === 'arena' ? 'Player Workspace' : 'Match History & Analytics'}
              </h2>
              <p className="text-3xs text-neutral-600 dark:text-neutral-400 font-mono mt-0.5">
                {activeSection === 'arena'
                  ? 'Welcome chessmaster! Enter the lobby, play against Mikhail Minimax engine, or solve dynamic tactical puzzles below.'
                  : 'Track your personal ratings, performance ratios, and replay past move logging files.'
                }
              </p>
            </div>
            <ChessGame currentUser={currentUser} onLogout={handleLogout} forcedTab={activeSection === 'history' ? 'history' : 'play'} onNavigateSection={(sec) => setActiveSection(sec)} />
          </main>
        )}

        {/* Academy Administration Portal */}
        {currentUser.role === 'academy' && activeSection !== 'events' && activeSection !== 'leaderboard' && activeSection !== 'certificates' && (
          <main className="max-w-7xl mx-auto p-4 sm:p-6">
            
            {/* Header statistics block info */}
            <div className="mb-8">
              <h2 className="text-lg font-black tracking-tight text-neutral-950 dark:text-white uppercase">Academy Hub Workspace</h2>
              <p className="text-3xs text-neutral-600 dark:text-neutral-405 font-mono mt-0.5">Manage club student registrations, view chess ratings, and invite players to checkmate game levels.</p>
            </div>

            {/* Academy Local Tab Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-neutral-200/60 dark:border-neutral-800/80">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSection('arena')}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                    activeSection === 'arena'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
                  }`}
                >
                  🏫 Manage Students
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('history')}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                    activeSection === 'history'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
                  }`}
                >
                  📈 Academy Rating Stats
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('events')}
                  className="px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800"
                >
                  📅 Events
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('leaderboard')}
                  className="px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800"
                >
                  🏆 Leaderboard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('certificates')}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                    activeSection === 'certificates'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
                  }`}
                >
                  🎓 Certificates
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('tournaments')}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                    activeSection === 'tournaments'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
                  }`}
                >
                  🏆 Tournament Hub
                </button>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-750 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-neutral-200/40 dark:border-neutral-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl">
                <h4 className="text-5xs font-mono text-neutral-400 uppercase tracking-widest">FACILITY IDENTITY</h4>
                <p className="text-sm font-black text-amber-500 uppercase mt-1">{currentUser.academyName || 'Elite Chess Club'}</p>
                <p className="text-5xs text-neutral-400 mt-0.5">{currentUser.city || 'Standard Arena'}</p>
              </div>
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl">
                <h4 className="text-5xs font-mono text-neutral-400 uppercase tracking-widest">REGISTERED STUDENTS</h4>
                <p className="text-sm font-black text-neutral-950 dark:text-white mt-1">{academyPlayers.length} Active Players</p>
                <p className="text-5xs text-neutral-400 mt-0.5">Eager challengers registered locally</p>
              </div>
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl">
                <h4 className="text-5xs font-mono text-neutral-400 uppercase tracking-widest">FACILITY OWNER</h4>
                <p className="text-sm font-black text-neutral-950 dark:text-white mt-1">{currentUser.ownerName || 'Club Director'}</p>
                <p className="text-5xs text-neutral-400 mt-0.5">Phone: {currentUser.ownerPhone || 'N/A'}</p>
              </div>
            </div>

            {activeSection === 'history' ? (
              /* Beautiful Leaderboard and stats overview for Academy */
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl shadow-sm">
                    <span className="text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-widest block">Highest ELO Leader</span>
                    <p className="text-sm font-black text-amber-500 mt-2 truncate">
                      {academyPlayers.length > 0 
                        ? [...academyPlayers].sort((a,b) => (b.eloRating || 1200) - (a.eloRating || 1200))[0].fullName
                        : 'No Students'
                      }
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1 uppercase">
                      Rating: <span className="text-amber-500 font-bold">{academyPlayers.length > 0 ? [...academyPlayers].sort((a,b) => (b.eloRating || 1200) - (a.eloRating || 1200))[0].eloRating || 1200 : '1200'} ELO</span>
                    </p>
                  </div>

                  <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl shadow-sm">
                    <span className="text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-widest block">Average Academy ELO</span>
                    <p className="text-sm font-black text-white mt-2">
                      {academyPlayers.length > 0
                        ? Math.round(academyPlayers.reduce((acc, p) => acc + (p.eloRating || 1200), 0) / academyPlayers.length)
                        : '1200'
                      } ELO
                    </p>
                    <p className="text-[10px] text-neutral-405 mt-1 uppercase">Across all enlisted junior members</p>
                  </div>

                  <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl shadow-sm">
                    <span className="text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-widest block">Student Rating Density</span>
                    <p className="text-sm font-black text-white mt-2">
                      {academyPlayers.filter(p => (p.eloRating || 1200) >= 1205).length} Advanced Students
                    </p>
                    <p className="text-[10px] text-neutral-405 mt-1 uppercase">Rated ≥ 1200 ELO</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                  <h3 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider mb-4 pb-2.5 border-b border-neutral-100 dark:border-neutral-805">
                    Academy Rating Leaderboard (Top Players)
                  </h3>

                  {academyPlayers.length === 0 ? (
                    <p className="text-3xs text-neutral-455 font-mono italic text-center py-8">Enroll students to launch the rating scoreboard.</p>
                  ) : (
                    <div className="border border-neutral-200/50 dark:border-neutral-850 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-3xs font-mono">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800 text-neutral-400">
                            <th className="p-3">Rank</th>
                            <th className="p-3">Player Name</th>
                            <th className="p-3">Username</th>
                            <th className="p-3">Age Group</th>
                            <th className="p-3">Rating (ELO)</th>
                            <th className="p-3">Level Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                          {[...academyPlayers]
                            .sort((a,b) => (b.eloRating || 1200) - (a.eloRating || 1200))
                            .map((p, idx) => (
                              <tr key={p.uid} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-950/20">
                                <td className="p-3 font-bold text-neutral-400">#{idx + 1}</td>
                                <td className="p-3 font-bold font-sans text-neutral-900 dark:text-white">{p.fullName}</td>
                                <td className="p-3 text-neutral-400">@{p.username || p.email.split('@')[0]}</td>
                                <td className="p-3">{p.age ? `${p.age} Yrs` : 'N/A'}</td>
                                <td className="p-3 text-amber-500 font-extrabold">{p.eloRating || 1200} ELO</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                    (p.eloRating || 1200) >= 1400
                                      ? 'bg-red-500/15 text-red-500'
                                      : (p.eloRating || 1200) >= 1200
                                        ? 'bg-amber-500/15 text-amber-500'
                                        : 'bg-blue-500/15 text-blue-500'
                                  }`}>
                                    {(p.eloRating || 1200) >= 1400 ? 'Grandmaster' : (p.eloRating || 1200) >= 1200 ? 'Candidate Master' : 'Challenger'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Form panel: Enroll player (Left width 5 of 12) */}
                <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-md">
                <h3 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                  <UserPlus className="w-4 h-4 text-amber-500" />
                  Add New Player Profile
                </h3>

                {successMsg && (
                  <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-3xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-3xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleAcademyAddPlayer} className="space-y-3">
                  <div>
                    <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Player Full Name</label>
                    <input
                      type="text"
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      placeholder="e.g. Mikhail Tal"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Age</label>
                      <input
                        type="number"
                        className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                        placeholder="e.g. 15"
                        value={newPlayerAge}
                        onChange={(e) => setNewPlayerAge(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                        placeholder="e.g. +91 9999.."
                        value={newPlayerPhone}
                        onChange={(e) => setNewPlayerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Email Address (Login ID)</label>
                    <input
                      type="email"
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      placeholder="e.g. player@checkmate.com"
                      value={newPlayerEmail}
                      onChange={(e) => setNewPlayerEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Temporary Password</label>
                    <input
                      type="password"
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      placeholder="Minimum 6 characters"
                      value={newPlayerPassword}
                      onChange={(e) => setNewPlayerPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-neutral-950 dark:bg-amber-500 hover:bg-neutral-800 dark:hover:bg-amber-600 text-amber-500 dark:text-neutral-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow cursor-pointer flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <span>REGISTER CHAMPION STUDENT</span>
                    )}
                  </button>
                </form>
              </div>

              {/* List grid (Right width 7 of 12) */}
              <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-md">
                <h3 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider mb-4 pb-2.5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                  <span>Enrolled Club Players ({academyPlayers.length})</span>
                  <span className="text-4xs font-mono bg-neutral-150 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-400 uppercase">ACTIVE DATABASE</span>
                </h3>

                {academyPlayers.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-250 dark:border-neutral-800 rounded-2xl">
                    <Users className="w-8 h-8 text-neutral-400 mb-2" />
                    <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">No players cataloged yet</h4>
                    <p className="text-5xs text-neutral-400 mt-1 max-w-xs">Use the Form on the left to add your academy student players. They will be registered in standard offline memory or Firestore database.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                    {academyPlayers.map((player) => (
                      <div key={player.uid} className="p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/40 dark:border-neutral-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-amber-500/20 transition-all">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-neutral-905 dark:text-neutral-50">{player.fullName}</h4>
                            <span className="text-5xs px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded font-semibold">ELO: {player.eloRating || 1200}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-5xs text-neutral-400 font-mono">
                            <p>📧 ID: {player.email}</p>
                            <p>📞 Phone: {player.phone}</p>
                            <p>🎂 Age: {player.age} yrs old</p>
                            <p>📅 Added: {player.createdAt ? new Date(player.createdAt).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-4xs font-mono bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full uppercase font-bold tracking-wider hidden sm:inline">Verified Player</span>
                          <button
                            type="button"
                            onClick={() => handleStartEditing(player)}
                            className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-neutral-950 dark:text-amber-500 font-extrabold text-4xs uppercase tracking-wider py-1.5 px-3 rounded-xl transition-all cursor-pointer leading-none"
                            id={`modify-player-btn-${player.uid}`}
                          >
                            Modify
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Academy Broadcasts Panel */}
              <AcademyLiveCasts academyName={currentUser.academyName} />

            </div>
          )}
          </main>
        )}

        {/* Global Admin Console Dashboard */}
        {currentUser.role === 'admin' && activeSection !== 'events' && activeSection !== 'leaderboard' && activeSection !== 'certificates' && (
          <main className="max-w-7xl mx-auto p-4 sm:p-6 text-neutral-800 dark:text-neutral-100">
            <div className="mb-8">
              <h2 className="text-lg font-black tracking-tight text-neutral-950 dark:text-white uppercase flex items-center gap-2">
                <span>System Administration Console</span>
                <span className="px-2.5 py-0.5 bg-green-500/15 text-green-500 text-5xs font-mono font-bold tracking-wider rounded border border-green-500/20 uppercase animate-pulse">Master State</span>
              </h2>
              <p className="text-3xs text-neutral-600 dark:text-neutral-450 font-mono mt-0.5">Authoritative control node. Register new academy partners, audit academies, and track global Chess student enrollment metrics.</p>
            </div>

            {/* Admin Console Local Tab Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-neutral-200/60 dark:border-neutral-800/80">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSection('arena')}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                    activeSection === 'arena'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
                  }`}
                >
                  ⚙️ Admin Panel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('events')}
                  className="px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800"
                >
                  📅 Events
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('leaderboard')}
                  className="px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800"
                >
                  🏆 Leaderboard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('certificates')}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                    activeSection === 'certificates'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
                  }`}
                >
                  🎓 Certificates
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('tournaments')}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                    activeSection === 'tournaments'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-800'
                  }`}
                >
                  🏆 Tournament Hub
                </button>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-750 dark:text-neutral-200 font-extrabold text-2xs uppercase tracking-widest rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-neutral-200/40 dark:border-neutral-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Quick KPI analytic grids */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl">
                <h4 className="text-5xs font-mono text-neutral-400 uppercase tracking-widest">HOST SYSTEM STATUS</h4>
                <p className="text-sm font-black text-green-500 uppercase mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" />
                  Active Online
                </p>
                <p className="text-5xs text-neutral-400 mt-1">Host port interface: 3000 (Ingress OK)</p>
              </div>
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl">
                <h4 className="text-5xs font-mono text-neutral-400 uppercase tracking-widest">TOTAL ACADEMIES</h4>
                <p className="text-sm font-black text-neutral-950 dark:text-white mt-1">{allAcademies.length} academies</p>
                <p className="text-5xs text-neutral-400 mt-0.5">Verified chess learning hubs</p>
              </div>
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl">
                <h4 className="text-5xs font-mono text-neutral-400 uppercase tracking-widest">PERSISTENCY MODE</h4>
                <p className="text-sm font-black text-amber-500 mt-1">{isMockActive() ? "Local Storage Sandbox" : "Live Firestore Cloud"}</p>
                <p className="text-5xs text-neutral-400 mt-0.5">Hybrid credentials system active</p>
              </div>
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl">
                <h4 className="text-5xs font-mono text-neutral-400 uppercase tracking-widest">ADMINISTRATOR</h4>
                <p className="text-sm font-black text-neutral-950 dark:text-white mt-1 text-amber-500 font-bold">9522528888skr@gmail.com</p>
                <p className="text-5xs text-neutral-400 mt-0.5">Privileged session authenticated</p>
              </div>
            </div>

            {activeSection === 'history' ? (
              /* Beautiful Master System Leaderboard for Admin */
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl shadow-sm">
                    <span className="text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-widest block">Top System Player</span>
                    <p className="text-sm font-black text-amber-500 mt-2 truncate">
                      {allUsers.filter(u => u.role === 'player').length > 0 
                        ? [...allUsers].filter(u => u.role === 'player').sort((a,b) => (b.eloRating || 1200) - (a.eloRating || 1200))[0].fullName
                        : 'No players registered'
                      }
                    </p>
                    <p className="text-[10px] text-neutral-405 mt-1 uppercase">
                      Global Rank #1 ELO: <span className="text-amber-500 font-bold">{allUsers.filter(u => u.role === 'player').length > 0 ? [...allUsers].filter(u => u.role === 'player').sort((a,b) => (b.eloRating || 1200) - (a.eloRating || 1200))[0].eloRating || 1200 : '1200'} ELO</span>
                    </p>
                  </div>

                  <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl shadow-sm">
                    <span className="text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-widest block">Total System Players</span>
                    <p className="text-sm font-black text-white mt-2">
                      {allUsers.filter(u => u.role === 'player').length} Enrolled Players
                    </p>
                    <p className="text-[10px] text-neutral-405 mt-1 uppercase">Across all registered academies</p>
                  </div>

                  <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl shadow-sm">
                    <span className="text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-widest block font-bold">Average System Base ELO</span>
                    <p className="text-sm font-black text-white mt-2">
                       {allUsers.filter(u => u.role === 'player').length > 0
                        ? Math.round(allUsers.filter(u => u.role === 'player').reduce((acc, p) => acc + (p.eloRating || 1200), 0) / allUsers.filter(u => u.role === 'player').length)
                        : '1200'
                       } ELO
                    </p>
                    <p className="text-[10px] text-neutral-405 mt-1 uppercase">Standard distribution average</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                  <h3 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider mb-4 pb-2.5 border-b border-neutral-100 dark:border-neutral-805">
                    Global Network Player Leaderboard (All Academies)
                  </h3>

                  {allUsers.filter(u => u.role === 'player').length === 0 ? (
                    <p className="text-3xs text-neutral-455 font-mono italic text-center py-8">No players registered on the platform.</p>
                  ) : (
                    <div className="border border-neutral-200/50 dark:border-neutral-850 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-3xs font-mono">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800 text-neutral-400">
                            <th className="p-3">Global Rank</th>
                            <th className="p-3">Player Name</th>
                            <th className="p-3">Academy Node</th>
                            <th className="p-3">Age</th>
                            <th className="p-3">Rating (ELO)</th>
                            <th className="p-3">Class Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                          {[...allUsers]
                            .filter(u => u.role === 'player')
                            .sort((a,b) => (b.eloRating || 1200) - (a.eloRating || 1200))
                            .map((p, idx) => {
                              const playerAcademy = allAcademies.find(ac => ac.uid === p.academyId)?.academyName || p.academyName || 'Elite Academy';
                              return (
                                <tr key={p.uid} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-950/20">
                                  <td className="p-3 font-bold text-neutral-400">#{idx + 1}</td>
                                  <td className="p-3 font-bold font-sans text-neutral-900 dark:text-white">{p.fullName}</td>
                                  <td className="p-3 text-amber-500 font-sans font-bold">{playerAcademy}</td>
                                  <td className="p-3">{p.age ? `${p.age} Yrs` : 'N/A'}</td>
                                  <td className={`p-3 font-extrabold ${(p.eloRating || 1200) > 1000 ? 'positive-points' : (p.eloRating || 1200) < 900 ? 'negative-points' : 'neutral-points dark:text-neutral-300'}`}>{p.eloRating || 1200} ELO</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                      (p.eloRating || 1200) >= 1400
                                        ? 'bg-red-500/15 text-red-500'
                                        : (p.eloRating || 1200) >= 1205
                                          ? 'bg-amber-500/15 text-amber-500'
                                          : 'bg-blue-500/15 text-blue-500'
                                    }`}>
                                      {(p.eloRating || 1200) >= 1400 ? 'Grandmaster' : (p.eloRating || 1200) >= 1200 ? 'Candidate Master' : 'Challenger'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          }
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Form: Add Academy Account (Left size 5) */}
                <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-md">
                <h3 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  Create Academy Account
                </h3>

                {successMsg && (
                  <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-3xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-3xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleAdminAddAcademy} className="space-y-3.5">
                  <div>
                    <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Academy Name</label>
                    <input
                      type="text"
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      placeholder="e.g. Knight's Castle Chess Academy"
                      value={newAcademyName}
                      onChange={(e) => setNewAcademyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">City Location</label>
                    <input
                      type="text"
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      placeholder="e.g. New Delhi"
                      value={newAcademyCity}
                      onChange={(e) => setNewAcademyCity(e.target.value)}
                    />
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-200/50 dark:border-neutral-850 space-y-3">
                    <span className="block text-5xs font-mono uppercase text-amber-500 font-bold">Academy Owner Profile Info</span>
                    <div>
                      <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Owner Name</label>
                      <input
                        type="text"
                        className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg focus:outline-none focus:border-amber-500"
                        placeholder="Owner First & Last Name"
                        value={newAcademyOwner}
                        onChange={(e) => setNewAcademyOwner(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Owner Email</label>
                        <input
                          type="email"
                          className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg focus:outline-none focus:border-amber-500"
                          placeholder="e.g. owner@academy.com"
                          value={newAcademyEmail}
                          onChange={(e) => setNewAcademyEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Owner Phone</label>
                        <input
                          type="text"
                          className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg focus:outline-none focus:border-amber-500"
                          placeholder="Contact phone"
                          value={newAcademyPhone}
                          onChange={(e) => setNewAcademyPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Construct Temporary Password</label>
                    <input
                      type="password"
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      placeholder="Minimum 6 characters"
                      value={newAcademyPassword}
                      onChange={(e) => setNewAcademyPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow cursor-pointer flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <span>SAVE ACADEMY FRANCHISE</span>
                    )}
                  </button>
                </form>
              </div>

              {/* List: Registered Academies (Right size 7) */}
              <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-md">
                <h3 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider mb-4 pb-2.5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                  <span>Authorized System Academies ({allAcademies.length})</span>
                  <span className="text-4xs font-mono bg-neutral-150 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-400 uppercase">OPERATING HUBS</span>
                </h3>

                {allAcademies.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-250 dark:border-neutral-800 rounded-2xl">
                    <Building2 className="w-8 h-8 text-neutral-400 mb-2" />
                    <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">No academies registered yet</h4>
                    <p className="text-5xs text-neutral-400 mt-1 max-w-xs">Introduce your system's tactical hubs by filling in the details in the registry form on the left.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {allAcademies.map((academy) => (
                      <div key={academy.uid} className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-210 dark:border-neutral-850 hover:border-amber-500/20 transition-all">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-200/30 dark:border-neutral-800/40 pb-2.5 mb-2.5 gap-2">
                          <div>
                            <span className="text-5xs font-mono uppercase bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded mr-2 font-bold select-none">FRANCHISE</span>
                            <span className="text-xs font-black text-neutral-950 dark:text-white inline-block">{academy.academyName}</span>
                          </div>
                          <span className="text-4xs font-mono bg-neutral-200 dark:bg-neutral-800 px-2.5 py-1 rounded text-neutral-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-500" />
                            {academy.city}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-5xs text-neutral-400 font-mono leading-relaxed">
                          <p>👤 Owner: <span className="text-neutral-600 dark:text-neutral-250 font-semibold">{academy.ownerName}</span></p>
                          <p>📧 Owner Email: <span className="text-neutral-600 dark:text-neutral-250 font-semibold">{academy.email}</span></p>
                          <p>📞 Owner Phone: <span className="text-neutral-600 dark:text-neutral-250 font-semibold">{academy.phone}</span></p>
                          <p>📅 Date Registered: <span className="text-neutral-600 dark:text-neutral-250 font-semibold">{academy.createdAt ? new Date(academy.createdAt).toLocaleString() : 'N/A'}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Live Broadcasts Panel */}
              <div className="lg:col-span-7 mt-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-md space-y-4">
                <h4 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider flex justify-between items-center pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="flex items-center gap-2">
                    <span className="live-tag">LIVE</span>
                    ACTIVE LIVE STREAMS ({allLiveGames.filter(g => g.status === 'active').length})
                  </span>
                  <span className="text-4xs font-mono bg-neutral-150 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-450">MONITOR CENTER</span>
                </h4>

                {allLiveGames.filter(g => g.status === 'active').length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/20">
                    <p className="text-3xs text-neutral-450 italic font-mono">No active player broadcasts detected currently.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {allLiveGames.filter(g => g.status === 'active').map((g) => (
                      <div key={g.id} className="p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-850 hover:border-amber-500/20 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="text-left">
                          <p className="text-xs font-black text-neutral-900 dark:text-white">
                            {g.whitePlayer} <span className="text-neutral-400 font-bold text-3xs">vs</span> {g.blackPlayer}
                          </p>
                          <p className="text-[10px] font-mono text-neutral-400 mt-1 text-left">
                            Academy: {g.academyName || "Sumeet Rasela Academy"} • Spectators: {g.spectators || 0} watching
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 font-sans">
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/live/${g.id}`;
                              navigator.clipboard.writeText(link);
                              const btn = document.getElementById(`admin-copy-${g.id}`);
                              if (btn) {
                                btn.innerText = 'COPIED!';
                                setTimeout(() => { btn.innerText = 'COPY LINK'; }, 2000);
                              }
                            }}
                            id={`admin-copy-${g.id}`}
                            className="grow sm:grow-0 bg-neutral-950 hover:bg-neutral-900 border border-neutral-950 dark:bg-neutral-850 dark:hover:bg-neutral-750 dark:border-neutral-750 text-white font-black text-3xs uppercase tracking-wider py-2 px-3.5 rounded-xl transition-all cursor-pointer text-center"
                          >
                            COPY LINK
                          </button>
                          <button
                            onClick={() => window.open(`/live/${g.id}`, '_blank')}
                            className="grow sm:grow-0 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-3xs uppercase tracking-widest py-2 px-3.5 rounded-xl transition-all cursor-pointer text-center shadow font-sans"
                          >
                            WATCH LIVE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
          </main>
        )}

        {editingPlayer && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
              <h3 className="font-extrabold text-xs text-neutral-905 dark:text-white uppercase tracking-wider mb-4 pb-2.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span>Modify Student Profile</span>
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white font-mono text-xs cursor-pointer px-2"
                >
                  ✕
                </button>
              </h3>
              
              <form onSubmit={handleSaveEditPlayer} className="space-y-3.5 text-neutral-900 dark:text-neutral-100">
                <div>
                  <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Player Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
                    value={editPlayerName}
                    onChange={(e) => setEditPlayerName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Age (Years)</label>
                    <input
                      type="number"
                      required
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
                      value={editPlayerAge}
                      onChange={(e) => setEditPlayerAge(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Rating (ELO)</label>
                    <input
                      type="number"
                      required
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-white"
                      value={editPlayerElo}
                      onChange={(e) => setEditPlayerElo(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
                    value={editPlayerPhone}
                    onChange={(e) => setEditPlayerPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-5xs font-mono uppercase text-neutral-400 mb-1">Email (Id)</label>
                  <input
                    type="email"
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-900 dark:text-white"
                    value={editPlayerEmail}
                    onChange={(e) => setEditPlayerEmail(e.target.value)}
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlayer(null)}
                    className="w-1/2 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 font-extrabold text-2xs uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'SAVE CHANGES'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }
   // -------------------------------------------------------------
  // HOME SCREEN (LOGGED OUT TABS GATEWAY FOR 3 USER TYPES)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-950 font-sans text-neutral-200 flex flex-col justify-between select-none">
      
      {/* Main Content Area */}
      <div className="w-full flex-grow flex items-center justify-center py-10 px-4">
        {loggedOutSection === 'leaderboard' ? (
          <div className="w-full max-w-7xl mx-auto text-left space-y-4">
            <button
              onClick={() => setLoggedOutSection('auth')}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 text-neutral-300 font-extrabold text-2xs uppercase tracking-widest rounded-xl cursor-pointer shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] font-mono"
            >
              <span>🔑</span>
              <span>Back to Login Portal</span>
            </button>
            <LeaderboardView currentUser={null} />
          </div>
        ) : (
          <LoginPage 
            onLoginSuccess={(profile) => {
              setCurrentUser(profile);
              // Load corresponding stats details dynamically on successful login
              if (profile.role === 'academy') {
                loadAcademyPlayers(profile.uid);
              } else if (profile.role === 'admin') {
                loadAdminAcademies();
              }
            }} 
            academies={academies} 
            onShowLeaderboard={() => setLoggedOutSection('leaderboard')} 
          />
        )}
      </div>

      {/* Footer system status note block */}
      <footer className="text-center pt-8 max-w-sm mx-auto">
        <p className="text-5xs font-mono text-neutral-600 uppercase tracking-widest leading-relaxed">
          CheckMateProChess Security Gateway v9.0 • Auth Mode: {isMockActive() ? "Local Storage Sandbox" : "Firebase Real-time Network Security Client"}
        </p>
      </footer>

    </div>
  );
}
