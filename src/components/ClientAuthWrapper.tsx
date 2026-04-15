"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { User } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "register" | "onboarding";

export default function ClientAuthWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { user, loginAccount, registerAccount, updateProfile, restoreBackup, _hasHydrated } = useStore();
  
  const [mode, setMode] = useState<AuthMode>("login");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Login / Register fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Onboarding fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("22");
  const [gender, setGender] = useState<User['gender']>("Female");
  const [band, setBand] = useState<number>(7.0);
  const [style, setStyle] = useState<User['preferredStyle']>("");

  useEffect(() => {
    setMounted(true);
    if (!_hasHydrated) return; 
    
    if (user) {
      if (user.hasOnboarded) {
        // App handles the rest
      } else {
        setMode("onboarding");
        setName(user.name || "");
        setAge(user.age || "22");
        setGender(user.gender || "Female");
        setBand(user.targetBand || 7.0);
        setStyle(user.preferredStyle || "");
      }
    } else {
      setMode("login");
    }
  }, [user, _hasHydrated]);

  if (!mounted || !_hasHydrated) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (user && user.hasOnboarded) {
    return <>{children}</>;
  }

  const handleLogin = async () => {
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter email and password.");
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cloud_save')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('password', password)
        .single();
        
      if (error || !data) {
        // Fallback to local check
        const success = loginAccount(email.trim(), password);
        if (!success) {
          setErrorMsg("Account not found. Please register first.");
          setIsLoading(false);
          return;
        }
      } else {
        // Cloud success! Hydrate everything
        if (data.app_data && Object.keys(data.app_data).length > 0) {
          restoreBackup(data.app_data);
        } else {
          // If for some reason app_data is empty but row exists, we still login
          loginAccount(email.trim(), password);
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error trying to login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter email and password.");
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if exists
      const { data: existing } = await supabase.from('cloud_save').select('email').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (existing) {
        setErrorMsg("Email already registered. Please sign in.");
        setIsLoading(false);
        return;
      }

      const newUser: User = {
        id: uuidv4(),
        email: email.trim().toLowerCase(),
        password,
        name: "", 
        age: "",
        gender: "Female",
        targetBand: 7.0,
        preferredStyle: "",
        hasOnboarded: false
      };

      // Save empty shell to cloud
      const initialData = { user: newUser, categories: [], topics: [], stories: [] };
      await supabase.from('cloud_save').insert({
        email: newUser.email,
        password: newUser.password,
        app_data: initialData
      });

      registerAccount(newUser);
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-white flex flex-col justify-center px-6 overflow-y-auto animate-in fade-in duration-500 py-10">
      <div className="max-w-md w-full mx-auto space-y-10">
        
        {/* Header Block */}
        <div className="space-y-3">
          <h1 className="text-4xl font-playfair tracking-tight">
            {mode === 'login' ? 'Welcome back.' : mode === 'register' ? 'Create Account.' : 'Personalize.'}
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed font-light">
            {mode === 'login' && 'Sign in to continue your IELTS preparation journey.'}
            {mode === 'register' && 'Set up an account to save your AI scripts, vocabulary, and stats.'}
            {mode === 'onboarding' && 'We personalize your AI guidance based on your demographic to ensure your answers are authentic and stylistically native.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* Form Content */}
        {mode === 'login' || mode === 'register' ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Email</label>
              <input 
                type="email"
                className="w-full border-b border-gray-200 py-3 text-lg outline-none focus:border-black transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Password</label>
              <input 
                type="password"
                className="w-full border-b border-gray-200 py-3 text-lg outline-none focus:border-black transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    mode === 'login' ? handleLogin() : handleRegister();
                  }
                }}
              />
            </div>

            <div className="pt-6 space-y-4">
              <button 
                onClick={mode === 'login' ? handleLogin : handleRegister}
                disabled={!email || !password || isLoading}
                className="w-full bg-black text-white py-4 rounded-xl text-sm uppercase tracking-widest font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                {mode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
              
              <button 
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setErrorMsg("");
                }}
                className="w-full py-4 text-xs font-medium text-gray-400 hover:text-black transition-all"
              >
                {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Name or Nickname</label>
              <input 
                className="w-full border-b border-gray-200 py-3 text-xl outline-none font-playfair focus:border-black transition-all"
                placeholder="Jane Doe"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Age</label>
                <input 
                  type="number"
                  className="w-full border-b border-gray-200 py-3 text-xl outline-none focus:border-black transition-all"
                  placeholder="22"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Gender</label>
                <select 
                  className="w-full border-b border-gray-200 py-3 text-xl outline-none focus:border-black transition-all bg-transparent"
                  value={gender}
                  onChange={e => setGender(e.target.value as User['gender'])}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Target Band</label>
              <div className="flex gap-2 flex-wrap pt-2">
                {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5].map((b) => (
                  <button 
                    key={b}
                    onClick={() => setBand(b)}
                    className="flex-1 py-3 text-center border rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: band === b ? '#0a0a0a' : 'transparent',
                      color: band === b ? '#fff' : '#0a0a0a',
                      borderColor: band === b ? '#0a0a0a' : '#eaeaea',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Preferred AI Style (Optional)</label>
              <select 
                className="w-full border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-black transition-all bg-transparent font-medium"
                value={style}
                onChange={e => setStyle(e.target.value as User['preferredStyle'])}
              >
                <option value="">No Preference (Default)</option>
                <option value="Chill & Native">Chill & Native (Slang, idioms, easygoing)</option>
                <option value="Academic & Formal">Academic & Formal (Complex structures, strict)</option>
                <option value="Professional & Sharp">Professional & Sharp (Business-like, concise)</option>
                <option value="Storyteller">Storyteller (Descriptive, emotive, narrative-driven)</option>
              </select>
            </div>

            <div className="pt-8">
              <button 
                disabled={!name.trim() || !age.trim()}
                onClick={() => {
                  updateProfile({
                    name: name.trim(),
                    age: age.trim(),
                    gender,
                    targetBand: band,
                    preferredStyle: style,
                    hasOnboarded: true
                  });
                }}
                className="w-full bg-black text-white py-4 rounded-xl text-sm uppercase tracking-widest font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-all shadow-xl"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
