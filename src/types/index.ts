export interface Question {
  id: string;
  question: string;
  answer: string;
  translation?: string;
  chineseLogic?: string;
  vocabAnalysis?: { phrase: string; translation: string }[];
  vocabAnalysisText?: string;
  aiCoaching?: string;
  isAiGenerated: {
    answer: boolean;
    translation: boolean;
    vocabAnalysisText?: boolean;
  };
  aiSuggestions?: {
    answer?: string;
    translation?: string;
    vocabAnalysisText?: string;
  };
  prepared?: boolean;
}

export interface Part3Question {
  id: string;
  question: string;
  answer?: string;
  translation?: string;
  chineseLogic?: string;
  vocabAnalysisText?: string;
  aiCoaching?: string;
  isAiGenerated?: {
    answer: boolean;
    translation: boolean;
    vocabAnalysisText?: boolean;
  };
  aiSuggestions?: {
    answer?: string;
    translation?: string;
    vocabAnalysisText?: string;
  };
  prepared?: boolean;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  questions: Question[];
}

export interface Topic {
  id: string;
  userId: string;
  title: string;
  cueCard?: string;
  script?: string;
  chineseLogic?: string;
  translation?: string;
  vocabAnalysisText?: string;
  aiCoaching?: string;
  transitionTip?: string;
  part3Questions?: Part3Question[];
  linkedStoryId?: string;
  isAiGenerated?: {
    script: boolean;
    translation: boolean;
    vocabAnalysisText?: boolean;
  };
  aiSuggestions?: {
    script?: string;
    translation?: string;
    vocabAnalysisText?: string;
  };
}

export interface Story {
  id: string;
  userId: string;
  title: string;
  tag: string; // e.g. "Person", "Object", "Place", "Event"
  summary?: string;
}

export interface User {
  id: string;
  email?: string;
  password?: string;
  name: string;
  age?: string;
  gender?: 'Male' | 'Female' | 'Other';
  targetBand: number;
  preferredStyle?: 'Chill & Native' | 'Academic & Formal' | 'Professional & Sharp' | 'Storyteller' | '';
  examDate?: string;
  hasOnboarded?: boolean;
}

export interface MockSession {
  topicId?: string;
  prepTime: number;    // seconds
  speakTime: number;   // seconds
}
