import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Detect whether the user has configured Firebase with live cloud credentials
const isConfigured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

export let app: any = null;
export let auth: any = null;
export let db: any = null;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    console.log("Firebase initialized successfully with live credentials.");
  } catch (error) {
    console.error("Firebase initialization failed; falling back to local fallback mode:", error);
  }
} else {
  console.log("CheckMate Pro: Running in Local Persistence Mode (Awaiting live Firebase keys).");
}

// -------------------------------------------------------------
// LOCAL STATE STORAGE ENGINE (FALLBACK ENGINE)
// -------------------------------------------------------------
// Simulates standard Auth users and Firestore users collection inside localStorage

const API = '/api';

// Academy
export const getAcademies = async () => {
  const snap = await getDocs(collection(db, 'franchises')); 
  return snap.docs.map(doc => ({ 
    uid: doc.id, 
    id: doc.id,
    academyName: doc.data().academyName,
    name: doc.data().academyName, // dono rakh de compatibility ke liye
    city: doc.data().city,
    ownerName: doc.data().ownerName,
    ownerEmail: doc.data().ownerEmail,
    ownerPhone: doc.data().ownerPhone,
    ...doc.data()
  }));
};

export const addAcademy = async (data: any) => {
  return await addDoc(collection(db, 'franchises'), data);
};

// Live Match
export const startMatch = (player1: string, player2: string) => 
  fetch(`${API}/start-match`, {
    method: 'POST', headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify({player1, player2})
  }).then(r => r.json());

export const getMatch = (matchId: string) => 
  fetch(`${API}/match/${matchId}`).then(r => r.json());

export const updateMove = (matchId: string, fen: string, move: string) => 
  fetch(`${API}/match/${matchId}/move`, {
    method: 'POST', headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify({fen, move})
  });

console.log("CheckMate Pro: Running in Firebase Permanent Mode - Data will persist");

export const deleteAcademy = async (id: string | number) => {
  await deleteDoc(doc(db, 'franchises', String(id)));
};


export interface AppUser {
  uid: string;
  email: string;
  role: 'player' | 'academy' | 'admin';
  fullName: string;
  phone: string;
  age?: number;
  eloRating?: number;
  createdBy: string; // 'self', <academy_uid>, 'admin'
  academyName?: string;
  city?: string;
  ownerName?: string;
  ownerPhone?: string;
  createdAt: string;
  username?: string;
  school?: string;
  class?: string;
  academyId?: string;
  academyCity?: string;

  // Chess Stats Metrics (Completed Match End System specs)
  totalMatches?: number;
  wins?: number;
  losses?: number;
  winStreak?: number;

  // Mode ELO Records
  tournamentWins?: number;
  botElo?: number;
  localElo?: number;
  puzzleElo?: number;
  quizElo?: number;
  localWins?: number;
  puzzlesSolved?: number;
  globalRank?: number;

  // Puzzle Level tracking variables
  puzzleRating?: number;
  puzzleData?: {
    progress?: {
      puzzleRating?: number;
      solvedPuzzleIds?: string[];
      totalSolved?: number;
      currentStreak?: number;
      bestTime?: number;
      currentDifficulty?: string;
    }
  };
}

// Ensure first-time mock users exist, like the fixed administrator: 9522528888skr@gmail.com
const getLocalUsers = (): AppUser[] => {
  const data = localStorage.getItem('cmp_users');
  let users: AppUser[] = [];
  if (data) {
    try {
      users = JSON.parse(data);
    } catch (e) {
      users = [];
    }
  }
  
  // Ensure we have the new admin account in local list
  const hasNewAdmin = users.some(u => u.email === '9522528888skr@gmail.com');
  if (!hasNewAdmin) {
    // Filter out old default admin if present
    users = users.filter(u => u.email !== 'admin@checkmatepro.com');
    users.push({
      uid: 'admin_fixed_uid_123',
      email: '9522528888skr@gmail.com',
      role: 'admin',
      fullName: 'Chief Organizer',
      phone: '917000263828',
      createdBy: 'system',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('cmp_users', JSON.stringify(users));
  }
  return users;
};

const saveLocalUsers = (users: AppUser[]) => {
  localStorage.setItem('cmp_users', JSON.stringify(users));
};

const getLocalCurrentUser = (): AppUser | null => {
  const data = localStorage.getItem('cmp_current_user');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return null;
};

const setLocalCurrentUser = (user: AppUser | null) => {
  if (user) {
    localStorage.setItem('cmp_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('cmp_current_user');
  }
};

// -------------------------------------------------------------
// HIGH-LEVEL AUTH ACTIONS (WITH BOTH REAL & FALLBACK MODES)
// -------------------------------------------------------------

// Listen to authentication changes
export const onAuthChange = (callback: (user: AppUser | null) => void) => {
  if (isConfigured && auth) {
    // If we have standard live Firebase, look up the document in Firestore
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          // Dyn import to avoid circular dependency / load order warnings
          const { doc, getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            callback({ uid: fbUser.uid, ...userDoc.data() } as AppUser);
          } else {
            // Document might be in local storage or newly registered
            const fallbackRecords = getLocalUsers();
            const matched = fallbackRecords.find(u => u.uid === fbUser.uid);
            if (matched) {
              callback(matched);
            } else {
              callback({
                uid: fbUser.uid,
                email: fbUser.email || '',
                role: 'player',
                fullName: fbUser.displayName || 'Player',
                phone: '',
                eloRating: 1200,
                botElo: 1100,
                localElo: 1050,
                puzzleElo: 1450,
                quizElo: 890,
                totalMatches: 0,
                localWins: 0,
                puzzlesSolved: 0,
                tournamentWins: 0,
                createdBy: 'self',
                createdAt: new Date().toISOString()
              });
            }
          }
        } catch (e) {
          console.error("Failed to fetch user roles, utilizing local profile matcher:", e);
          callback(getLocalCurrentUser());
        }
      } else {
        callback(null);
      }
    });
  } else {
    // Falls back to direct simulation listeners
    const checkState = () => {
      const u = getLocalCurrentUser();
      callback(u);
    };
    checkState();
    
    // Setup a simple custom window interval or event to dispatch state adjustments
    window.addEventListener('cmp-auth-changed', checkState);
    return () => {
      window.removeEventListener('cmp-auth-changed', checkState);
    };
  }
};

const dispatchAuthChange = () => {
  window.dispatchEvent(new Event('cmp-auth-changed'));
};

const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

export const checkUsernameUnique = async (username: string): Promise<boolean> => {
  const cleanUsername = username.toLowerCase().trim();
  if (isConfigured && db) {
    try {
      const { getDocs, collection, query, where, limit } = await import('firebase/firestore');
      const q = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
      let snapshot: any = null;
      try {
        snapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, 'get', 'users');
      }
      return !snapshot || snapshot.empty;
    } catch (e) {
      console.warn("Failed checking username uniqueness in Firestore:", e);
    }
  }

  // Fallback / mock
  const users = getLocalUsers();
  return !users.some(u => u.username?.toLowerCase() === cleanUsername);
};

// Player Sign Up Form
export const registerPlayer = async (fields: {
  fullName: string;
  username: string;
  age: string | number;
  phone: string;
  email: string;
  password: string;
  school: string;
  class: string;
  academyId: string;
  academyName: string;
  academyCity: string;
}): Promise<AppUser> => {
  const parsedAge = typeof fields.age === 'string' ? parseInt(fields.age) || 0 : fields.age;

  // Let's validate details to be absolutely robust
  const cleanUsername = fields.username.trim();
  if (cleanUsername.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }
  if (/\s/.test(cleanUsername)) {
    throw new Error("Username must not contain any spaces.");
  }
  if (!/^[a-zA-Z0-9]+$/.test(cleanUsername)) {
    throw new Error("Username must contain alphanumeric characters only.");
  }

  const isUnique = await checkUsernameUnique(cleanUsername);
  if (!isUnique) {
    throw new Error(`Username '${cleanUsername}' is already taken.`);
  }

  if (parsedAge < 5 || parsedAge > 100) {
    throw new Error("Age must be between 5 and 100.");
  }

  const cleanPhone = fields.phone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    throw new Error("Phone number must contain exactly 10 digits.");
  }

  if (isConfigured && auth && db) {
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      const cred = await createUserWithEmailAndPassword(auth, fields.email, fields.password);
      const uid = cred.user.uid;
      
      const newProfile: any = {
        uid,
        email: fields.email,
        role: 'player' as const,
        fullName: fields.fullName,
        username: cleanUsername.toLowerCase(),
        phone: fields.phone,
        age: parsedAge,
        school: fields.school,
        academyId: fields.academyId,
        academyName: fields.academyName,
        academyCity: fields.academyCity,
        class: fields.class,
        eloRating: 1200,
        botElo: 1100,
        localElo: 1050,
        puzzleElo: 1450,
        quizElo: 890,
        totalMatches: 0,
        localWins: 0,
        puzzlesSolved: 0,
        tournamentWins: 0,
        createdBy: 'self',
        createdAt: serverTimestamp()
      };

      try {
        await setDoc(doc(db, 'users', uid), newProfile);
      } catch (err) {
        handleFirestoreError(err, 'write', `users/${uid}`);
      }

      // Increment totalPlayers count in that academy doc by +1
      try {
        const { updateDoc, increment } = await import('firebase/firestore');
        await updateDoc(doc(db, 'academies', fields.academyId), {
          totalPlayers: increment(1)
        });
      } catch (err) {
        console.error("Failed to increment academy totalPlayers:", err);
      }

      // Sync local sandbox too
      const localProfile = { ...newProfile, createdAt: new Date().toISOString() };
      const users = getLocalUsers();
      users.push(localProfile);
      saveLocalUsers(users);

      return localProfile;
    } catch (e: any) {
      throw new Error(e.message || "Failed to create user account.");
    }
  } else {
    // Mock simulation
    const users = getLocalUsers();
    if (users.some(u => u.email.toLowerCase() === fields.email.toLowerCase())) {
      throw new Error("This email is already registered in the system.");
    }

    const mockUid = 'usr_' + Math.random().toString(36).substr(2, 9);
    const newProfile: AppUser = {
      uid: mockUid,
      email: fields.email,
      role: 'player',
      fullName: fields.fullName,
      username: cleanUsername.toLowerCase(),
      phone: fields.phone,
      age: parsedAge,
      school: fields.school,
      academyId: fields.academyId,
      academyName: fields.academyName,
      academyCity: fields.academyCity,
      class: fields.class,
      eloRating: 1200,
      botElo: 1100,
      localElo: 1050,
      puzzleElo: 1450,
      quizElo: 890,
      totalMatches: 0,
      localWins: 0,
      puzzlesSolved: 0,
      tournamentWins: 0,
      createdBy: 'self',
      createdAt: new Date().toISOString()
    };

    // Increment local academy totalPlayers count
    const academies = getLocalAcademies();
    const acadIdx = academies.findIndex(a => a.id === fields.academyId);
    if (acadIdx !== -1) {
      academies[acadIdx].totalPlayers = (academies[acadIdx].totalPlayers || 0) + 1;
      saveLocalAcademies(academies);
    }

    users.push(newProfile);
    saveLocalUsers(users);
    setLocalCurrentUser(newProfile);
    dispatchAuthChange();
    return newProfile;
  }
};

