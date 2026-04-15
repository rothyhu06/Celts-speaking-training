import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Category, Question, Topic, Story, User } from '@/types';

interface AppState {
  user: User | null;
  accounts: User[];
  categories: Category[];
  topics: Topic[];
  stories: Story[];

  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;

  // User actions
  setUser: (user: User | null) => void;
  updateProfile: (updates: Partial<User>) => void;
  registerAccount: (user: User) => void;
  loginAccount: (email: string, password?: string) => boolean;
  logout: () => void;

  // Category actions
  addCategory: (name: string) => void;
  deleteCategory: (categoryId: string) => void;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;

  // Question actions
  addQuestion: (categoryId: string, question: string, answer?: string) => void;
  updateQuestion: (categoryId: string, questionId: string, updates: Partial<Question>) => void;
  deleteQuestion: (categoryId: string, questionId: string) => void;
  batchImportQA: (pairs: { category: string; question: string; answer?: string; translation?: string; vocabAnalysisText?: string; chineseLogic?: string }[]) => void;

  // Topic actions
  addTopic: (title: string, cueCard?: string) => void;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  deleteTopic: (topicId: string) => void;

  // Story actions
  addStory: (title: string, tag: string, summary?: string) => void;
  updateStory: (storyId: string, updates: Partial<Story>) => void;
  deleteStory: (storyId: string) => void;

  // Part 3 actions
  addPart3Question: (topicId: string, question: string) => void;
  updatePart3Question: (topicId: string, questionId: string, updates: Partial<import('@/types').Part3Question>) => void;
  deletePart3Question: (topicId: string, questionId: string) => void;
  batchImportPart3: (topicId: string, questions: string[]) => void;
  
  restoreBackup: (data: Partial<AppState>) => void;
}

const DEFAULT_USER: User = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'password123',
  name: 'Candidate',
  age: '22',
  gender: 'Female',
  targetBand: 7,
  preferredStyle: 'Chill & Native',
  examDate: '',
  hasOnboarded: true,
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Hometown & Living',
    questions: [
      {
        id: 'q-1',
        question: 'Where are you from?',
        answer: "I'm originally from Chengdu, a city in southwest China that's famous for its spicy food and giant pandas. It's quite a vibrant place — people there really know how to enjoy life.",
        translation: '我来自中国西南部的成都,那里以麻辣食物和大熊猫闻名。那是个充满活力的地方——那里的人们真的很会享受生活。',
        chineseLogic: '先点明城市,再加一个有趣的特色,显得回答有内容。',
        isAiGenerated: { answer: false, translation: false },
      },
      {
        id: 'q-2',
        question: 'Do you live in a house or a flat?',
        answer: "I live in a mid-rise apartment in the city centre. It's quite convenient — I can walk to almost everything I need, from cafes to grocery stores.",
        translation: '我住在市中心的一栋中层公寓里。非常方便——从咖啡馆到杂货店,几乎一切我需要的都可以步行到达。',
        chineseLogic: '',
        isAiGenerated: { answer: false, translation: false },
      },
    ],
  },
  {
    id: 'cat-2',
    userId: 'user-1',
    name: 'Work & Study',
    questions: [
      {
        id: 'q-3',
        question: 'Are you working or studying at the moment?',
        answer: "I'm currently studying for my IELTS exam while also doing a part-time internship at a marketing firm. It keeps me pretty busy, but I enjoy the balance.",
        translation: '我目前正在备考雅思,同时在一家营销公司做兼职实习。这让我相当忙碌,但我喜欢这种平衡。',
        chineseLogic: '',
        isAiGenerated: { answer: false, translation: false },
      },
    ],
  },
];

const DEFAULT_STORIES: Story[] = [
  { id: 'story-1', userId: 'user-1', tag: 'Person', title: 'My University Professor', summary: 'An inspiring mentor who changed my perspective on learning.' },
  { id: 'story-2', userId: 'user-1', tag: 'Object', title: 'My First Smartphone', summary: 'A gift from my parents that connected me to the digital world.' },
  { id: 'story-3', userId: 'user-1', tag: 'Place', title: 'My Hometown Park', summary: 'A peaceful place where I spent many childhood weekends.' },
  { id: 'story-4', userId: 'user-1', tag: 'Event', title: 'Learning to Cook', summary: 'A summer I spent improving my culinary skills.' },
];

