import { useState, useCallback, useEffect } from "react";
import { useStore } from "@/lib/store";

export type TTSRole = "user" | "examiner";

export function useTTS() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { user } = useStore();

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeech = useCallback((id: string, text: string, role: TTSRole = "user") => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
    } else {
      window.speechSynthesis.cancel();
      if (!text || text.trim().length === 0) return;

      // 1. Text Normalization for Thought Groups
      let normalized = text.trim();
      if (!normalized.match(/[.!?]$/)) normalized += ".";
      // Ensure pauses after punctuation are clear to the engine
      normalized = normalized.replace(/([,;:.!])\s*/g, "$1 ");

      const utterance = new SpeechSynthesisUtterance(normalized);
      const voices = window.speechSynthesis.getVoices();

      /**
       * CANDIDATE & EXAMINER VOICE SELECTION
       * Strictly prioritizing Neural/Online voices for professional cadence/stress
       */
      const getBestNeuralVoice = (gender: "Male" | "Female") => {
        const candidates = voices.filter((v) => v.lang.startsWith("en"));
        
        // Elite Neural/Online keywords (Best stress patterns)
        const neuralKeywords = ["google", "online", "natural", "neural", "multilingual", "edge"];
        const maleNames = ["daniel", "james", "rishi", "marcus", "ryan", "guy", "david"];
        const femaleNames = ["samantha", "siri", "victoria", "serena", "sonia", "aria", "zira"];

        const prioritized = candidates.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          let aScore = 0;
          let bScore = 0;

          // 1. Neural engines are mandatory for "stress/prosody"
          if (neuralKeywords.some(kw => aName.includes(kw))) aScore += 1000;
          if (neuralKeywords.some(kw => bName.includes(kw))) bScore += 1000;

          // 2. Local/Enhanced fallback
          if (aName.includes("enhanced") || aName.includes("premium")) aScore += 500;
          if (bName.includes("enhanced") || bName.includes("premium")) bScore += 500;

          // 3. GB Preference
          if (a.lang.includes("GB")) aScore += 100;
          if (b.lang.includes("GB")) bScore += 100;

          // 4. Gender Match
          const targetNames = gender === "Male" ? maleNames : femaleNames;
          if (targetNames.some((n) => aName.includes(n))) aScore += 200;
          if (targetNames.some((n) => bName.includes(n))) bScore += 200;

          return bScore - aScore;
        });

        return prioritized[0];
      };

      if (role === "user") {
        // CANDIDATE PROFILE: 0.88 Rate is the "sweet spot" for high-band fluency
        const voice = getBestNeuralVoice(user?.gender === "Male" ? "Male" : "Female");
        if (voice) utterance.voice = voice;
        else utterance.lang = "en-GB";
        
        utterance.pitch = 1.0;
        utterance.rate = 0.88; 
      } else {
        // EXAMINER PROFILE: Slightly crisper/faster for questioning
        const voice = getBestNeuralVoice(Math.random() > 0.5 ? "Male" : "Female");
        if (voice) utterance.voice = voice;
        else utterance.lang = "en-GB";

        utterance.pitch = 1.0;
        utterance.rate = 0.95;
      }

      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
      setPlayingId(id);
    }
  }, [playingId, user]);

  return { playingId, toggleSpeech };
}