// Login standard
export const loginUser = async (email: string, password: string, tabRole: 'player' | 'academy' | 'admin'): Promise<AppUser> => {
  const cleanInputEmail = email.toLowerCase().trim();
  if (cleanInputEmail === '9522528888skr@gmail.com' && tabRole !== 'admin') {
    throw new Error('Please select correct login channel for admin account.');
  }

  // Pre-authenticating check for Admin or local mock bypasses
  if (isConfigured && auth) {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      
      // Look up role in the users col
      let userDoc: any = null;
      try {
        userDoc = await getDoc(doc(db, 'users', uid));
      } catch (err) {
        handleFirestoreError(err, 'get', `users/${uid}`);
      }

      if (userDoc && userDoc.exists()) {
        const profile = { uid, ...userDoc.data() } as AppUser;
        if (profile.role !== tabRole) {
          throw new Error(`The account belongs to role '${profile.role}'. Access denied for '${tabRole}' channel.`);
        }
        return profile;
      } else {
        // Simple fallback
        const mockUsers = getLocalUsers();
        const matched = mockUsers.find(u => u.uid === uid || u.email.toLowerCase() === email.toLowerCase());
        if (matched) {
          if (matched.role !== tabRole) {
            throw new Error(`Access denied: Required account role is '${tabRole}'. Match was '${matched.role}'.`);
          }
          return matched;
        }
        throw new Error("Matching profile document not found in Firestore.");
      }
    } catch (e: any) {
      // If configured but user is fixed admin or newly registered offline
      if (cleanInputEmail === '9522528888skr@gmail.com' && password === '1skr*skr1') {
        const users = getLocalUsers();
        const adminUser = users.find(u => u.email === '9522528888skr@gmail.com')!;
        setLocalCurrentUser(adminUser);
        dispatchAuthChange();
        return adminUser;
      }
      throw new Error(e.message || "Invalid authentication credentials.");
    }
  } else {
    // Normal storage mock execution
    const users = getLocalUsers();
    
    // Fixed password admin check
    if (cleanInputEmail === '9522528888skr@gmail.com') {
      if (password !== '1skr*skr1') {
        throw new Error("Incorrect Password for Admin account. Try '1skr*skr1'.");
      }
      const adminAcc = users.find(u => u.email === '9522528888skr@gmail.com')!;
      setLocalCurrentUser(adminAcc);
      dispatchAuthChange();
      return adminAcc;
    }

    const matched = users.find(u => u.email.toLowerCase().trim() === cleanInputEmail);
    if (!matched) {
      throw new Error("No user records match this email address.");
    }

    // Demo password validator (any password >= 6 symbols is permitted for demo state)
    if (password.length < 5) {
      throw new Error("Incorrect Password. (Required count is min 5 symbols).");
    }

    if (matched.role !== tabRole) {
      throw new Error(`Your account role is '${matched.role.toUpperCase()}'. You cannot log in via the ${tabRole.toUpperCase()} channel.`);
    }

    setLocalCurrentUser(matched);
    dispatchAuthChange();
    return matched;
  }
};

export const logoutSession = async (): Promise<void> => {
  if (isConfigured && auth) {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }
  setLocalCurrentUser(null);
  dispatchAuthChange();
};

// -------------------------------------------------------------
// USER INTEGRATED ACTIONS (ADMIN & ACADEMY)
// -------------------------------------------------------------

// Academy creates a Player Account
export const registerPlayerByAcademy = async (
  fields: {
    fullName: string;
    age: string | number;
    phone: string;
    email: string;
    password: string;
    academyName?: string;
    academyCity?: string;
  },
  academyUid: string
): Promise<AppUser> => {
  const parsedAge = typeof fields.age === 'string' ? parseInt(fields.age) || 0 : fields.age;

  if (isConfigured && auth && db) {
    // Create actual user doc mapping
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const mockUid = 'usr_' + Math.random().toString(36).substr(2, 9);
      
      const newPlayer: any = {
        uid: mockUid,
        email: fields.email,
        role: 'player' as const,
        fullName: fields.fullName,
        phone: fields.phone,
        age: parsedAge,
        eloRating: 1200,
        botElo: 1100,
        localElo: 1050,
        puzzleElo: 1450,
        quizElo: 890,
        totalMatches: 0,
        localWins: 0,
        puzzlesSolved: 0,
        tournamentWins: 0,
        createdBy: academyUid,
        academyId: academyUid,
        academyName: fields.academyName || '',
        academyCity: fields.academyCity || '',
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', mockUid), newPlayer);
      } catch (err) {
        handleFirestoreError(err, 'write', `users/${mockUid}`);
      }

      // Sync local
      const users = getLocalUsers();
      users.push(newPlayer);
      saveLocalUsers(users);

      return newPlayer;
    } catch (e: any) {
      throw new Error(e.message || "Failed to catalog player.");
    }
  } else {
    // Mock simulation
    const users = getLocalUsers();
    if (users.some(u => u.email.toLowerCase() === fields.email.toLowerCase())) {
      throw new Error("Email address belongs to an existing client.");
    }

    const mockUid = 'pusr_' + Math.random().toString(36).substr(2, 9);
    const newPlayer: AppUser = {
      uid: mockUid,
      email: fields.email,
      role: 'player',
      fullName: fields.fullName,
      phone: fields.phone,
      age: parsedAge,
      eloRating: 1200,
      botElo: 1100,
      localElo: 1050,
      puzzleElo: 1450,
      quizElo: 890,
      totalMatches: 0,
      localWins: 0,
      puzzlesSolved: 0,
      tournamentWins: 0,
      createdBy: academyUid,
      academyId: academyUid,
      academyName: fields.academyName || '',
      academyCity: fields.academyCity || '',
      createdAt: new Date().toISOString()
    };

    users.push(newPlayer);
    saveLocalUsers(users);
    return newPlayer;
  }
};

// Admin Creates an Academy Account
export const registerAcademyByAdmin = async (fields: {
  academyName: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  tempPassword?: string;
}): Promise<AppUser> => {
  // Sync with SQLITE/JSON API endpoint as requested by user
  try {
    await addAcademy({
      name: fields.academyName,
      city: fields.city,
      contact: fields.ownerName,
      phone: fields.ownerPhone
    });
  } catch (err) {
    console.error("Failed to sync registered academy to API:", err);
  }

  if (isConfigured && auth && db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const mockUid = 'acad_' + Math.random().toString(36).substr(2, 9);
      
      const newAcademy: any = {
        uid: mockUid,
        email: fields.ownerEmail,
        role: 'academy' as const,
        fullName: fields.ownerName,
        phone: fields.ownerPhone,
        academyName: fields.academyName,
        city: fields.city,
        ownerName: fields.ownerName,
        ownerPhone: fields.ownerPhone,
        createdBy: 'admin',
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', mockUid), newAcademy);
      } catch (err) {
        handleFirestoreError(err, 'write', `users/${mockUid}`);
      }

      // Sync local
      const users = getLocalUsers();
      users.push(newAcademy);
      saveLocalUsers(users);

      return newAcademy;
    } catch (e: any) {
      throw new Error(e.message || "Failed to record academy registry.");
    }
  } else {
    // Mock sandbox
    const users = getLocalUsers();
    if (users.some(u => u.email.toLowerCase() === fields.ownerEmail.toLowerCase())) {
      throw new Error("This owner email of the academy is already taken.");
    }

    const mockUid = 'acad_' + Math.random().toString(36).substr(2, 9);
    const newAcademy: AppUser = {
      uid: mockUid,
      email: fields.ownerEmail,
      role: 'academy',
      fullName: fields.ownerName,
      phone: fields.ownerPhone,
      academyName: fields.academyName,
      city: fields.city,
      ownerName: fields.ownerName,
      ownerPhone: fields.ownerPhone,
      createdBy: 'admin',
      createdAt: new Date().toISOString()
    };

    users.push(newAcademy);
    saveLocalUsers(users);
    return newAcademy;
  }
};

// Fetch players belonging to a specific academy owner
export const fetchPlayersByAcademy = async (academyUid: string): Promise<AppUser[]> => {
  if (db) {
    try {
      const q = query(collection(db, 'users'), where('academyId', '==', academyUid));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
    } catch (e) {
      console.error("Firestore fetchOfflinePlayers error:", e);
      return [];
    }
  }
  return [];
};