const DEFAULT_TOPICS: Topic[] = [
  {
    id: 'topic-1',
    userId: 'user-1',
    title: 'Describe a person who has influenced you',
    cueCard: 'You should say:\n- Who this person is\n- How you met them\n- What they do\n- And explain why they have influenced you',
    linkedStoryId: 'story-1',
    part3Questions: [],
    isAiGenerated: { script: false, translation: false },
  },
  {
    id: 'topic-2',
    userId: 'user-1',
    title: 'Describe an important object you own',
    cueCard: 'You should say:\n- What it is\n- How you got it\n- How long you have had it\n- And explain why it is important to you',
    linkedStoryId: 'story-2',
    isAiGenerated: { script: false, translation: false },
  },
  {
    id: 'topic-3',
    userId: 'user-1',
    title: 'Describe a natural place you visited',
    cueCard: 'You should say:\n- Where this place is\n- When you visited\n- What you did there\n- And explain why you liked it',
    isAiGenerated: { script: false, translation: false },
  },
  {
    id: 'topic-4',
    userId: 'user-1',
    title: 'Describe a skill you recently learned',
    cueCard: 'You should say:\n- What the skill is\n- Why you learned it\n- How you learned it\n- And explain how you feel about learning it',
    linkedStoryId: 'story-4',
    isAiGenerated: { script: false, translation: false },
  },
  {
    id: 'topic-5',
    userId: 'user-1',
    title: 'Describe a time you helped someone',
    cueCard: 'You should say:\n- Who you helped\n- When and where\n- What you did\n- And explain how you felt afterwards',
    isAiGenerated: { script: false, translation: false },
  },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null as User | null,
      accounts: [DEFAULT_USER],
      categories: DEFAULT_CATEGORIES,
      topics: DEFAULT_TOPICS,
      stories: DEFAULT_STORIES,

      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setUser: (user) => set({ user }),
      updateProfile: (updates) =>
        set((state) => {
          if (!state.user) return state;
          const updatedUser = { ...state.user, ...updates };
          return {
            user: updatedUser,
            accounts: state.accounts.map((acc) => (acc.id === updatedUser.id ? updatedUser : acc)),
          };
        }),
      registerAccount: (user: User) =>
        set((state) => ({
          accounts: [...state.accounts, user],
          user,
        })),
      loginAccount: (email, password) => {
        const state = get();
        const account = state.accounts.find(
          (acc) => acc.email?.toLowerCase() === email.toLowerCase() && acc.password === password
        );
        if (account) {
          set({ user: account });
          return true;
        }
        return false;
      },
      logout: () => set({ user: null }),

      addCategory: (name) =>
        set((state) => ({
          categories: [
            ...state.categories,
            {
              id: uuidv4(),
              userId: state.user?.id ?? 'user-1',
              name,
              questions: [],
            },
          ],
        })),

      deleteCategory: (categoryId) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== categoryId),
        })),

      updateCategory: (categoryId, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, ...updates } : c
          ),
        })),

      addQuestion: (categoryId, question, answer = '') =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  questions: [
                    ...c.questions,
                    {
                      id: uuidv4(),
                      question,
                      answer,
                      isAiGenerated: { answer: false, translation: false },
                    },
                  ],
                }
              : c
          ),
        })),

      updateQuestion: (categoryId, questionId, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  questions: c.questions.map((q) =>
                    q.id === questionId ? { ...q, ...updates } : q
                  ),
                }
              : c
          ),
        })),

      deleteQuestion: (categoryId, questionId) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? { ...c, questions: c.questions.filter((q) => q.id !== questionId) }
              : c
          ),
        })),

      batchImportQA: (pairs) =>
        set((state) => {
          let updatedCategories = [...state.categories];
          pairs.forEach((parsedQ) => {
            let cat = updatedCategories.find(
              (c) => c.name.toLowerCase() === parsedQ.category.toLowerCase() && c.userId === (state.user?.id ?? 'user-1')
            );
            if (!cat) {
              cat = {
                id: uuidv4(),
                userId: state.user?.id ?? 'user-1',
                name: parsedQ.category,
                questions: [],
              };
              updatedCategories.push(cat);
            }
            cat.questions = [
              ...cat.questions,
              {
                id: uuidv4(),
                question: parsedQ.question,
                answer: parsedQ.answer ?? '',
                translation: parsedQ.translation || undefined,
                vocabAnalysisText: parsedQ.vocabAnalysisText || undefined,
                isAiGenerated: { answer: false, translation: false },
              },
            ];
          });
          return { categories: updatedCategories };
        }),

      addTopic: (title, cueCard) =>
        set((state) => ({
          topics: [
            ...state.topics,
            {
              id: uuidv4(),
              userId: state.user?.id ?? 'user-1',
              title,
              cueCard,
              part3Questions: [],
              isAiGenerated: { script: false, translation: false },
            },
          ],
        })),

      updateTopic: (topicId, updates) =>
        set((state) => ({
          topics: state.topics.map((t) => (t.id === topicId ? { ...t, ...updates } : t)),
        })),

      deleteTopic: (topicId) =>
        set((state) => ({ topics: state.topics.filter((t) => t.id !== topicId) })),

      addStory: (title, tag, summary) =>
        set((state) => ({
          stories: [
            ...state.stories,
            {
              id: uuidv4(),
              userId: state.user?.id ?? 'user-1',
              title,
              tag,
              summary,
            },
          ],
        })),

      updateStory: (storyId, updates) =>
        set((state) => ({
          stories: state.stories.map((s) => (s.id === storyId ? { ...s, ...updates } : s)),
        })),

      deleteStory: (storyId) =>
        set((state) => ({ stories: state.stories.filter((s) => s.id !== storyId) })),

      addPart3Question: (topicId, question) =>
        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === topicId
              ? {
                  ...t,
                  part3Questions: [
                    ...(t.part3Questions || []),
                    { id: uuidv4(), question, isAiGenerated: { answer: false, translation: false } },
                  ],
                }
              : t
          ),
        })),

      updatePart3Question: (topicId, questionId, updates) =>
        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === topicId
              ? {
                  ...t,
                  part3Questions: (t.part3Questions || []).map((q) =>
                    q.id === questionId ? { ...q, ...updates } : q
                  ),
                }
              : t
          ),
        })),

      deletePart3Question: (topicId, questionId) =>
        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === topicId
              ? {
                  ...t,
                  part3Questions: (t.part3Questions || []).filter((q) => q.id !== questionId),
                }
              : t
          ),
        })),

      batchImportPart3: (topicId, questions) =>
        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === topicId
              ? {
                  ...t,
                  part3Questions: [
                    ...(t.part3Questions || []),
                    ...questions.map((q) => ({
                      id: uuidv4(),
                      question: q,
                      isAiGenerated: { answer: false, translation: false },
                    })),
                  ],
                }
              : t
          ),
        })),

      restoreBackup: (data) =>
        set((state) => {
          if (!data.user) return state;
          const restoredUser = data.user as User;
          
          // Ensure the restored user is in the accounts list
          const accountExists = state.accounts.some(acc => acc.email?.toLowerCase() === restoredUser.email?.toLowerCase());
          const newAccounts: User[] = accountExists 
            ? state.accounts.map(acc => acc.email?.toLowerCase() === restoredUser.email?.toLowerCase() ? restoredUser : acc)
            : [...state.accounts, restoredUser];

          // MERGE STRATEGY: Combine items by ID to prevent overwriting different datasets
          const mergeById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
            const map = new Map<string, T>();
            // Add local items (current user's data only to avoid bloating)
            local.filter(item => (item as any).userId === restoredUser.id).forEach(item => map.set(item.id, item));
            // Add remote items, overwriting if ID matches
            remote.forEach(item => map.set(item.id, item));
            
            // Re-attach other users' categories if they exist (unlikely in this context but safe)
            const otherUsersData = local.filter(item => (item as any).userId !== restoredUser.id);
            return [...otherUsersData, ...Array.from(map.values())];
          };

          return {
            ...state,
            user: restoredUser,
            accounts: newAccounts,
            categories: mergeById(state.categories, data.categories || []),
            topics: mergeById(state.topics, data.topics || []),
            stories: mergeById(state.stories, data.stories || [])
          };
        }),
    }),
    {
      name: 'ielts-flow-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
