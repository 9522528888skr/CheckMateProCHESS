import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, update, remove, child } from 'firebase/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

// ===== FIREBASE SETUP =====
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// Live matches real-time cache
let liveGames: Record<string, { fen: string; clocks: { white: number; black: number }; updatedAt: number; status?: string; winner?: string }> = {};

// ===== FIREBASE HELPERS =====
const dbRun = async (path: string, data: any) => {
  await set(ref(db, path), data);
};

const dbGet = async (path: string) => {
  const snapshot = await get(child(ref(db), path));
  return snapshot.exists()? snapshot.val() : null;
};

const dbPush = async (path: string, data: any) => {
  const newRef = push(ref(db, path));
  await set(newRef, data);
  return { lastID: newRef.key };
};

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  socket.on('join_live', async (streamId) => {
    socket.join(streamId);
    if (liveGames[streamId]) {
      socket.emit('board_update', liveGames[streamId]);
    } else {
      const match = await dbGet(`live_matches/${streamId}`);
      if (match) {
        liveGames[streamId] = {
          fen: match.fen,
          clocks: { white: 600, black: 600 },
          updatedAt: Date.now()
        };
        socket.emit('board_update', liveGames[streamId]);
      }
    }
  });

  socket.on('move_made', async ({ streamId, fen, clocks }) => {
    liveGames[streamId] = { fen, clocks, updatedAt: Date.now() };
    io.to(streamId).emit('board_update', liveGames[streamId]);
    await update(ref(db, `live_matches/${streamId}`), { fen });
  });

  socket.on('end_stream', async (streamId) => {
    io.to(streamId).emit('end_stream');
    await update(ref(db, `live_matches/${streamId}`), { status: 'ended' });
    if (liveGames[streamId]) liveGames[streamId].status = 'ended';
  });
});

// ===== PERMISSION MIDDLEWARE =====
const isAcademyOrAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user_role = req.headers['user_role'] || req.headers['user-role'];
  if (user_role === 'admin' || user_role === 'academy') next();
  else res.status(403).json({ error: 'Only Academy/Admin can perform this action' });
};

// ===== AUTH APIs =====
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const users = await dbGet('users') || {};
    const exists = Object.values(users).find((u: any) => u.username === username || u.email === email);
    if (exists) return res.status(400).json({ error: 'User already exists' });

    const newUser = { username, email, password, elo: 1200, role: 'user', createdAt: new Date().toISOString() };
    const result = await dbPush('users', newUser);
    res.json({ id: result.lastID, username, elo: 1200, role: 'user' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await dbGet('users') || {};
    const userEntry = Object.entries(users).find(([id, u]: [string, any]) => u.username === username && u.password === password);
    if (!userEntry) return res.status(401).json({ error: 'Invalid credentials' });
    const [id, user]: [string, any] = userEntry;
    res.json({ id, username: user.username, elo: user.elo, role: user.role, academy_id: user.academy_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ACADEMIES APIs =====
app.get('/api/academies', async (req, res) => {
  try {
    const academies = await dbGet('academies') || {};
    res.json(Object.values(academies));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/academies', async (req, res) => {
  const { name, city, contact, phone, ownerName, ownerEmail, ownerPhone, password } = req.body;
  if (!name ||!city) return res.status(400).json({ error: 'Missing required parameters' });
  try {
    const id = Date.now().toString();
    const newAcademy = { id, name, city, contact: contact || ownerName, phone: phone || ownerPhone, ownerName, ownerEmail, ownerPhone, password, createdAt: new Date().toISOString() };
    await dbRun(`academies/${id}`, newAcademy);
    res.status(201).json(newAcademy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== MATCH APIs =====
app.post('/api/start-match', async (req, res) => {
  const { player1, player2 } = req.body;
  const p1 = player1 || 'White Player';
  const p2 = player2 || 'Black Player';
  const match_id = 'match_' + Date.now();
  try {
    await dbRun(`live_matches/${match_id}`, {
      match_id, player1: p1, player2: p2, status: 'live',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: '[]', createdAt: new Date().toISOString()
    });
    liveGames[match_id] = { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', clocks: { white: 600, black: 600 }, updatedAt: Date.now() };
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.secure? 'https' : 'http';
    res.json({ match_id, streamLink: `${protocol}://${host}/live/${match_id}`, status: 'live' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/match/:id', async (req, res) => {
  try {
    const match = await dbGet(`live_matches/${req.params.id}`);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GEMINI API =====
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { fen, moveHistory, mode, difficulty, playerColor } = req.body;
    if (!fen) return res.status(400).json({ error: 'Missing Chess FEN state.' });
    const systemInstruction = `You are a legendary Chess Grandmaster Coach...`; // same as before
    const prompt = `Current board: ${fen}...`; // same as before
    const response = await ai.models.generateContent({ model: 'gemini-3.5-flash', contents: prompt, config: { systemInstruction, temperature: 0.7 } });
    res.json({ analysis: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== VITE + STATIC =====
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve('dist', 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();