// Update an academy player's profile details
export const updateAcademyPlayer = async (
  playerId: string,
  updatedFields: { fullName: string; age: number; phone: string; eloRating: number; email: string }
): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc: fireDoc, updateDoc } = await import('firebase/firestore');
      const userRef = fireDoc(db, 'users', playerId);
      await updateDoc(userRef, {
        fullName: updatedFields.fullName,
        age: updatedFields.age,
        phone: updatedFields.phone,
        eloRating: updatedFields.eloRating,
        email: updatedFields.email,
      });
    } catch (e) {
      console.error("Firestore player update failed, updating local instead:", e);
      const all = getLocalUsers();
      const idx = all.findIndex(u => u.uid === playerId);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...updatedFields };
        saveLocalUsers(all);
      }
    }
  } else {
    const all = getLocalUsers();
    const idx = all.findIndex(u => u.uid === playerId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updatedFields };
      saveLocalUsers(all);
    }
  }
};

// Fetch all registered academies (useful for the Admin dashboard summary)
export const fetchAllAcademies = getAcademies;

// Check if Firebase is currently in mock-mode
export const isMockActive = () => {
  return !isConfigured;
};

export interface Match {
  id?: string;
  playerId: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  eloChange: number;
  oldElo: number;
  newElo: number;
  gameType: string;
  date: string;
  duration: number; // in seconds

  // Expanded Fields (Complete Match End System specs)
  userId?: string;
  opponentId?: string;
  opponentName?: string;
  userColor?: 'w' | 'b';
  reason?: string;
  eloBefore?: number;
  eloAfter?: number;
  pointsChange?: number;
  moves?: string[];
  pgn?: string;
  timestamp?: string;
  academyId?: string;
}

// Get local matches simulation
export const getLocalMatches = (playerId: string): Match[] => {
  const data = localStorage.getItem(`cmp_matches_${playerId}`);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
};

// Save match locally
export const saveLocalMatch = (playerId: string, match: Match) => {
  const list = getLocalMatches(playerId);
  list.push(match);
  localStorage.setItem(`cmp_matches_${playerId}`, JSON.stringify(list));
};

export const saveMatchAndUpdateElo = async (
  playerId: string, 
  matchData: Omit<Match, 'id'>,
  gameMode: 'local' | 'ai' | 'online' | 'tournament' = 'online'
): Promise<{ newElo: number }> => {
  let oldElo = matchData.oldElo;
  let newElo = matchData.newElo;

  let resolvedTotalMatches = 0;
  let resolvedWins = 0;
  let resolvedLosses = 0;
  let resolvedWinStreak = 0;

  let resolvedLocalElo = 1050;
  let resolvedLocalWins = 0;
  let resolvedBotElo = 1100;
  let resolvedTournamentWins = 0;
  let resolvedEloRating = 1200;

  // 1. Update user profile
  if (isConfigured && db) {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', playerId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const udata = userSnap.data();
        resolvedTotalMatches = udata.totalMatches || 0;
        resolvedWins = udata.wins || 0;
        resolvedLosses = udata.losses || 0;
        resolvedWinStreak = udata.winStreak || 0;

        resolvedLocalElo = udata.localElo !== undefined ? udata.localElo : 1050;
        resolvedLocalWins = udata.localWins || 0;
        resolvedBotElo = udata.botElo !== undefined ? udata.botElo : 1100;
        resolvedTournamentWins = udata.tournamentWins || 0;
        resolvedEloRating = udata.eloRating !== undefined ? udata.eloRating : 1200;
      }

      const updates: any = {};

      if (gameMode === 'ai') {
        const change = matchData.result === 'win' ? 10 : matchData.result === 'loss' ? -8 : 0;
        resolvedBotElo = Math.max(100, resolvedBotElo + change);
        updates.botElo = resolvedBotElo;
        matchData.oldElo = resolvedBotElo - change;
        matchData.newElo = resolvedBotElo;
        matchData.eloChange = change;
        newElo = resolvedBotElo;
      } else if (gameMode === 'local') {
        const change = matchData.result === 'win' ? 15 : matchData.result === 'loss' ? -10 : 0;
        resolvedLocalElo = Math.max(100, resolvedLocalElo + change);
        if (matchData.result === 'win') {
          resolvedLocalWins += 1;
        }
        updates.localElo = resolvedLocalElo;
        updates.localWins = resolvedLocalWins;
        matchData.oldElo = resolvedLocalElo - change;
        matchData.newElo = resolvedLocalElo;
        matchData.eloChange = change;
        newElo = resolvedLocalElo;
      } else {
        // ONLINE PVP or TOURNAMENT
        resolvedTotalMatches += 1;
        if (matchData.result === 'win') {
          resolvedWins += 1;
          resolvedWinStreak += 1;
          if (gameMode === 'tournament') {
            resolvedTournamentWins += 1;
          }
        } else if (matchData.result === 'loss') {
          resolvedLosses += 1;
          resolvedWinStreak = 0;
        } else {
          resolvedWinStreak = 0;
        }

        updates.eloRating = newElo;
        updates.totalMatches = resolvedTotalMatches;
        updates.wins = resolvedWins;
        updates.losses = resolvedLosses;
        updates.winStreak = resolvedWinStreak;
        if (gameMode === 'tournament') {
          updates.tournamentWins = resolvedTournamentWins;
        }
      }

      await updateDoc(userRef, updates);
    } catch (e) {
      console.error("Failed to update Firestore user rating / stats:", e);
    }

    // 2. Save match to matches collection
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'matches'), {
        ...matchData,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, 'write', 'matches');
    }
  } else {
    // Determine stats from local players list
    const users = getLocalUsers();
    const matchedIdx = users.findIndex(u => u.uid === playerId);
    if (matchedIdx !== -1) {
      resolvedTotalMatches = users[matchedIdx].totalMatches || 0;
      resolvedWins = users[matchedIdx].wins || 0;
      resolvedLosses = users[matchedIdx].losses || 0;
      resolvedWinStreak = users[matchedIdx].winStreak || 0;

      resolvedLocalElo = users[matchedIdx].localElo !== undefined ? users[matchedIdx].localElo : 1050;
      resolvedLocalWins = users[matchedIdx].localWins || 0;
      resolvedBotElo = users[matchedIdx].botElo !== undefined ? users[matchedIdx].botElo : 1100;
      resolvedTournamentWins = users[matchedIdx].tournamentWins || 0;
      resolvedEloRating = users[matchedIdx].eloRating !== undefined ? users[matchedIdx].eloRating : 1200;
    }

    if (gameMode === 'ai') {
      const change = matchData.result === 'win' ? 10 : matchData.result === 'loss' ? -8 : 0;
      resolvedBotElo = Math.max(100, resolvedBotElo + change);
      matchData.oldElo = resolvedBotElo - change;
      matchData.newElo = resolvedBotElo;
      matchData.eloChange = change;
      newElo = resolvedBotElo;
    } else if (gameMode === 'local') {
      const change = matchData.result === 'win' ? 15 : matchData.result === 'loss' ? -10 : 0;
      resolvedLocalElo = Math.max(100, resolvedLocalElo + change);
      if (matchData.result === 'win') {
        resolvedLocalWins += 1;
      }
      matchData.oldElo = resolvedLocalElo - change;
      matchData.newElo = resolvedLocalElo;
      matchData.eloChange = change;
      newElo = resolvedLocalElo;
    } else {
      // ONLINE PVP or TOURNAMENT
      resolvedTotalMatches += 1;
      if (matchData.result === 'win') {
        resolvedWins += 1;
        resolvedWinStreak += 1;
        if (gameMode === 'tournament') {
          resolvedTournamentWins += 1;
        }
      } else if (matchData.result === 'loss') {
        resolvedLosses += 1;
        resolvedWinStreak = 0;
      } else {
        resolvedWinStreak = 0;
      }
      resolvedEloRating = newElo;
    }
  }

  // Update in local records too
  const users = getLocalUsers();
  const matchedIdx = users.findIndex(u => u.uid === playerId);
  if (matchedIdx !== -1) {
    if (gameMode === 'ai') {
      users[matchedIdx].botElo = resolvedBotElo;
    } else if (gameMode === 'local') {
      users[matchedIdx].localElo = resolvedLocalElo;
      users[matchedIdx].localWins = resolvedLocalWins;
    } else {
      users[matchedIdx].eloRating = resolvedEloRating;
      users[matchedIdx].totalMatches = resolvedTotalMatches;
      users[matchedIdx].wins = resolvedWins;
      users[matchedIdx].losses = resolvedLosses;
      users[matchedIdx].winStreak = resolvedWinStreak;
      if (gameMode === 'tournament') {
        users[matchedIdx].tournamentWins = resolvedTournamentWins;
      }
    }
    saveLocalUsers(users);
  }

  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === playerId) {
    if (gameMode === 'ai') {
      currentUser.botElo = resolvedBotElo;
    } else if (gameMode === 'local') {
      currentUser.localElo = resolvedLocalElo;
      currentUser.localWins = resolvedLocalWins;
    } else {
      currentUser.eloRating = resolvedEloRating;
      currentUser.totalMatches = resolvedTotalMatches;
      currentUser.wins = resolvedWins;
      currentUser.losses = resolvedLosses;
      currentUser.winStreak = resolvedWinStreak;
      if (gameMode === 'tournament') {
        currentUser.tournamentWins = resolvedTournamentWins;
      }
    }
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }

  saveLocalMatch(playerId, { ...matchData, id: 'm_' + Math.random().toString(36).substr(2, 9) });

  return { newElo };
};

