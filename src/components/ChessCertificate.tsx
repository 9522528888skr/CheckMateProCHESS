import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Award, 
  Printer, 
  Download, 
  User, 
  Calendar as CalendarIcon, 
  MapPin, 
  TrendingUp, 
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  Eye, 
  Settings, 
  Layers,
  Sparkles
} from 'lucide-react';

interface ChessCertificateProps {
  currentUser: any; // Can be player, academy operator, or admin
  academyPlayers?: any[]; // For academy operator to select students
}

interface CertificateData {
  playerName: string;
  tournamentName: string;
  achievementText: string;
  schoolRank: string;
  classRank: string;
  date: string;
  venue: string;
  category: string;
  signatureLeft: string;
  signatureRight: string;
  theme: 'royal' | 'emerald' | 'crimson' | 'darkgold';
}

export default function ChessCertificate({
  currentUser,
  academyPlayers = []
}: ChessCertificateProps) {
  const [certData, setCertData] = useState<CertificateData>({
    playerName: '',
    tournamentName: 'CHESS TOURNAMENT 2026',
    achievementText: 'has secured 1st Place in the tournament',
    schoolRank: 'Rank 1',
    classRank: 'Rank 1',
    date: new Date().toLocaleDateString('en-GB'),
    venue: '',
    category: 'Under-14 Category',
    signatureLeft: 'CheckmatePro CHESS',
    signatureRight: 'Principal',
    theme: 'royal'
  });

  const [activePresetId, setActivePresetId] = useState<string>('custom');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Initialize form defaults based on user role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'player') {
        setCertData(prev => ({
          ...prev,
          playerName: currentUser.fullName || '',
          venue: currentUser.academyCity ? `${currentUser.academyName}, ${currentUser.academyCity}` : currentUser.academyName || 'Elite Chess Hall',
          category: currentUser.age ? `Under-${currentUser.age} Category` : 'Open Category',
          classRank: currentUser.class ? `${currentUser.class} Standard` : 'Top Rank'
        }));
      } else if (currentUser.role === 'academy') {
        const firstStudent = academyPlayers[0];
        setCertData(prev => ({
          ...prev,
          playerName: firstStudent ? firstStudent.fullName : '',
          venue: currentUser.city ? `${currentUser.academyName || 'Elite Chess Club'}, ${currentUser.city}` : currentUser.academyName || 'Elite Chess Hall',
          classRank: firstStudent?.class ? `${firstStudent.class} Standard` : 'Rank 1'
        }));
      } else {
        setCertData(prev => ({
          ...prev,
          playerName: '',
          venue: 'Grand Master Chess Guild'
        }));
      }
    }
  }, [currentUser, academyPlayers]);

  const handleStudentSelect = (studentId: string) => {
    const student = academyPlayers.find(p => p.uid === studentId);
    if (student) {
      setCertData(prev => ({
        ...prev,
        playerName: student.fullName,
        category: student.age ? `Under-${student.age} Category` : prev.category,
        classRank: student.class ? `${student.class} Standard` : 'Rank 1',
        schoolRank: 'Top Tier'
      }));
      setSuccessToast(`Injected student details for ${student.fullName}`);
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const applyPreset = (presetType: '1st' | 'runners' | 'participation') => {
    setActivePresetId(presetType);
    if (presetType === '1st') {
      setCertData(prev => ({
        ...prev,
        achievementText: 'has secured 1st Place in the tournament',
        schoolRank: 'Rank 1',
        classRank: 'Rank 1'
      }));
    } else if (presetType === 'runners') {
      setCertData(prev => ({
        ...prev,
        achievementText: 'has secured 2nd Place in the tournament',
        schoolRank: 'Rank 2',
        classRank: 'Rank 2'
      }));
    } else if (presetType === 'participation') {
      setCertData(prev => ({
        ...prev,
        achievementText: 'has enthusiastically participated and completed all rounds',
        schoolRank: 'Participant',
        classRank: 'Participant'
      }));
    }
  };

  const handlePrint = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    setSuccessToast("Preparing premium high-resolution PDF download...");
    
    try {
      // Small pause to let the toast render
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const element = certificateRef.current;
      
      // Let's call html2canvas to convert DOM to canvas
      const canvas = await html2canvas(element, {
        scale: 3, // Ultra high-resolution
        useCORS: true,
        logging: false,
        backgroundColor: certData.theme === 'darkgold' ? '#0a0a0a' : '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Landscape A4 Page layout
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Fit fully to A4 landscape (A4 dimension: 297mm x 210mm)
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      
      // Filename
      const safeName = (certData.playerName || 'Chess_Champion').trim().replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${safeName}_Chess_Certificate.pdf`);
      
      setSuccessToast("Certificate PDF generated and downloaded successfully! 🏆");
    } catch (error) {
      console.error("PDF engine error, falling back to printer:", error);
      setSuccessToast("Direct PDF failed. Launching browser print driver instead...");
      
      setTimeout(() => {
        window.focus();
        window.print();
      }, 1000);
    } finally {
      setIsExporting(false);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const getThemeClasses = (theme: 'royal' | 'emerald' | 'crimson' | 'darkgold') => {
    switch (theme) {
      case 'emerald':
        return {
          border: 'border-emerald-900',
          innerBorder: 'border-emerald-500',
          titleColor: 'text-emerald-900',
          subTitleColor: 'text-emerald-600',
          playerNameColor: 'text-emerald-950',
          watermark: 'text-emerald-900/5',
          bannerBg: 'bg-emerald-500/10'
        };
      case 'crimson':
        return {
          border: 'border-rose-950',
          innerBorder: 'border-amber-600',
          titleColor: 'text-rose-950',
          subTitleColor: 'text-amber-605',
          playerNameColor: 'text-rose-900',
          watermark: 'text-rose-500/5',
          bannerBg: 'bg-rose-500/10'
        };
      case 'darkgold':
        return {
          border: 'border-neutral-900 bg-neutral-950',
          innerBorder: 'border-amber-400',
          titleColor: 'text-amber-400',
          subTitleColor: 'text-amber-500',
          playerNameColor: 'text-neutral-100',
          watermark: 'text-white/5',
          bannerBg: 'bg-amber-400/10'
        };
      case 'royal':
      default:
        return {
          border: 'border-[#1a2b4c]',
          innerBorder: 'border-[#d4af37]',
          titleColor: 'text-[#1a2b4c]',
          subTitleColor: 'text-[#d4af37]',
          playerNameColor: 'text-[#1a2b4c]',
          watermark: 'text-[#1a2b4c]/5',
          bannerBg: 'bg-[#d4af37]/10'
        };
    }
  };

  const selectedTheme = getThemeClasses(certData.theme);

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* CSS @media print controller tags dynamically injected for landscape precision printing */}
      <style>{`
        @media print {
          body, html, #root {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all general UI wrappers */
          nav, header, footer, aside, button, .no-print, .non-print-container {
            display: none !important;
          }
          /* Put certificate in absolute position */
          .print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 1050px !important;
            height: 720px !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: scale(1) !important;
            box-shadow: none !important;
            border: none !important;
          }
          .certificate-box {
            border-width: 12px !important;
            width: 1050px !important;
            height: 720px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Title Header Toolbar */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-808 rounded-3xl shadow-sm gap-4">
        <div>
          <h1 className="text-sm font-black uppercase text-neutral-900 dark:text-white tracking-wider flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>Interactive Certificate Generator</span>
          </h1>
          <p className="text-4xs font-mono text-neutral-500 mt-0.5">Customize, print, or download physical/digital award credentials for chess tournament champions</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={isExporting}
            className={`px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-3xs uppercase tracking-widest rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-md border border-amber-600/30 ${isExporting ? 'opacity-70 cursor-not-allowed animate-pulse' : ''}`}
          >
            {isExporting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-neutral-950" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save PDF</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              window.focus();
              window.print();
            }}
            className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-3xs uppercase tracking-widest rounded-xl cursor-pointer transition-all flex items-center gap-2 border border-neutral-300/40 dark:border-neutral-700/50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Layout</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successToast && (
        <div className="no-print p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-3xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Two columns layout: Form controls on left, interactive preview on right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls Dashboard (span 4) */}
        <div className="no-print xl:col-span-4 space-y-6">
          
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/65 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-5 text-left">
            
            <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <Settings className="w-4 h-4 text-amber-500" />
              <h3 className="font-extrabold text-xs text-neutral-955 dark:text-neutral-50 uppercase">Certificate Details</h3>
            </div>

            {/* Quick inject active student dropdown for Academy */}
            {currentUser.role === 'academy' && academyPlayers.length > 0 && (
              <div className="space-y-1 bg-amber-500/5 p-3.5 rounded-2xl border border-amber-500/15">
                <label className="block text-5xs font-mono uppercase text-amber-600 dark:text-amber-500 font-bold tracking-widest">
                  Quick Student Inject (Auto-fill)
                </label>
                <select
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  defaultValue=""
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-205 dark:border-neutral-850 p-2.5 rounded-xl text-neutral-800 dark:text-white"
                >
                  <option value="" disabled>-- Select registered student --</option>
                  {academyPlayers.map(p => (
                    <option key={p.uid} value={p.uid}>
                      {p.fullName} {p.class ? `(${p.class})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Presets Switchers bar */}
            <div className="space-y-1.5">
              <label className="block text-5xs font-mono uppercase text-neutral-400 tracking-wider">Achievement Preset Rules</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('1st')}
                  className={`py-2 px-1 text-5xs font-black uppercase rounded-lg transition-all border ${
                    activePresetId === '1st'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 border-amber-500'
                      : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 text-neutral-500 border-neutral-100 dark:border-neutral-850'
                  }`}
                >
                  🏆 1st Champion
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('runners')}
                  className={`py-2 px-1 text-5xs font-black uppercase rounded-lg transition-all border ${
                    activePresetId === 'runners'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 border-amber-500'
                      : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 text-neutral-500 border-neutral-100 dark:border-neutral-850'
                  }`}
                >
                  🥈 2nd / Runners
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('participation')}
                  className={`py-2 px-1 text-5xs font-black uppercase rounded-lg transition-all border ${
                    activePresetId === 'participation'
                      ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 border-amber-500'
                      : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 text-neutral-500 border-neutral-100 dark:border-neutral-850'
                  }`}
                >
                  🏅 Participant
                </button>
              </div>
            </div>

            {/* Inputs Block */}
            <div className="space-y-3.5 text-xs text-left">
              
              {/* Player Name */}
              <div className="space-y-1">
                <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Player Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-450 w-3.5 h-3.5" />
                  <input
                    type="text"
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 pl-8.5 rounded-xl text-neutral-800 dark:text-white select-text font-bold"
                    placeholder="Enter athlete's full name"
                    value={certData.playerName}
                    onChange={(e) => setCertData({ ...certData, playerName: e.target.value })}
                  />
                </div>
              </div>

              {/* Tournament Title */}
              <div className="space-y-1">
                <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Tournament Name</label>
                <input
                  type="text"
                  required
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl text-neutral-800 dark:text-white select-text"
                  placeholder="e.g. DISTRICT CHESS TOURNAMENT 2026"
                  value={certData.tournamentName}
                  onChange={(e) => setCertData({ ...certData, tournamentName: e.target.value })}
                />
              </div>

              {/* Achievement description text */}
              <div className="space-y-1">
                <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Achievement Detail Statement</label>
                <input
                  type="text"
                  required
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl text-neutral-800 dark:text-white select-text"
                  placeholder="has secured 1st Place / Participant"
                  value={certData.achievementText}
                  onChange={(e) => setCertData({ ...certData, achievementText: e.target.value })}
                />
              </div>

              {/* Ranks Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">School Rank</label>
                  <input
                    type="text"
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl text-neutral-800 dark:text-white select-text"
                    placeholder="Rank 1 / Participant"
                    value={certData.schoolRank}
                    onChange={(e) => setCertData({ ...certData, schoolRank: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Class Rank</label>
                  <input
                    type="text"
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl text-neutral-800 dark:text-white select-text"
                    placeholder="Rank 1 / Participation"
                    value={certData.classRank}
                    onChange={(e) => setCertData({ ...certData, classRank: e.target.value })}
                  />
                </div>
              </div>

              {/* Event details */}
              <div className="space-y-1">
                <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Category</label>
                <input
                  type="text"
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl text-neutral-800 dark:text-white select-text"
                  placeholder="e.g. Under-14 / Open division"
                  value={certData.category}
                  onChange={(e) => setCertData({ ...certData, category: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-450 w-3.5 h-3.5" />
                    <input
                      type="text"
                      className="w-full text-[11px] bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 pl-8 w-full rounded-xl text-neutral-800 dark:text-white select-text"
                      value={certData.date}
                      onChange={(e) => setCertData({ ...certData, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Venue Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-450 w-3.5 h-3.5" />
                    <input
                      type="text"
                      className="w-full text-[11px] bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 pl-8 rounded-xl text-neutral-800 dark:text-white select-text"
                      placeholder="Venue"
                      value={certData.venue}
                      onChange={(e) => setCertData({ ...certData, venue: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Signatures Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Left Sign Label</label>
                  <input
                    type="text"
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl text-neutral-800 dark:text-white select-text"
                    value={certData.signatureLeft}
                    onChange={(e) => setCertData({ ...certData, signatureLeft: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold tracking-wider">Right Sign Label</label>
                  <input
                    type="text"
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl text-neutral-800 dark:text-white select-text"
                    value={certData.signatureRight}
                    onChange={(e) => setCertData({ ...certData, signatureRight: e.target.value })}
                  />
                </div>
              </div>

              {/* Theme Selector */}
              <div className="space-y-1 bg-neutral-100/50 dark:bg-neutral-950/40 p-3 rounded-xl border border-neutral-200/45 dark:border-neutral-850">
                <label className="block text-5xs font-mono uppercase text-neutral-400 font-extrabold mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>PRESTIGE THEME PALETTE</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 select-none">
                  {[
                    { id: 'royal' as const, name: 'Royal Blue', color: 'bg-[#1a2b4c]' },
                    { id: 'emerald' as const, name: 'Emerald', color: 'bg-[#0f4c3a]' },
                    { id: 'crimson' as const, name: 'Crimson', color: 'bg-rose-955' },
                    { id: 'darkgold' as const, name: 'Obsidian', color: 'bg-neutral-950 border border-[#d4af37]/35' }
                  ].map((thm) => (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => setCertData({ ...certData, theme: thm.id })}
                      className={`h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${thm.color} ${
                        certData.theme === thm.id ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-neutral-900 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={thm.name}
                    >
                      <span className="text-[9px] text-white font-black drop-shadow uppercase">{thm.id.substring(0,3)}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Interactive live desktop scaling preview panel (span 8) */}
        <div className="xl:col-span-8 flex flex-col items-center justify-center space-y-4">
          
          <div className="no-print w-full flex items-center justify-between px-3">
            <span className="text-4xs font-mono uppercase text-neutral-400 font-bold flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-500" />
              Interactive Certificate Canvas Preview (Responsive Scaling)
            </span>
            <span className="text-5xs font-mono bg-[#d4af37]/10 text-[#d4af37] py-1 px-2.5 rounded-full border border-[#d4af37]/20 uppercase flex items-center gap-1 font-bold">
              <Sparkles className="w-3 h-3 animate-spin duration-3000" />
              100% vector layout
            </span>
          </div>

          {/* Certificate View Container - Landscape frame bounding box */}
          <div className="w-full flex justify-center py-2 relative overflow-hidden bg-neutral-100 dark:bg-neutral-955 p-3 sm:p-5 rounded-3xl border border-neutral-250 dark:border-neutral-850/80 shadow-inner">
            
            <div className="print-area-wrapper bg-white shadow-xl max-w-full overflow-x-auto select-text scrollbar-thin">
              
              {/* Outer border & relative wrapper exact dimensions matching user spec A4 ratio width:1050px height:720px */}
              <div ref={certificateRef} className={`certificate-box w-[1050px] h-[720px] m-auto bg-white dark:bg-neutral-950 border-[12px] p-10 relative box-border shrink-0 select-text transition-all ${selectedTheme.border}`}>
                
                {/* Thin Inner Golden Line nested absolute border */}
                <div className={`absolute top-2 left-2 right-2 bottom-2 border-2 ${selectedTheme.innerBorder} pointer-events-none`} />

                {/* Translucent overlay background watermark crown icon */}
                <div className={`watermark absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif font-serif text-[420px] select-none pointer-events-none z-0 transition-all ${selectedTheme.watermark}`}>
                  ♛
                </div>

                {/* Pure text content exact alignment */}
                <div className="content relative z-10 text-center flex flex-col justify-between h-full py-2">
                  
                  {/* Title Block */}
                  <div>
                    <h2 className={`title font-serif text-[42px] font-bold tracking-widest mt-3 transition-colors ${selectedTheme.titleColor}`}>
                      CERTIFICATE OF ACHIEVEMENT
                    </h2>
                    
                    <div className={`subtitle font-serif text-[22px] tracking-wide uppercase font-bold mt-2.5 transition-colors ${selectedTheme.subTitleColor}`}>
                      {certData.tournamentName || 'CHESS TOURNAMENT 2026'}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="my-3 space-y-5">
                    <p className="text-serif italic text-lg text-neutral-600 dark:text-neutral-300">
                      This is happily to certify that
                    </p>
                    
                    <div>
                      <span className={`player-name font-serif text-[34px] font-extrabold pb-1.5 px-6 border-b-2 tracking-tight transition-colors ${selectedTheme.playerNameColor} ${selectedTheme.innerBorder}`}>
                        {certData.playerName || '[PLAYER NAME YAHAN LIKHO]'}
                      </span>
                    </div>

                    <p className="text-serif italic text-lg text-neutral-600 dark:text-neutral-300">
                      {certData.achievementText || 'has secured 1st Place in the tournament'}
                    </p>
                  </div>

                  {/* Ranks Row */}
                  <div className="flex justify-center gap-20 my-2 text-neutral-750 dark:text-neutral-200">
                    <div className="font-serif text-lg flex items-center gap-2.5">
                      <span>School Rank:</span>
                      <span className="border-b border-neutral-700 min-w-[120px] inline-block font-extrabold text-neutral-900 dark:text-white px-2 mt-0.5">
                        {certData.schoolRank || '[RANK]'}
                      </span>
                    </div>
                    
                    <div className="font-serif text-lg flex items-center gap-2.5">
                      <span>Class Rank:</span>
                      <span className="border-b border-neutral-700 min-w-[120px] inline-block font-extrabold text-neutral-900 dark:text-white px-2 mt-0.5">
                        {certData.classRank || '[RANK]'}
                      </span>
                    </div>
                  </div>

                  {/* Venue Details row */}
                  <div className="text-neutral-600 dark:text-neutral-300 font-serif text-base flex justify-center gap-10 py-1 flex-wrap">
                    <div>
                      Date: <span className="border-b border-neutral-700 min-w-[140px] inline-block text-neutral-900 dark:text-white font-bold px-2">{certData.date || '[DATE]'}</span>
                    </div>
                    <div>
                      Venue: <span className="border-b border-neutral-700 min-w-[200px] inline-block text-neutral-900 dark:text-white font-bold px-2">{certData.venue || '[VENUE]'}</span>
                    </div>
                    <div>
                      Category: <span className="border-b border-neutral-700 min-w-[150px] inline-block text-neutral-900 dark:text-white font-bold px-2">{certData.category || '[CATEGORY]'}</span>
                    </div>
                  </div>

                  {/* Signatures Panel */}
                  <div className="flex justify-between mt-8 px-16 select-none pointer-events-none">
                    <div className="text-center w-[250px]">
                      {/* Stylized simulated physical ink pen lines */}
                      <div className="italic text-amber-650 font-serif pl-1.5 h-7">ChessMaster Auth.</div>
                      <div className="border-t-2 border-neutral-800 pt-1.5 dark:border-neutral-700/80">
                        <span className="text-neutral-800 dark:text-neutral-200 font-serif text-3xs uppercase font-extrabold tracking-widest block header">
                          {certData.signatureLeft || 'CheckmatePro CHESS'}
                        </span>
                      </div>
                    </div>

                    <div className="text-center w-[250px]">
                      {/* Stylized signature graphic representation mockup */}
                      <div className="italic text-cyan-650 font-serif pr-1.5 h-7 font-semibold">Principal sign.</div>
                      <div className="border-t-2 border-neutral-800 pt-1.5 dark:border-neutral-700/80">
                        <span className="text-neutral-800 dark:text-neutral-200 font-serif text-3xs uppercase font-extrabold tracking-widest block header">
                          {certData.signatureRight || 'Principal'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Authorized Footer Sub note tag */}
                  <div className="text-neutral-450 dark:text-neutral-500 font-sans italic text-4xs uppercase tracking-widest mt-2">
                    AUTHORIZED BY CHECKMATEPRO CHESS ACADEMY SYSTEM NETWORK COOPERATIVE
                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* User manual warning footer toolbar help */}
          <p className="no-print text-5xs font-mono text-neutral-500 uppercase leading-relaxed text-center select-text">
            💡 <b>Tip:</b> When the Print dialog appears, enable <b>"Background graphics"</b> and set slide format orientation to <b>"Landscape"</b> to capture the gorgeous colors and border styling perfectly.
          </p>

        </div>

      </div>

    </div>
  );
}
