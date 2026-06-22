import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, Sparkles, Crown, MessageSquare, Lock, Loader2, Trophy } from 'lucide-react';

interface LiveChatProps {
  matchId: string;
  username: string;
}

interface ChatMessage {
  id?: number;
  match_id: string;
  username: string;
  message: string;
  is_premium: number;
  timestamp: string;
}

export default function LiveChat({ matchId, username }: LiveChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [updatingPremium, setUpdatingPremium] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Check premium status via relative API path (avoids localhost hardcoding issues in remote environments)
  const checkPremiumStatus = async () => {
    try {
      const res = await fetch(`/api/is-premium/${encodeURIComponent(username)}`);
      const data = await res.json();
      setIsPremium(!!data.isPremium);
    } catch (e) {
      console.error("Failed to check premium status:", e);
    } finally {
      setCheckingPremium(false);
    }
  };

  useEffect(() => {
    checkPremiumStatus();
  }, [username]);

  // Activate premium
  const handleUpgrade = async () => {
    setUpdatingPremium(true);
    try {
      const res = await fetch('/api/make-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.success) {
        setIsPremium(true);
      }
    } catch (e) {
      console.error("Failed to make user premium:", e);
    } finally {
      setUpdatingPremium(false);
    }
  };

  // Socket connect and room join
  useEffect(() => {
    // Connect to host socket server dynamically
    const newSocket = io();
    setSocket(newSocket);

    // Join match room
    newSocket.emit('join-match', matchId);

    // Listeners
    newSocket.on('chat-history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    newSocket.on('new-message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      newSocket.close();
    };
  }, [matchId]);

  // Auto scroll to latest comments
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !socket || !isPremium) return;

    socket.emit('send-message', {
      matchId,
      username,
      message: input.trim(),
      isPremium: true
    });

    setInput('');
  };

  return (
    <div id="live-chat-container" className="flex flex-col h-[340px] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl font-sans mt-4">
      {/* Dynamic Design Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs font-black text-white uppercase tracking-wider">Live Commentary</span>
          <span className="text-[9px] font-mono text-neutral-500">ID: {matchId.substring(0, 8)}</span>
        </div>
        {checkingPremium ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
        ) : isPremium ? (
          <span className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 shadow-sm animate-pulse">
            <Crown className="w-3 h-3 text-amber-400" />
            PREMIUM
          </span>
        ) : (
          <span className="text-[9px] font-bold text-neutral-500 bg-neutral-800/60 px-2 py-0.5 rounded-full border border-neutral-700/30">
            STANDARD
          </span>
        )}
      </div>

      {/* Messages Commentary Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-[200px] scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Trophy className="w-8 h-8 text-neutral-800 mb-2" />
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Awaiting Live Chat</p>
            <p className="text-[10px] text-neutral-600 mt-1 max-w-[180px]">Upgrade to post commentary messages and analyze the game live!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[10px] font-black ${msg.username === username ? 'text-amber-400' : 'text-neutral-300'}`}>
                  {msg.username}
                </span>
                {msg.is_premium === 1 && (
                  <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                )}
                <span className="text-[8px] text-neutral-500 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`px-3 py-1.5 rounded-2xl text-xs max-w-[85%] break-words shadow-sm leading-relaxed ${
                msg.username === username 
                  ? 'bg-amber-500 text-neutral-950 font-black rounded-tr-none' 
                  : 'bg-neutral-800 text-neutral-200 font-medium rounded-tl-none border border-neutral-700/35'
              }`}>
                {msg.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Option Bar */}
      <div className="p-3 bg-neutral-950 border-t border-neutral-800 shrink-0">
        {!isPremium && !checkingPremium ? (
          <div className="flex flex-col items-center gap-2 text-center p-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 tracking-wider">
              <Lock className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
              <span>COMMENTARY FEATURE LOCKED</span>
            </div>
            <p className="text-[9px] text-neutral-400 max-w-[280px]">Only verified Premium users can broadcast to match live chats.</p>
            <button
              onClick={handleUpgrade}
              disabled={updatingPremium}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-500 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
            >
              {updatingPremium ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Activating License...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-current text-neutral-950" />
                  <span>Activate Premium Account</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your premium commentary..."
              disabled={!isPremium}
              className="flex-1 bg-neutral-800 border border-neutral-700/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !isPremium}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-500 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-md shrink-0 flex items-center justify-center font-bold"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