export const fetchMatches = async (playerId: string): Promise<Match[]> => {
  if (isConfigured && db) {
    try {
      const { getDocs, collection, query, where } = await import('firebase/firestore');
      const q = query(
        collection(db, 'matches'),
        where('playerId', '==', playerId)
      );

      let snapshot: any = null;
      try {
        snapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, 'get', 'matches');
      }

      if (snapshot) {
        const list: Match[] = [];
        snapshot.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() } as Match);
        });
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return list;
      }
      return [];
    } catch (e) {
      console.warn("Failed fetching matches from Firestore, falling back to local storage:", e);
      const local = getLocalMatches(playerId);
      local.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return local;
    }
  } else {
    const local = getLocalMatches(playerId);
    local.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return local;
  }
};

export interface AcademyDoc {
  id: string;
  name: string;
  city: string;
  totalPlayers: number;
}

export const getLocalAcademies = (): AcademyDoc[] => {
  const data = localStorage.getItem('cmp_academies');
  let list: AcademyDoc[] = [];
  if (data) {
    try {
      list = JSON.parse(data);
    } catch (e) {
      list = [];
    }
  }
  // Seed default if empty
  if (list.length === 0) {
    list = [
      {
        id: 'sumeet_rasela_parasia',
        name: 'Sumeet Rasela',
        city: 'Parasia',
        totalPlayers: 0
      }
    ];
    localStorage.setItem('cmp_academies', JSON.stringify(list));
  }
  return list;
};

export const saveLocalAcademies = (list: AcademyDoc[]) => {
  localStorage.setItem('cmp_academies', JSON.stringify(list));
};

export const subscribeToAcademies = (callback: (academies: AcademyDoc[]) => void) => {
  let active = true;

  const poll = async () => {
    try {
      const res = await fetch(`/api/academies`);
      if (!res.ok) throw new Error('Failed to fetch from backend API');
      const rows = await res.json();
      if (!active) return;
      
      const mapped: AcademyDoc[] = rows.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        city: r.city,
        totalPlayers: r.totalPlayers || 0
      }));

      callback(mapped);
    } catch (e) {
      console.warn("Falling back to local storage academies", e);
      if (active) {
        callback(getLocalAcademies());
      }
    }
  };

  poll();
  const interval = setInterval(poll, 3000);

  return () => {
    active = false;
    clearInterval(interval);
  };
};

export interface LiveGameDoc {
  id: string;
  whitePlayer: string;
  whiteElo: number;
  blackPlayer: string;
  blackElo: number;
  fen: string;
  turn: 'w' | 'b';
  moves: string[];
  spectators: number;
  academyName?: string;
  status: 'active' | 'completed';
  winner: 'w' | 'b' | 'draw' | null;
  lastUpdated: string;
}

export const getLocalLiveGames = (): LiveGameDoc[] => {
  const data = localStorage.getItem('cmp_live_games');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
};

export const saveLocalLiveGames = (games: LiveGameDoc[]) => {
  localStorage.setItem('cmp_live_games', JSON.stringify(games));
};

export const createLiveGame = async (
  whitePlayer: string,
  whiteElo: number,
  blackPlayer: string,
  blackElo: number,
  academyName?: string
): Promise<string> => {
  const gameId = 'live_' + Math.random().toString(36).substring(2, 11);
  const initialData: Omit<LiveGameDoc, 'id'> = {
    whitePlayer,
    whiteElo,
    blackPlayer,
    blackElo,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    moves: [],
    spectators: 0,
    academyName: academyName || '',
    status: 'active',
    winner: null,
    lastUpdated: new Date().toISOString()
  };

  if (isConfigured && db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'liveGames', gameId), initialData);
    } catch (e) {
      console.error("Firestore liveGames create failed. Falling back to local storage:", e);
    }
  }

  const localList = getLocalLiveGames();
  localList.push({ id: gameId, ...initialData });
  saveLocalLiveGames(localList);

  return gameId;
};

export const updateLiveGame = async (
  gameId: string,
  fen: string,
  moves: string[],
  turn: 'w' | 'b',
  status: 'active' | 'completed',
  winner: 'w' | 'b' | 'draw' | null
): Promise<void> => {
  const lastUpdated = new Date().toISOString();
  if (status === 'completed') {
    if (isConfigured && db) {
      try {
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'liveGames', gameId));
      } catch (e) {
        console.error("Firestore liveGames delete failed on completion:", e);
      }
    }
    const localList = getLocalLiveGames();
    const filtered = localList.filter((g) => g.id !== gameId);
    saveLocalLiveGames(filtered);
    return;
  }

  if (isConfigured && db) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'liveGames', gameId), {
        fen,
        moves,
        turn,
        status,
        winner,
        lastUpdated
      });
    } catch (e) {
      console.error("Firestore liveGames update failed:", e);
    }
  }

  const localList = getLocalLiveGames();
  const index = localList.findIndex((g) => g.id === gameId);
  if (index !== -1) {
    localList[index] = {
      ...localList[index],
      fen,
      moves,
      turn,
      status,
      winner,
      lastUpdated
    };
    saveLocalLiveGames(localList);
  }
};

export const subscribeToLiveGame = (gameId: string, callback: (game: LiveGameDoc | null) => void) => {
  if (isConfigured && db) {
    let unsubscribed = false;
    let unsubFirestore: (() => void) | null = null;

    const setupStream = async () => {
      try {
        const { doc, onSnapshot } = await import('firebase/firestore');
        const docRef = doc(db, 'liveGames', gameId);

        if (unsubscribed) return;

        unsubFirestore = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            callback({
              id: snapshot.id,
              whitePlayer: data.whitePlayer || '',
              whiteElo: data.whiteElo || 1000,
              blackPlayer: data.blackPlayer || '',
              blackElo: data.blackElo || 1000,
              fen: data.fen || '',
              turn: data.turn || 'w',
              moves: data.moves || [],
              spectators: data.spectators || 0,
              academyName: data.academyName || '',
              status: data.status || 'active',
              winner: data.winner || null,
              lastUpdated: data.lastUpdated || ''
            });
          } else {
            const localList = getLocalLiveGames();
            const found = localList.find((g) => g.id === gameId) || null;
            callback(found);
          }
        }, (error) => {
          console.error("onSnapshot error for liveGame, falling back:", error);
          const localList = getLocalLiveGames();
          const found = localList.find((g) => g.id === gameId) || null;
          callback(found);
        });
      } catch (e) {
        console.warn("Failed initializing real-time liveGame stream, using local:", e);
        const localList = getLocalLiveGames();
        const found = localList.find((g) => g.id === gameId) || null;
        callback(found);
      }
    };

    setupStream();

    return () => {
      unsubscribed = true;
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  } else {
    const findAndCallback = () => {
      const localList = getLocalLiveGames();
      const found = localList.find((g) => g.id === gameId) || null;
      callback(found);
    };

    findAndCallback();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cmp_live_games') {
        findAndCallback();
      }
    };

    const interval = setInterval(findAndCallback, 1500);
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }
};

export const subscribeToAllLiveGames = (callback: (games: LiveGameDoc[]) => void) => {
  if (isConfigured && db) {
    let unsubscribed = false;
    let unsubFirestore: (() => void) | null = null;

    const setupStream = async () => {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        const collRef = collection(db, 'liveGames');

        if (unsubscribed) return;

        unsubFirestore = onSnapshot(collRef, (snapshot) => {
          const list: LiveGameDoc[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const rawStatus = (data.status === 'active') ? 'active' : 'completed';
            if (rawStatus === 'completed') return;
            list.push({
              id: docSnap.id,
              whitePlayer: data.whitePlayer || '',
              whiteElo: data.whiteElo || 1000,
              blackPlayer: data.blackPlayer || '',
              blackElo: data.blackElo || 1000,
              fen: data.fen || '',
              turn: data.turn || 'w',
              moves: data.moves || [],
              spectators: data.spectators || 0,
              academyName: data.academyName || '',
              status: rawStatus,
              winner: data.winner || null,
              lastUpdated: data.lastUpdated || ''
            });
          });
          callback(list);
        }, (error) => {
          console.error("onSnapshot error for all liveGames, falling back:", error);
          callback(getLocalLiveGames().filter(g => g.status === 'active'));
        });
      } catch (e) {
        console.warn("Failed initializing real-time all liveGames stream, using local:", e);
        callback(getLocalLiveGames().filter(g => g.status === 'active'));
      }
    };

    setupStream();

    return () => {
      unsubscribed = true;
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  } else {
    const findAndCallback = async () => {
      try {
        const response = await fetch('/api/active-matches');
        if (response.ok) {
          const dbMatches = await response.json();
          const mappedMatches: LiveGameDoc[] = dbMatches
            .filter((m: any) => m.status === 'live')
            .map((m: any) => {
            let turn: 'w' | 'b' = 'w';
            if (m.fen && typeof m.fen === 'string') {
              const parts = m.fen.split(' ');
              if (parts[1] === 'b') {
                turn = 'b';
              }
            }
            let parsedMoves: string[] = [];
            try {
              if (m.moves) {
                parsedMoves = typeof m.moves === 'string' ? JSON.parse(m.moves) : m.moves;
              }
            } catch (err) {}

            return {
              id: m.match_id || String(m.id),
              whitePlayer: m.player1 || '',
              whiteElo: 1200,
              blackPlayer: m.player2 || '',
              blackElo: 1200,
              fen: m.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              turn,
              moves: parsedMoves,
              spectators: 1,
              academyName: 'CheckMate Pro Academy',
              status: m.status === 'live' ? 'active' : 'completed',
              winner: m.winner === 'player1' ? 'w' : m.winner === 'player2' ? 'b' : m.winner === 'draw' ? 'draw' : null,
              lastUpdated: m.createdAt || ''
            };
          });

          // Merge with unique local list for robust fallback - strictly omit completed/ended/cancelled entries
          const localList = getLocalLiveGames().filter(g => g.status === 'active');
          const merged = [...mappedMatches];
          for (const localG of localList) {
            if (!merged.some(g => g.id === localG.id)) {
              merged.push(localG);
            }
          }

          // Extra safety: Frontend pe bhi duplicate hata de (same player pair)
          const uniqueMatches = merged.filter((match, index, self) =>
            index === self.findIndex(m => 
              (m.whitePlayer === match.whitePlayer && m.blackPlayer === match.blackPlayer) ||
              (m.whitePlayer === match.blackPlayer && m.blackPlayer === match.whitePlayer)
            )
          );

          callback(uniqueMatches);
        } else {
          callback(getLocalLiveGames().filter(g => g.status === 'active'));
        }
      } catch (e) {
        console.warn("Failed fetching from /api/active-matches, utilizing local fallback:", e);
        callback(getLocalLiveGames().filter(g => g.status === 'active'));
      }
    };

    findAndCallback();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cmp_live_games') {
        findAndCallback();
      }
    };

    const interval = setInterval(findAndCallback, 3000);
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }
};

