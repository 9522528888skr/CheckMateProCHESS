import { useState, FormEvent, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Shield, 
  Mail, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  GraduationCap 
} from 'lucide-react';
const HARDCODED_ACADEMIES = [
  { 
    id: 'sumeet_rasela_parasia_001',
    name: 'Sumeet Rasela Chess Academy',
    academyName: 'Sumeet Rasela Chess Academy',
    city: 'Parasia'
  }
];

const LoginPage = () => {
  const [academies, setAcademies] = useState(HARDCODED_ACADEMIES);
  const [signUpAcademyId, setSignUpAcademyId] = useState('');
import { 
  loginUser, 
  registerPlayer, 
  isMockActive, 
  AppUser, 
  AcademyDoc 
} from '../lib/firebase';

interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
  academies: AcademyDoc[];
  onShowLeaderboard: () => void;
}

type ActiveTab = 'player' | 'academy' | 'admin';

export default function LoginPage({ onLoginSuccess, academies, onShowLeaderboard }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('player');
  const [isSignUpPlayer, setIsSignUpPlayer] = useState(false);

  // Sign in form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Player sign up form states
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpAge, setSignUpAge] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpSchool, setSignUpSchool] = useState('');
  const [signUpAcademyId, setSignUpAcademyId] = useState('');
  const [signUpClass, setSignUpClass] = useState('1st');
  const [signUpPassword, setSignUpPassword] = useState('');

  // Status and loading states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CAPTCHA verification states
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaVerifying, setCaptchaVerifying] = useState(false);

  // Set default academy selection once loaded
  useEffect(() => {
    if (academies.length > 0 && !signUpAcademyId) {
      const defaultAcademy = academies.find(
        (a) => a.name === "Sumeet Rasela" && a.city === "Parasia"
      ) || academies[0];
      setSignUpAcademyId(defaultAcademy.id);
    }
  }, [academies, signUpAcademyId]);

  // Reset states on tab toggle
  const handleTabToggle = (tabValue: ActiveTab) => {
    setActiveTab(tabValue);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmail('');
    setPassword('');
    setIsSignUpPlayer(false);
    setCaptchaVerified(false);
    setCaptchaVerifying(false);
  };

  // Perform portal logins
  const handleFormLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please formulate email and password entries fully.");
      return;
    }

    if (!captchaVerified) {
      setErrorMsg("Please verify that you are not a robot.");
      return;
    }
    
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const profile = await loginUser(email, password, activeTab);
      setSuccessMsg(`Welcome back, ${profile.fullName}! Verified successfully.`);
      // Delay slightly to allow success message to animate
      setTimeout(() => {
        onLoginSuccess(profile);
      }, 500);
    } catch (e: any) {
      setErrorMsg(e.message || "Invalid account login details provided.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Perform self registration
  const handlePlayerSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!signUpFullName || !signUpUsername || !signUpEmail || !signUpPassword || !signUpPhone || !signUpAge || !signUpSchool || !signUpClass) {
      setErrorMsg("Please populate all signup details fully.");
      return;
    }

    if (!captchaVerified) {
      setErrorMsg("Please verify that you are not a robot.");
      return;
    }

    if (!signUpAcademyId) {
      setErrorMsg("Please select academy");
      return;
    }

    const selectedAcademy = academies.find((a) => a.id === signUpAcademyId);
    if (!selectedAcademy) {
      setErrorMsg("Please select academy");
      return;
    }

    const cleanUsername = signUpUsername.trim();
    if (cleanUsername.length < 3) {
      setErrorMsg("Username must be at least 3 characters.");
      return;
    }
    if (/\s/.test(cleanUsername)) {
      setErrorMsg("Username must not contain any spaces.");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(cleanUsername)) {
      setErrorMsg("Username must contain alphanumeric characters only.");
      return;
    }

    const parsedAge = parseInt(signUpAge);
    if (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 100) {
      setErrorMsg("Age must be between 5 and 100.");
      return;
    }

    const cleanPhone = signUpPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg("Phone number must contain exactly 10 digits.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const profile = await registerPlayer({
        fullName: signUpFullName,
        username: cleanUsername,
        email: signUpEmail,
        password: signUpPassword,
        phone: cleanPhone,
        age: parsedAge,
        school: signUpSchool,
        class: signUpClass,
        academyId: selectedAcademy.id,
        academyName: selectedAcademy.name,
        academyCity: selectedAcademy.city,
      });
      setSuccessMsg("Account registered successfully! Welcome to CheckMateProChess arena.");
      
      // Clean up fields
      setSignUpFullName('');
      setSignUpUsername('');
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpPhone('');
      setSignUpAge('');
      setSignUpSchool('');
      setSignUpClass('1st');
      setIsSignUpPlayer(false);

      setTimeout(() => {
        onLoginSuccess(profile);
      }, 800);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to finalize registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCaptchaBox = () => {
    return (
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between shadow-inner my-3.5 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (captchaVerified || captchaVerifying) return;
              setCaptchaVerifying(true);
              setTimeout(() => {
                setCaptchaVerifying(false);
                setCaptchaVerified(true);
              }, 1000);
            }}
            className={`w-6 h-6 rounded border transition-all flex items-center justify-center cursor-pointer ${
              captchaVerified 
                ? 'bg-emerald-500 border-emerald-500 text-neutral-950' 
                : 'bg-neutral-900 border-neutral-750 hover:border-neutral-500'
            }`}
          >
            {captchaVerifying && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            )}
            {captchaVerified && (
              <svg className="w-4 h-4 text-neutral-950 font-bold" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <span className="text-3xs font-medium text-neutral-300">I'm not a robot</span>
        </div>
        <div className="flex flex-col items-center select-none shrink-0 pr-1">
          {/* Recaptcha trademark styling */}
          <div className="w-6 h-6 flex items-center justify-center text-xs text-blue-500 font-bold leading-none animate-spin-slow">
            ⟳
          </div>
          <span className="text-[7px] text-neutral-500 font-bold leading-none tracking-tight uppercase">reCAPTCHA</span>
          <div className="flex gap-1 text-[6.5px] text-neutral-600 mt-1">
            <a href="https://www.google.com/intl/en/policies/privacy/" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy</a>
            <span>•</span>
            <a href="https://www.google.com/intl/en/policies/terms/" target="_blank" rel="noopener noreferrer" className="hover:underline">Terms</a>
          </div>
        </div>
      </div>
    );
  };

  const renderWhatsAppButton = () => {
    return (
      <div className="flex justify-center pt-2">
        <a 
          href="https://wa.me/917000263828" 
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="bg-green-500 hover:bg-green-650 text-white font-extrabold text-2xs uppercase tracking-wide px-5 py-3 rounded-xl transition-all shadow-md inline-flex items-center gap-2"
        >
          Need Help? Chat: 7000263828
        </a>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      
      {/* Aesthetic Branding Header Accent Block */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/10 select-none">
          ♛
        </div>
        <h1 className="font-extrabold text-2xl tracking-tighter text-white uppercase mt-4">
          CheckMatePro<span className="text-amber-500 font-black">Chess</span>
        </h1>
        <p className="text-5xs font-mono text-neutral-500 uppercase tracking-widest leading-relaxed">
          Academy Management Suite & Interactive Strategic Coach
        </p>
      </div>

      {/* Public Leaderboard shortcut utility */}
      <div className="text-center">
        <button
          type="button"
          onClick={onShowLeaderboard}
          className="px-3 py-1.5 rounded-lg text-4xs font-mono font-bold uppercase tracking-widest bg-neutral-900 hover:bg-neutral-850 text-amber-500 border border-neutral-800/60 transition-colors cursor-pointer"
        >
          🏆 View Public Leaderboard
        </button>
      </div>

      {/* 3 tabs switcher bar */}
      <div className="bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 grid grid-cols-3 text-center">
        {[
          { id: 'player' as const, name: 'Player', desc: 'Login / Sign Up' },
          { id: 'academy' as const, name: 'Academy', desc: 'Licenced Hubs' },
          { id: 'admin' as const, name: 'Admin', desc: 'Control Node' }
        ].map((tab) => {
          const isSel = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabToggle(tab.id)}
              className={`py-3 rounded-xl cursor-pointer transition-all ${
                isSel
                  ? 'bg-neutral-800 text-white font-extrabold shadow border border-neutral-700/55'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40 text-2xs font-semibold'
              }`}
            >
              <span className="text-xs uppercase tracking-tight block">{tab.name}</span>
              <span className="text-5xs font-mono block text-neutral-500 font-normal mt-0.5">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Login credentials frame card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6.5 shadow-2xl relative overflow-hidden text-left">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-1" />

        {/* Tab identity info banner */}
        <div className="mb-6 flex items-center gap-2.5 pb-4 border-b border-neutral-800">
          <div className="p-2 bg-amber-500/15 rounded-lg text-amber-500">
            {activeTab === 'player' && <User className="w-4 h-4" />}
            {activeTab === 'academy' && <Building2 className="w-4 h-4" />}
            {activeTab === 'admin' && <Shield className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
              <span>{activeTab === 'player' ? 'Player Portal' : activeTab === 'academy' ? 'Licenced Academy Hub' : 'System Administration'}</span>
              {!isSignUpPlayer && (
                <span className="text-4xs font-mono tracking-widest text-[#cfcfcf]/45 bg-[#cfcfcf]/5 px-2 py-0.5 rounded uppercase">Sign In</span>
              )}
              {isSignUpPlayer && (
                <span className="text-4xs font-mono tracking-widest text-[#cfcfcf]/45 bg-[#cfcfcf]/5 px-2 py-0.5 rounded uppercase">Registration</span>
              )}
            </h2>
            <p className="text-5xs font-mono text-neutral-500 uppercase mt-0.5">
              {activeTab === 'player' 
                ? 'Access your player account or establish a new profile to play' 
                : activeTab === 'academy' 
                  ? 'Academy Operator login credentials verification required' 
                  : 'System operator fixed authentication channel'}
            </p>
          </div>
        </div>

        {/* Success / Error notification alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-3xs text-red-400 font-bold flex items-center gap-2 select-text">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-3xs text-emerald-400 font-bold flex items-center gap-2 select-text">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORM AREA */}
        {activeTab === 'player' && isSignUpPlayer ? (
          
          /* PLAYER SIGN UP FORM */
          <form onSubmit={handlePlayerSignUp} className="space-y-4">
            {/* 1. Full Name */}
            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="text"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white select-text"
                  placeholder="e.g. Bobby Fischer"
                  value={signUpFullName}
                  onChange={(e) => setSignUpFullName(e.target.value)}
                />
              </div>
            </div>

            {/* 2. Username */}
            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">Username (@)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-mono font-bold select-none">@</span>
                <input
                  type="text"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white font-mono select-text"
                  placeholder="e.g. fisch12"
                  value={signUpUsername}
                  onChange={(e) => setSignUpUsername(e.target.value)}
                />
              </div>
            </div>

            {/* 3 & 4. Age & Phone */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-5xs font-mono uppercase text-neutral-400">Age</label>
                <input
                  type="text"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 rounded-xl focus:outline-none focus:border-amber-500 text-white select-text"
                  placeholder="Min 5, Max 100"
                  value={signUpAge}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/\D/g, '');
                    setSignUpAge(cleanVal);
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-5xs font-mono uppercase text-[#cfcfcf]">Phone</label>
                <input
                  type="text"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 rounded-xl focus:outline-none focus:border-amber-500 text-white select-text"
                  placeholder="10 digit phone"
                  value={signUpPhone}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setSignUpPhone(cleanVal);
                  }}
                />
              </div>
            </div>

            {/* 5. Email Address */}
            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="email"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white select-text"
                  placeholder="email@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                />
              </div>
            </div>

            {/* 6. School/College Name */}
            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">School/College Name</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="text"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white select-text"
                  placeholder="e.g. Royal Chess Academy"
                  value={signUpSchool}
                  onChange={(e) => setSignUpSchool(e.target.value)}
                />
              </div>
            </div>

            {/* 7. SELECT ACADEMY */}
            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">SELECT ACADEMY</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <select
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white appearance-none cursor-pointer flex items-center pr-10"
                  value={signUpAcademyId}
                  onChange={(e) => setSignUpAcademyId(e.target.value)}
                >
                  <option value="" className="bg-neutral-900 text-neutral-450">-- Choose Academy --</option>
                  {academies.map((ac) => (
                    <option key={ac.id} value={ac.id} className="bg-neutral-900 text-white">
                      {ac.name} - {ac.city}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-neutral-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* 8. Class/Standard Dropdown */}
            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">Class / Standard</label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <select
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white appearance-none cursor-pointer"
                  value={signUpClass}
                  onChange={(e) => setSignUpClass(e.target.value)}
                >
                  {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "Graduate", "Post Graduate", "Other"].map((cls) => (
                    <option key={cls} value={cls} className="bg-neutral-900 text-white">
                      {cls}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-neutral-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* 9. Secure Password */}
            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="password"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white"
                  placeholder="Minimum 6 characters"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                />
              </div>
            </div>

            {renderCaptchaBox()}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 text-neutral-950 bg-amber-500 hover:bg-amber-600 font-extrabold text-2xs tracking-widest uppercase rounded-xl transition-all shadow cursor-pointer flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>REGISTER PLAYER ACCOUNT</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsSignUpPlayer(false)}
                className="text-amber-500 hover:text-amber-400 transition-colors text-3xs font-bold uppercase tracking-wider cursor-pointer font-black"
              >
                Already have an account? Sign In
              </button>
            </div>

          </form>
        ) : (
          
          /* PLAYER OR ACADEMY OR ADMIN STANDARD SIGN IN FORM */
          <form onSubmit={handleFormLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">EMAIL ADDRESS (LOGIN ID)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="email"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3.5 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white select-text"
                  placeholder={activeTab === 'admin' ? "9522528888skr@gmail.com" : "e.g. operator@hub.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-5xs font-mono uppercase text-neutral-400">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="password"
                  required
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 p-3.5 pl-10 rounded-xl focus:outline-none focus:border-amber-500 text-white"
                  placeholder="Enter account security key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {renderCaptchaBox()}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow-lg cursor-pointer flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>AUTHENTICATE PORTAL KEYS</span>
              )}
            </button>

            {activeTab === 'player' && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpPlayer(true);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-amber-500 hover:text-amber-400 text-3xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Don't have account? Sign Up
                </button>
              </div>
            )}

          </form>
        )}

        {/* Persistent WhatsApp Button under all tab login screens */}
        <div className="mt-6 pt-5 border-t border-neutral-800 space-y-4">
          {renderWhatsAppButton()}
        </div>

      </div>

    </div>
  );
}