export const incrementSpectators = async (gameId: string): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      await updateDoc(doc(db, 'liveGames', gameId), {
        spectators: increment(1)
      });
    } catch (e) {
      console.error("Failed to increment spectators on Firestore:", e);
    }
  }

  const localList = getLocalLiveGames();
  const index = localList.findIndex((g) => g.id === gameId);
  if (index !== -1) {
    localList[index].spectators = (localList[index].spectators || 0) + 1;
    saveLocalLiveGames(localList);
  }
};

export const decrementSpectators = async (gameId: string): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      await updateDoc(doc(db, 'liveGames', gameId), {
        spectators: increment(-1)
      });
    } catch (e) {
      console.error("Failed to decrement spectators on Firestore:", e);
    }
  }

  const localList = getLocalLiveGames();
  const index = localList.findIndex((g) => g.id === gameId);
  if (index !== -1) {
    localList[index].spectators = Math.max(0, (localList[index].spectators || 0) - 1);
    saveLocalLiveGames(localList);
  }
};


// -------------------------------------------------------------
// EVENTS MANAGEMENT INTERFACES & FUNCTIONS
// -------------------------------------------------------------

export interface EventDoc {
  id: string;
  title: string;
  description: string;
  eventType: 'Tournament' | 'Workshop' | 'Camp';
  academyId: string; // If empty string, it's global (All Academies)
  academyName: string;
  startDate: string; // ISO timestamp
  endDate: string; // ISO timestamp
  location: string;
  entryFee: number;
  maxPlayers: number;
  registeredPlayers: string[]; // array of userIds
  status: 'Upcoming' | 'Live' | 'Completed';
  bannerImage: string;
  createdBy: string;
  createdAt: string;
  winnerName?: string;
  winnerPhoto?: string;
}

const getLocalEvents = (): EventDoc[] => {
  const data = localStorage.getItem('cmp_events');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  
  // Start with default seed events for beautiful high quality mock view out of the box
  const defaultEvents: EventDoc[] = [
    {
      id: 'event_default_1',
      title: 'Winter Chess Championship 2026',
      description: 'The premier junior championship open for all academy student players. Prizes value up to ₹50,000!',
      eventType: 'Tournament',
      academyId: '', // Open for all
      academyName: 'All Academies',
      startDate: new Date(Date.now() + 86400 * 5 * 1000).toISOString(), // 5 days from now
      endDate: new Date(Date.now() + 86400 * 6 * 1000).toISOString(),
      location: 'Parasia Town Hall Center / Online',
      entryFee: 500,
      maxPlayers: 100,
      registeredPlayers: [],
      status: 'Upcoming',
      bannerImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&auto=format&fit=crop&q=60',
      createdBy: 'admin_fixed_uid_123',
      createdAt: new Date().toISOString()
    },
    {
      id: 'event_default_2',
      title: 'Grandmaster Tactics Workshop',
      description: 'An elite technical workshop covering speed calculation, coordinate training, spatial vision, and middle game motifs.',
      eventType: 'Workshop',
      academyId: '',
      academyName: 'Sumeet Rasela Academy',
      startDate: new Date().toISOString(), // Live Now
      endDate: new Date(Date.now() + 3600 * 4 * 1000).toISOString(),
      location: 'Sumeet Rasela Academy Main Hall',
      entryFee: 0, // Free
      maxPlayers: 50,
      registeredPlayers: [],
      status: 'Live',
      bannerImage: 'https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?w=600&auto=format&fit=crop&q=60',
      createdBy: 'admin_fixed_uid_123',
      createdAt: new Date().toISOString()
    },
    {
      id: 'event_default_3',
      title: 'Monsoon Junior Boot Camp 2026',
      description: 'A dedicated junior development camp focusing on opening structures and endgames.',
      eventType: 'Camp',
      academyId: '',
      academyName: 'System Hub Club',
      startDate: new Date(Date.now() - 86400 * 10 * 1000).toISOString(), // Completed
      endDate: new Date(Date.now() - 86450 * 9 * 1000).toISOString(),
      location: 'Parasia Library Hall',
      entryFee: 200,
      maxPlayers: 30,
      registeredPlayers: [],
      status: 'Completed',
      bannerImage: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=600&auto=format&fit=crop&q=60',
      createdBy: 'admin_fixed_uid_123',
      createdAt: new Date().toISOString(),
      winnerName: 'Dhyan Rasela',
      winnerPhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'
    }
  ];
  localStorage.setItem('cmp_events', JSON.stringify(defaultEvents));
  return defaultEvents;
};

const saveLocalEvents = (events: EventDoc[]) => {
  localStorage.setItem('cmp_events', JSON.stringify(events));
};

export const createEvent = async (eventData: Omit<EventDoc, 'id'>): Promise<string> => {
  const generatedId = 'evt_' + Math.random().toString(36).substring(2, 10);
  const newEvent: EventDoc = { id: generatedId, ...eventData };

  if (isConfigured && db) {
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'events'), eventData);
      return docRef.id;
    } catch (e) {
      console.error("Firestore event creation failed, creating locally:", e);
    }
  }

  const localList = getLocalEvents();
  localList.push(newEvent);
  saveLocalEvents(localList);
  return generatedId;
};

export const updateEvent = async (eventId: string, updatedFields: Partial<EventDoc>): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const fields = { ...updatedFields };
      delete fields.id;
      await updateDoc(doc(db, 'events', eventId), fields as any);
    } catch (e) {
      console.error("Firestore event update failed:", e);
    }
  }

  const localList = getLocalEvents();
  const index = localList.findIndex(e => e.id === eventId);
  if (index !== -1) {
    localList[index] = { ...localList[index], ...updatedFields };
    saveLocalEvents(localList);
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'events', eventId));
    } catch (e) {
      console.error("Firestore event delete failed:", e);
    }
  }

  const localList = getLocalEvents();
  const updated = localList.filter(e => e.id !== eventId);
  saveLocalEvents(updated);
};

export const registerForEvent = async (eventId: string, userId: string): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      await updateDoc(doc(db, 'events', eventId), {
        registeredPlayers: arrayUnion(userId)
      } as any);
    } catch (e) {
      console.error("Firestore event registration failed, updating locally:", e);
    }
  }

  const localList = getLocalEvents();
  const index = localList.findIndex(e => e.id === eventId);
  if (index !== -1) {
    if (!localList[index].registeredPlayers.includes(userId)) {
      localList[index].registeredPlayers.push(userId);
      saveLocalEvents(localList);
    }
  }
};

export const subscribeToAllEvents = (callback: (list: EventDoc[]) => void): () => void => {
  if (isConfigured && db) {
    let unsubscribed = false;
    let unsubFirestore: (() => void) | null = null;

    const setupStream = async () => {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        const collRef = collection(db, 'events');
        
        if (unsubscribed) return;

        unsubFirestore = onSnapshot(collRef, (snapshot) => {
          const list: EventDoc[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              title: data.title || '',
              description: data.description || '',
              eventType: data.eventType || 'Tournament',
              academyId: data.academyId || '',
              academyName: data.academyName || '',
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              location: data.location || '',
              entryFee: Number(data.entryFee) || 0,
              maxPlayers: Number(data.maxPlayers) || 150,
              registeredPlayers: data.registeredPlayers || [],
              status: data.status || 'Upcoming',
              bannerImage: data.bannerImage || '',
              createdBy: data.createdBy || '',
              createdAt: data.createdAt || '',
              winnerName: data.winnerName || '',
              winnerPhoto: data.winnerPhoto || ''
            });
          });
          callback(list);
        }, (error) => {
          console.error("onSnapshot error for events, using local fallback:", error);
          callback(getLocalEvents());
        });
      } catch (e) {
        console.warn("Failed initializing real-time events stream, using local:", e);
        callback(getLocalEvents());
      }
    };

    setupStream();

    return () => {
      unsubscribed = true;
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  } else {
    // Local Fallback Listener
    const findAndCallback = () => {
      callback(getLocalEvents());
    };

    // Execute immediately
    findAndCallback();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cmp_events') {
        findAndCallback();
      }
    };

    const interval = setInterval(findAndCallback, 1500);
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }
};

// Authoritative user resolver list fetching
export const fetchAllUsers = async (): Promise<AppUser[]> => {
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
    } catch (e) {
      console.error("Firestore fetchAllUsers error:", e);
      return [];
    }
  }
  return [];
};

export const subscribeToAllUsers = (callback: (list: AppUser[]) => void): () => void => {
  if (isConfigured && db) {
    let unsubscribed = false;
    let unsubFirestore: (() => void) | null = null;

    const setupStream = async () => {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        const collRef = collection(db, 'users');
        
        if (unsubscribed) return;

        unsubFirestore = onSnapshot(collRef, (snapshot) => {
          const list: AppUser[] = [];
          snapshot.forEach((doc) => {
            list.push({ uid: doc.id, ...doc.data() } as AppUser);
          });
          callback(list);
        }, (error) => {
          console.error("onSnapshot error for users, using local fallback:", error);
          callback(getLocalUsers());
        });
      } catch (e) {
        console.warn("Failed initializing real-time users stream, using local:", e);
        callback(getLocalUsers());
      }
    };

    setupStream();

    return () => {
      unsubscribed = true;
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  } else {
    const findAndCallback = () => {
      callback(getLocalUsers());
    };

    findAndCallback();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cmp_users') {
        findAndCallback();
      }
    };

    const interval = setInterval(findAndCallback, 1500);
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }
};

export const getAllLocalMatches = (): Match[] => {
  const users = getLocalUsers();
  let all: Match[] = [];
  users.forEach(u => {
    const list = getLocalMatches(u.uid);
    all.push(...list);
  });
  return all;
};

export const fetchAllMatches = async (): Promise<Match[]> => {
  if (isConfigured && db) {
    try {
      const { getDocs, collection } = await import('firebase/firestore');
      const collRef = collection(db, 'matches');
      const snapshot = await getDocs(collRef);
      const list: Match[] = [];
      snapshot.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() } as Match);
      });
      return list;
    } catch (e) {
      console.warn("Falling back to local matches:", e);
      return getAllLocalMatches();
    }
  } else {
    return getAllLocalMatches();
  }
};

export const subscribeToAllMatches = (callback: (list: Match[]) => void): () => void => {
  if (isConfigured && db) {
    let unsubscribed = false;
    let unsubFirestore: (() => void) | null = null;

    const setupStream = async () => {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        const collRef = collection(db, 'matches');
        
        if (unsubscribed) return;

        unsubFirestore = onSnapshot(collRef, (snapshot) => {
          const list: Match[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Match);
          });
          callback(list);
        }, (error) => {
          console.error("onSnapshot error for matches, using local fallback:", error);
          callback(getAllLocalMatches());
        });
      } catch (e) {
        console.warn("Failed initializing real-time matches stream, using local:", e);
        callback(getAllLocalMatches());
      }
    };

    setupStream();

    return () => {
      unsubscribed = true;
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  } else {
    const findAndCallback = () => {
      callback(getAllLocalMatches());
    };

    findAndCallback();

    const interval = setInterval(findAndCallback, 1500);
    return () => {
      clearInterval(interval);
    };
  }
};


// -------------------------------------------------------------
// SEPARATE RATING SYSTEM - STRICTLY ISOLATED (RULE D)
// -------------------------------------------------------------

export const updateMatchElo = async (userId: string, change: number): Promise<number> => {
  // Updates ONLY users/{userId}.eloRating
  // Called only from: Checkmate/Stalemate/Timeout in Play mode
  let updatedElo = 1200;
  if (isConfigured && db) {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentElo = data.eloRating !== undefined ? data.eloRating : 1200;
        updatedElo = Math.max(100, currentElo + change);
        await updateDoc(userRef, { eloRating: updatedElo });
      }
    } catch (e) {
      console.error("Firestore updateMatchElo failed:", e);
    }
  }

  // Always mirror in localStorage for offline play & immediate feed integration
  const users = getLocalUsers();
  const index = users.findIndex(u => u.uid === userId);
  if (index !== -1) {
    const currentElo = users[index].eloRating !== undefined ? users[index].eloRating : 1200;
    updatedElo = Math.max(100, currentElo + change);
    users[index].eloRating = updatedElo;
    saveLocalUsers(users);
  }

  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    currentUser.eloRating = updatedElo;
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }
  return updatedElo;
};

export const updateBotElo = async (userId: string, change: number): Promise<number> => {
  let updatedElo = 1100;
  if (isConfigured && db) {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentElo = data.botElo !== undefined ? data.botElo : 1100;
        updatedElo = Math.max(100, currentElo + change);
        await updateDoc(userRef, { botElo: updatedElo });
      }
    } catch (e) {
      console.error("Firestore updateBotElo failed:", e);
    }
  }

  // Mirror locally
  const users = getLocalUsers();
  const index = users.findIndex(u => u.uid === userId);
  if (index !== -1) {
    const currentElo = users[index].botElo !== undefined ? users[index].botElo : 1100;
    updatedElo = Math.max(100, currentElo + change);
    users[index].botElo = updatedElo;
    saveLocalUsers(users);
  }

  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    const currentElo = currentUser.botElo !== undefined ? currentUser.botElo : 1100;
    currentUser.botElo = Math.max(100, currentElo + change);
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }
  return updatedElo;
};

export const updateLocalElo = async (userId: string, change: number, isWin?: boolean): Promise<number> => {
  let updatedElo = 1050;
  let resolvedLocalWins = 0;
  if (isConfigured && db) {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentElo = data.localElo !== undefined ? data.localElo : 1050;
        updatedElo = Math.max(100, currentElo + change);
        resolvedLocalWins = (data.localWins || 0) + (isWin ? 1 : 0);
        await updateDoc(userRef, { 
          localElo: updatedElo,
          localWins: resolvedLocalWins
        });
      }
    } catch (e) {
      console.error("Firestore updateLocalElo failed:", e);
    }
  }

  // Mirror locally
  const users = getLocalUsers();
  const index = users.findIndex(u => u.uid === userId);
  if (index !== -1) {
    const currentElo = users[index].localElo !== undefined ? users[index].localElo : 1050;
    updatedElo = Math.max(100, currentElo + change);
    resolvedLocalWins = (users[index].localWins || 0) + (isWin ? 1 : 0);
    users[index].localElo = updatedElo;
    users[index].localWins = resolvedLocalWins;
    saveLocalUsers(users);
  }

  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    const currentElo = currentUser.localElo !== undefined ? currentUser.localElo : 1050;
    currentUser.localElo = Math.max(100, currentElo + change);
    currentUser.localWins = (currentUser.localWins || 0) + (isWin ? 1 : 0);
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }
  return updatedElo;
};

export const updatePuzzleElo = async (userId: string, change: number, isCorrect?: boolean): Promise<number> => {
  let updatedElo = 1450;
  let resolvedPuzzlesSolved = 0;
  if (isConfigured && db) {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentElo = data.puzzleElo !== undefined ? data.puzzleElo : 1450;
        updatedElo = Math.max(100, currentElo + change);
        resolvedPuzzlesSolved = (data.puzzlesSolved || 0) + (isCorrect ? 1 : 0);
        await updateDoc(userRef, { 
          puzzleElo: updatedElo,
          puzzlesSolved: resolvedPuzzlesSolved
        });
      }
    } catch (e) {
      console.error("Firestore updatePuzzleElo failed:", e);
    }
  }

  // Mirror locally
  const users = getLocalUsers();
  const index = users.findIndex(u => u.uid === userId);
  if (index !== -1) {
    const currentElo = users[index].puzzleElo !== undefined ? users[index].puzzleElo : 1450;
    updatedElo = Math.max(100, currentElo + change);
    resolvedPuzzlesSolved = (users[index].puzzlesSolved || 0) + (isCorrect ? 1 : 0);
    users[index].puzzleElo = updatedElo;
    users[index].puzzlesSolved = resolvedPuzzlesSolved;
    saveLocalUsers(users);
  }

  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    const currentElo = currentUser.puzzleElo !== undefined ? currentUser.puzzleElo : 1450;
    currentUser.puzzleElo = Math.max(100, currentElo + change);
    currentUser.puzzlesSolved = (currentUser.puzzlesSolved || 0) + (isCorrect ? 1 : 0);
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }
  return updatedElo;
};

export const updateQuizElo = async (userId: string, change: number): Promise<number> => {
  let updatedElo = 890;
  if (isConfigured && db) {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentElo = data.quizElo !== undefined ? data.quizElo : 890;
        updatedElo = Math.max(100, currentElo + change);
        await updateDoc(userRef, { quizElo: updatedElo });
      }
    } catch (e) {
      console.error("Firestore updateQuizElo failed:", e);
    }
  }

  // Mirror locally
  const users = getLocalUsers();
  const index = users.findIndex(u => u.uid === userId);
  if (index !== -1) {
    const currentElo = users[index].quizElo !== undefined ? users[index].quizElo : 890;
    updatedElo = Math.max(100, currentElo + change);
    users[index].quizElo = updatedElo;
    saveLocalUsers(users);
  }

  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    const currentElo = currentUser.quizElo !== undefined ? currentUser.quizElo : 890;
    currentUser.quizElo = Math.max(100, currentElo + change);
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }
  return updatedElo;
};

export const updatePuzzleRating = async (userId: string, change: number): Promise<number> => {
  // Updates ONLY users/{userId}/puzzleData/progress.puzzleRating  
  // Called only from: Puzzle solve correct/wrong
  let updatedPuzzleRating = 1200;
  
  if (isConfigured && db) {
    try {
      const { doc, getDoc, setDoc, updateDoc } = await import('firebase/firestore');
      const progressRef = doc(db, 'users', userId, 'puzzleData', 'progress');
      const snap = await getDoc(progressRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentPuzzleRating = data.puzzleRating !== undefined ? data.puzzleRating : 1200;
        updatedPuzzleRating = Math.max(100, currentPuzzleRating + change);
        await updateDoc(progressRef, { puzzleRating: updatedPuzzleRating });
      } else {
        updatedPuzzleRating = Math.max(100, 1200 + change);
        await setDoc(progressRef, {
          puzzleRating: updatedPuzzleRating,
          solvedPuzzleIds: [],
          totalSolved: 0,
          currentStreak: 0,
          bestTime: 999,
          currentDifficulty: "Easy"
        });
      }

      // Mirror on users/{userId} object for ease of leaderboard querying
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { puzzleRating: updatedPuzzleRating });
    } catch (e) {
      console.error("Firestore updatePuzzleRating failed:", e);
    }
  }

  // Mirror locally
  const progress = getLocalPuzzleProgress(userId);
  progress.puzzleRating = Math.max(100, progress.puzzleRating + change);
  saveLocalPuzzleProgress(userId, progress);

  // Update puzzleRating on local user definition
  const users = getLocalUsers();
  const idx = users.findIndex(u => u.uid === userId);
  if (idx !== -1) {
    users[idx].puzzleRating = progress.puzzleRating;
    saveLocalUsers(users);
  }

  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    currentUser.puzzleRating = progress.puzzleRating;
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }

  return progress.puzzleRating;
};

// -------------------------------------------------------------
// PUZZLES INTERACTIVE PERSISTENCE (FALLBACK & FIRESTORE)
// -------------------------------------------------------------

export interface UserPuzzleProgress {
  puzzleRating: number;
  solvedPuzzleIds: string[];
  totalSolved: number;
  currentStreak: number;
  bestTime: number;
  currentDifficulty: string;
}

export const getLocalPuzzleProgress = (userId: string): UserPuzzleProgress => {
  const data = localStorage.getItem(`cmp_puzzle_progress_${userId}`);
  if (data) {
    try { return JSON.parse(data); } catch (e) { }
  }
  return {
    puzzleRating: 1200,
    solvedPuzzleIds: [],
    totalSolved: 0,
    currentStreak: 0,
    bestTime: 999,
    currentDifficulty: "Easy"
  };
};

export const saveLocalPuzzleProgress = (userId: string, progress: UserPuzzleProgress) => {
  localStorage.setItem(`cmp_puzzle_progress_${userId}`, JSON.stringify(progress));
};

export const getUserPuzzleProgress = async (userId: string): Promise<UserPuzzleProgress> => {
  if (isConfigured && db) {
    try {
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'users', userId, 'puzzleData', 'progress');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserPuzzleProgress;
      } else {
        const initial: UserPuzzleProgress = {
          puzzleRating: 1200,
          solvedPuzzleIds: [],
          totalSolved: 0,
          currentStreak: 0,
          bestTime: 999,
          currentDifficulty: "Easy"
        };
        await setDoc(docRef, initial);
        return initial;
      }
    } catch (e) {
      console.error("Failed to fetch Firestore puzzle progress:", e);
    }
  }
  return getLocalPuzzleProgress(userId);
};

export const fetchNextPuzzle = async (userId: string): Promise<{ status: 'ok' | 'complete'; puzzle?: any }> => {
  const progress = await getUserPuzzleProgress(userId);
  const solved = progress.solvedPuzzleIds || [];
  const rating = progress.puzzleRating || 1200;

  // Import local puzzles as baseline
  const { CHESS_PUZZLES } = await import('../utils/puzzles');

  // Filter local puzzles to fit the rating band (rating - 100 to rating + 100)
  // that are NOT solved yet
  let available = CHESS_PUZZLES.filter(p => {
    const pRating = p.rating || 1200;
    return !solved.includes(p.id) && pRating >= rating - 100 && pRating <= rating + 100;
  });

  // If no puzzles exist in this tight range, widen the search range iteratively
  if (available.length === 0) {
    available = CHESS_PUZZLES.filter(p => !solved.includes(p.id));
  }

  if (available.length === 0) {
    return { status: 'complete' };
  }

  // Random pick one from the available list (limited to 20 for randomization)
  const pool = available.slice(0, 20);
  const selected = pool[Math.floor(Math.random() * pool.length)];

  return { status: 'ok', puzzle: selected };
};

export const saveSolvedPuzzle = async (
  userId: string, 
  puzzleId: string, 
  stats: { timeTaken: number; hintsUsed: number; attempts: number }
): Promise<{ ratingChange: number; newRating: number }> => {
  let ratingChange = 10;
  if (stats.hintsUsed === 1) {
    ratingChange = 7;
  } else if (stats.hintsUsed >= 2) {
    ratingChange = 5;
  }

  let finalPuzzleRating = 1200;

  if (isConfigured && db) {
    try {
      const { doc, updateDoc, setDoc, arrayUnion } = await import('firebase/firestore');
      
      // Save solve record in users/{userId}/solvedPuzzles/{puzzleId}
      const recordRef = doc(db, 'users', userId, 'solvedPuzzles', puzzleId);
      await setDoc(recordRef, {
        solvedAt: new Date().toISOString(),
        attempts: stats.attempts,
        timeTaken: stats.timeTaken,
        hintsUsed: stats.hintsUsed,
        ratingChange
      });

      // Fetch progress, update progress doc
      const progress = await getUserPuzzleProgress(userId);
      finalPuzzleRating = (progress.puzzleRating || 1200) + ratingChange;
      const solvedIds = [...(progress.solvedPuzzleIds || []), puzzleId];
      const newStreak = progress.currentStreak + 1;
      const bestTimeValue = Math.min(progress.bestTime || 999, stats.timeTaken);

      const progressRef = doc(db, 'users', userId, 'puzzleData', 'progress');
      await setDoc(progressRef, {
        puzzleRating: finalPuzzleRating,
        solvedPuzzleIds: solvedIds,
        totalSolved: solvedIds.length,
        currentStreak: newStreak,
        bestTime: bestTimeValue,
        currentDifficulty: progress.currentDifficulty || "Easy"
      });

      // Copy on user profile for ease of reading
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        puzzleRating: finalPuzzleRating
      });

    } catch (e) {
      console.error("Firestore saveSolvedPuzzle failed:", e);
    }
  }

  // Local mirror
  const progress = getLocalPuzzleProgress(userId);
  finalPuzzleRating = progress.puzzleRating + ratingChange;
  
  if (!progress.solvedPuzzleIds.includes(puzzleId)) {
    progress.solvedPuzzleIds.push(puzzleId);
  }
  progress.totalSolved = progress.solvedPuzzleIds.length;
  progress.currentStreak += 1;
  progress.bestTime = Math.min(progress.bestTime, stats.timeTaken);
  progress.puzzleRating = finalPuzzleRating;
  saveLocalPuzzleProgress(userId, progress);

  // Update puzzleRating on local users
  const users = getLocalUsers();
  const idx = users.findIndex(u => u.uid === userId);
  if (idx !== -1) {
    users[idx].puzzleRating = finalPuzzleRating;
    saveLocalUsers(users);
  }

  // Update currently logged user locally
  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    currentUser.puzzleRating = finalPuzzleRating;
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }

  return { ratingChange, newRating: finalPuzzleRating };
};

export const resetUserPuzzleProgress = async (userId: string): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc, setDoc, updateDoc } = await import('firebase/firestore');
      const progressRef = doc(db, 'users', userId, 'puzzleData', 'progress');
      await setDoc(progressRef, {
        puzzleRating: 1200,
        solvedPuzzleIds: [],
        totalSolved: 0,
        currentStreak: 0,
        bestTime: 999,
        currentDifficulty: "Easy"
      });
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        puzzleRating: 1200
      });
    } catch (e) {
      console.error("Firestore reset progress failed:", e);
    }
  }

  // Clear local progress
  const initial = {
    puzzleRating: 1200,
    solvedPuzzleIds: [],
    totalSolved: 0,
    currentStreak: 0,
    bestTime: 999,
    currentDifficulty: "Easy"
  };
  saveLocalPuzzleProgress(userId, initial);

  const users = getLocalUsers();
  const idx = users.findIndex(u => u.uid === userId);
  if (idx !== -1) {
    users[idx].puzzleRating = 1200;
    saveLocalUsers(users);
  }

  const currentUser = getLocalCurrentUser();
  if (currentUser && currentUser.uid === userId) {
    currentUser.puzzleRating = 1200;
    setLocalCurrentUser(currentUser);
    dispatchAuthChange();
  }
};

// -------------------------------------------------------------
// DAILY PUZZLE SYSTEM WITH FASTEST TIMES LEADERBOARD
// -------------------------------------------------------------

export interface DailyLeaderboardRecord {
  userId: string;
  fullName: string;
  username: string;
  timeTaken: number;
  solvedAt: string;
}

export const fetchDailyPuzzleIdx = (): number => {
  // Use day of the year to pin a stable daily puzzle index for 24 hours
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear;
};

export const registerDailyPuzzleSolve = async (
  userId: string,
  fullName: string,
  username: string,
  timeTaken: number
): Promise<void> => {
  const dayKey = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
  const record: DailyLeaderboardRecord = {
    userId,
    fullName,
    username,
    timeTaken,
    solvedAt: new Date().toISOString()
  };

  if (isConfigured && db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'dailyPuzzles', dayKey, 'leaderboard', userId);
      await setDoc(docRef, record);
    } catch (e) {
      console.error("Firestore daily solve register failed:", e);
    }
  }

  // Local storage daily scoreboard backing
  const localKey = `cmp_daily_leaderboard_${dayKey}`;
  const localList: DailyLeaderboardRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
  const existIdx = localList.findIndex(r => r.userId === userId);
  if (existIdx !== -1) {
    localList[existIdx].timeTaken = Math.min(localList[existIdx].timeTaken, timeTaken);
  } else {
    localList.push(record);
  }
  localStorage.setItem(localKey, JSON.stringify(localList));
};

export const subscribeToDailyLeaderboard = (callback: (list: DailyLeaderboardRecord[]) => void): () => void => {
  const dayKey = new Date().toISOString().split('T')[0];
  const localKey = `cmp_daily_leaderboard_${dayKey}`;

  if (isConfigured && db) {
    let unsubscribed = false;
    let unsubFirestore: (() => void) | null = null;

    const setupStream = async () => {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        const collRef = collection(db, 'dailyPuzzles', dayKey, 'leaderboard');
        if (unsubscribed) return;

        unsubFirestore = onSnapshot(collRef, (snapshot) => {
          const list: DailyLeaderboardRecord[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as DailyLeaderboardRecord);
          });
          // Sort by fastest time taken ASC
          list.sort((a, b) => a.timeTaken - b.timeTaken);
          callback(list);
        });
      } catch (e) {
        console.warn("Firestore daily leaderboard subscribe failed, fallback:", e);
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        local.sort((a: any, b: any) => a.timeTaken - b.timeTaken);
        callback(local);
      }
    };
    setupStream();

    return () => {
      unsubscribed = true;
      if (unsubFirestore) unsubFirestore();
    };
  } else {
    const fetchLocal = () => {
      const local = JSON.parse(localStorage.getItem(localKey) || '[]');
      local.sort((a: any, b: any) => a.timeTaken - b.timeTaken);
      callback(local);
    };
    fetchLocal();
    const interval = setInterval(fetchLocal, 1500);
    return () => clearInterval(interval);
  }
};


// -------------------------------------------------------------
// REAL-TIME MULTIPLAYER PVP MATCHMAKING & PAUSING (SEC C)
// -------------------------------------------------------------

export interface PlayerMatch {
  id: string;
  player1Id: string;
  player1Name: string;
  player1Elo: number;
  player2Id: string | null;
  player2Name: string | null;
  player2Elo: number | null;
  player1Ready: boolean;
  player2Ready: boolean;
  gameStarted: boolean;
  gameStartedAt: string | null;
  whiteTime: number;
  blackTime: number;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  players: string[];
  fen: string;
  moves: string[];
  turn: 'w' | 'b';
  colorMap: { [userId: string]: 'w' | 'b' };
  winner?: 'w' | 'b' | 'draw' | null;
  reason?: string;
  createdAt: string;
}

export const joinMatchmakerQueue = async (
  userId: string,
  username: string,
  fullName: string,
  elo: number
): Promise<string> => {
  const matchId = `match_${Math.random().toString(36).substring(2, 11)}`;

  if (isConfigured && db) {
    try {
      const { collection, getDocs, doc, setDoc, query, where, limit, runTransaction } = await import('firebase/firestore');
      
      // Look for any existing pending matches
      const q = query(
        collection(db, 'matches'),
        where('status', '==', 'waiting'),
        where('player2Id', '==', null),
        limit(5)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        // Try to occupy the second player spot atomically using transaction if possible,
        // or simple transaction-like write for robust matching
        const openMatchDoc = snap.docs[0];
        const openMatch = openMatchDoc.data() as PlayerMatch;
        const targetId = openMatchDoc.id;

        if (openMatch.player1Id !== userId) {
          const colorMap = { ...openMatch.colorMap, [userId]: 'b' as const };
          await setDoc(doc(db, 'matches', targetId), {
            ...openMatch,
            player2Id: userId,
            player2Name: fullName || `@${username}`,
            player2Elo: elo,
            players: [openMatch.player1Id, userId],
            colorMap
          }, { merge: true });
          return targetId;
        }
      }

      // If no suitable match open, create a new match document waiting for player 2
      const newMatch: PlayerMatch = {
        id: matchId,
        player1Id: userId,
        player1Name: fullName || `@${username}`,
        player1Elo: elo,
        player2Id: null,
        player2Name: null,
        player2Elo: null,
        player1Ready: false,
        player2Ready: false,
        gameStarted: false,
        gameStartedAt: null,
        whiteTime: 600,
        blackTime: 600,
        status: 'waiting',
        players: [userId],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: [],
        turn: 'w',
        colorMap: { [userId]: 'w' }
      } as any;
      
      // Ensure firebase compliant server timestamp or fallback iso
      (newMatch as any).createdAt = new Date().toISOString();

      await setDoc(doc(db, 'matches', matchId), newMatch);
      return matchId;
    } catch (e) {
      console.error("Firestore matchmaking queue failed:", e);
    }
  }

  // FALLBACK LOCAL PLAY MODE: Create instantly matched mock game vs smart Bot opponent!
  const mockId = `mock_pvp_${Math.random().toString(36).substring(2, 11)}`;
  const list = getLocalPvpMatches();
  
  const botNames = ['@Mikhail_Fanatic', '@RookRampage', '@CheckmateKing', '@PawnStar'];
  const botName = botNames[Math.floor(Math.random() * botNames.length)];
  
  const newMatch: PlayerMatch = {
    id: mockId,
    player1Id: userId,
    player1Name: fullName || `@${username}`,
    player1Elo: elo,
    player2Id: 'simulated_bot_player',
    player2Name: botName,
    player2Elo: elo - 40 + Math.floor(Math.random() * 80), // similar ELO
    player1Ready: false,
    player2Ready: false,
    gameStarted: false,
    gameStartedAt: null,
    whiteTime: 600,
    blackTime: 600,
    status: 'waiting',
    players: [userId, 'simulated_bot_player'],
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    turn: 'w',
    colorMap: { [userId]: 'w', 'simulated_bot_player': 'b' },
    createdAt: new Date().toISOString()
  };

  list.push(newMatch);
  saveLocalPvpMatches(list);
  
  // Trigger automatic player2 simulated ready up shortly if bot matches
  setTimeout(() => {
    const updated = getLocalPvpMatches();
    const idx = updated.findIndex(m => m.id === mockId);
    if (idx !== -1) {
      // simulated player joins immediately & is ready when player1 is ready
    }
  }, 1000);

  return mockId;
};

const getLocalPvpMatches = (): PlayerMatch[] => {
  return JSON.parse(localStorage.getItem('cmp_multiplayer_matches') || '[]');
};

const saveLocalPvpMatches = (list: PlayerMatch[]) => {
  localStorage.setItem('cmp_multiplayer_matches', JSON.stringify(list));
};

export const updateMatchReadyState = async (
  matchId: string,
  playerNum: 1 | 2,
  ready: boolean
): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const matchRef = doc(db, 'matches', matchId);
      const snap = await getDoc(matchRef);
      if (snap.exists()) {
        const matchData = snap.data() as PlayerMatch;
        let p1Ready = playerNum === 1 ? ready : matchData.player1Ready;
        let p2Ready = playerNum === 2 ? ready : matchData.player2Ready;
        
        let shouldStart = p1Ready && p2Ready;
        
        await updateDoc(matchRef, {
          player1Ready: p1Ready,
          player2Ready: p2Ready,
          gameStarted: shouldStart ? true : matchData.gameStarted,
          gameStartedAt: shouldStart ? new Date().toISOString() : matchData.gameStartedAt,
          status: shouldStart ? 'active' : matchData.status
        });
      }
      return;
    } catch (e) {
      console.error("Firestore updateMatchReadyState failed:", e);
    }
  }

  // Fallback Mirror
  const matches = getLocalPvpMatches();
  const idx = matches.findIndex(m => m.id === matchId);
  if (idx !== -1) {
    const match = { ...matches[idx] };
    if (playerNum === 1) match.player1Ready = ready;
    if (playerNum === 2) match.player2Ready = ready;
    
    // In simulated bot mode: If user (player1) readies up, trigger simulated bot (player2) readying up 1.5s later!
    if (playerNum === 1 && ready) {
      setTimeout(() => {
        const afterMatches = getLocalPvpMatches();
        const curIdx = afterMatches.findIndex(m => m.id === matchId);
        if (curIdx !== -1) {
          const fresh = { ...afterMatches[curIdx] };
          fresh.player2Ready = true;
          fresh.gameStarted = true;
          fresh.gameStartedAt = new Date().toISOString();
          fresh.status = 'active';
          
          afterMatches[curIdx] = fresh;
          saveLocalPvpMatches(afterMatches);
        }
      }, 1500);
    }

    if (match.player1Ready && match.player2Ready) {
      match.gameStarted = true;
      match.gameStartedAt = new Date().toISOString();
      match.status = 'active';
    } else {
      match.status = 'waiting';
    }
    matches[idx] = match;
    saveLocalPvpMatches(matches);
  }
};

export const updateMatchRealtimeGame = async (
  matchId: string,
  fields: Partial<PlayerMatch>
): Promise<void> => {
  if (isConfigured && db) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, fields);
      return;
    } catch (e) {
      console.error("Firestore updateMatchRealtimeGame failed:", e);
    }
  }

  const matches = getLocalPvpMatches();
  const idx = matches.findIndex(m => m.id === matchId);
  if (idx !== -1) {
    matches[idx] = { ...matches[idx], ...fields };
    saveLocalPvpMatches(matches);
  }
};

export const subscribeToRealtimeMatch = (
  matchId: string,
  callback: (match: PlayerMatch | null) => void
): () => void => {
  if (isConfigured && db) {
    let unsubscribed = false;
    let unsubFirestore: (() => void) | null = null;

    const setupStream = async () => {
      try {
        const { doc, onSnapshot } = await import('firebase/firestore');
        const docRef = doc(db, 'matches', matchId);
        if (unsubscribed) return;

        unsubFirestore = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as PlayerMatch);
          } else {
            callback(null);
          }
        });
      } catch (e) {
        console.warn("Firestore match subscribe failed, local fallback:", e);
      }
    };
    setupStream();

    return () => {
      unsubscribed = true;
      if (unsubFirestore) unsubFirestore();
    };
  } else {
    const fetchLocal = () => {
      const matches = getLocalPvpMatches();
      const match = matches.find(m => m.id === matchId);
      callback(match || null);
    };
    fetchLocal();
    const interval = setInterval(fetchLocal, 500);
    return () => clearInterval(interval);
  }
};




