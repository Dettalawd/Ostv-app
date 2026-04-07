/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, Component, ErrorInfo, ReactNode } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  Search, 
  TrendingUp, 
  Globe, 
  Cpu, 
  Briefcase, 
  Film, 
  Trophy, 
  Tv,
  Loader2, 
  ArrowRight, 
  ExternalLink,
  X,
  Menu,
  ChevronRight,
  Clock,
  Calendar,
  Play,
  Radio,
  LogIn,
  LogOut,
  User as UserIcon,
  Bookmark,
  AlertCircle,
  Share2,
  Copy,
  Mail,
  Check,
  Twitter,
  Facebook,
  Linkedin,
  Flag,
  Moon,
  Sun
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  FirebaseUser,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc,
  OperationType,
  handleFirestoreError,
  testConnection
} from "./firebase";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong. Please try again later.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "{}");
        if (parsedError.error) {
          errorMessage = `OStv Error: ${parsedError.error}`;
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-gray-50 dark:bg-[#0F1115]">
          <div className="rounded-3xl p-8 max-w-md w-full shadow-xl text-center border transition-colors duration-300 bg-white border-red-100 shadow-red-100/20 dark:bg-[#16191F] dark:border-gray-800 dark:shadow-black/40">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-300 bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-black mb-4 uppercase tracking-tight text-gray-900 dark:text-gray-100">System Alert</h2>
            <p className="mb-8 leading-relaxed text-gray-600 dark:text-gray-400">
              {errorMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#ED1C24] text-white py-4 rounded-2xl font-bold hover:bg-[#B3151B] transition-all shadow-lg shadow-[#ED1C24]/20"
            >
              RELOAD APPLICATION
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Types
interface NewsItem {
  title: string;
  snippet: string;
  url: string;
  source: string;
  date?: string;
  category?: string;
  imageUrl?: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const CATEGORIES: Category[] = [
  { id: "top", name: "Top Stories", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "live", name: "Live TV", icon: <Tv className="w-4 h-4" /> },
  { id: "ghana", name: "Ghana", icon: <Flag className="w-4 h-4 text-green-600" /> },
  { id: "bookmarks", name: "Bookmarks", icon: <Bookmark className="w-4 h-4" /> },
  { id: "world", name: "World", icon: <Globe className="w-4 h-4" /> },
  { id: "tech", name: "Technology", icon: <Cpu className="w-4 h-4" /> },
  { id: "business", name: "Business", icon: <Briefcase className="w-4 h-4" /> },
  { id: "entertainment", name: "Entertainment", icon: <Film className="w-4 h-4" /> },
  { id: "sports", name: "Sports", icon: <Trophy className="w-4 h-4" /> },
];

// Logo Component
const OStvLogo = ({ className, isDarkMode }: { className?: string, isDarkMode?: boolean }) => (
  <svg viewBox="0 0 400 200" className={cn("h-full w-auto", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Stylized OS in Gold - Adjusted coordinates to fit viewBox */}
    <path d="M150 100C150 145 115 180 75 180C35 180 0 145 0 100C0 55 35 20 75 20C115 20 150 55 150 100Z" stroke={isDarkMode ? "#E5C06D" : "#E5C06D"} strokeWidth="20" />
    <path d="M150 100H250C300 100 340 130 340 160C340 190 300 190 250 190H150" stroke={isDarkMode ? "#E5C06D" : "#E5C06D"} strokeWidth="20" strokeLinecap="round" />
    <path d="M150 100H250C300 100 340 70 340 40C340 10 300 10 250 10H150" stroke={isDarkMode ? "#E5C06D" : "#E5C06D"} strokeWidth="20" strokeLinecap="round" />
    
    {/* Red TV Icon inside O */}
    <rect x="45" y="80" width="60" height="45" rx="8" fill="#ED1C24" />
    <path d="M65 65L75 80M85 65L75 80" stroke="#ED1C24" strokeWidth="4" strokeLinecap="round" />
    <text x="56" y="112" fill="white" fontSize="20" fontWeight="black" fontFamily="sans-serif">TV</text>
    
    {/* Red accent on S */}
    <path d="M250 10H340" stroke="#ED1C24" strokeWidth="12" strokeLinecap="round" />
  </svg>
);

export default function App() {
  return (
    <ErrorBoundary>
      <OStvApp />
    </ErrorBoundary>
  );
}

function OStvApp() {
  const apiKey = import.meta.env.VITE_NEWS_API_KEY;
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("top");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [articleSummary, setArticleSummary] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Auth Effects
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);

      if (firebaseUser) {
        // Sync user profile to Firestore
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || "OStv User",
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              role: "user",
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // Ignore cancelled popup request errors as they are usually user-initiated or race conditions
      if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchArticleSummary = async (article: NewsItem) => {
    setIsSummarizing(true);
    setArticleSummary("");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a detailed 3-paragraph summary and 3 key takeaways for this news article: "${article.title}" from ${article.source}. Snippet: ${article.snippet}. Use search to find more context if needed. Represent OStv news in your response.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      setArticleSummary(response.text || "Unable to generate summary at this time.");
    } catch (error) {
      console.error("Error summarizing article:", error);
      setArticleSummary("Error generating AI summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const modalContentRef = useRef<HTMLDivElement>(null);

  const handleArticleClick = (article: NewsItem) => {
    setSelectedArticle(article);
    fetchArticleSummary(article);
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getRelatedArticles = (currentArticle: NewsItem) => {
    if (!currentArticle) return [];
    
    // Simple matching based on title keywords and category
    const currentKeywords = currentArticle.title.toLowerCase().split(' ').filter(word => word.length > 3);
    
    return news
      .filter(item => item.url !== currentArticle.url) // Exclude current article
      .map(item => {
        let score = 0;
        if (item.category === currentArticle.category) score += 5;
        
        const itemTitle = item.title.toLowerCase();
        currentKeywords.forEach(keyword => {
          if (itemTitle.includes(keyword)) score += 2;
        });
        
        return { item, score };
      })
      .filter(res => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(res => res.item);
  };

  const fetchNews = useCallback(async (query: string, categoryName: string) => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Find the latest news for ${categoryName === "Top Stories" ? "the most important global events" : categoryName}. 
      Return a list of at least 10 news items. 
      For each item, provide:
      1. Title
      2. A concise snippet (2-3 sentences)
      3. The source name
      4. The URL to the original article
      5. A brief category tag
      
      Format the response as a JSON array of objects.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query || prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                snippet: { type: "STRING" },
                url: { type: "STRING" },
                source: { type: "STRING" },
                category: { type: "STRING" },
              },
              required: ["title", "snippet", "url", "source"],
            },
          },
        },
      });

      const results = JSON.parse(response.text || "[]");
      setNews(results);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCategory === "live") {
      setNews([]);
      setLoading(false);
      return;
    }

    if (selectedCategory === "bookmarks") {
      if (!user) {
        setNews([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const bookmarksRef = collection(db, `users/${user.uid}/bookmarks`);
      const unsubscribe = onSnapshot(bookmarksRef, (snapshot) => {
        const bookmarkedNews = snapshot.docs.map(doc => doc.data() as NewsItem);
        setNews(bookmarkedNews);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/bookmarks`);
      });
      
      return () => unsubscribe();
    }

    const category = CATEGORIES.find(c => c.id === selectedCategory);
    fetchNews("", category?.name || "Top Stories");
  }, [selectedCategory, fetchNews, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchNews(`Search for latest news about: ${searchQuery}`, searchQuery);
    }
  };

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setBookmarkedIds(new Set());
      return;
    }

    const bookmarksRef = collection(db, `users/${user.uid}/bookmarks`);
    const unsubscribe = onSnapshot(bookmarksRef, (snapshot) => {
      const ids = new Set(snapshot.docs.map(doc => doc.id as string));
      setBookmarkedIds(ids);
    });

    return () => unsubscribe();
  }, [user]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [activeShareId, setActiveShareId] = useState<string | null>(null);

  const handleShare = (e: React.MouseEvent, article: NewsItem) => {
    e.stopPropagation();
    if (activeShareId === article.url) {
      setActiveShareId(null);
    } else {
      setActiveShareId(article.url);
    }
  };

  const shareToSocial = (platform: string, article: NewsItem) => {
    const url = encodeURIComponent(article.url);
    const title = encodeURIComponent(article.title);
    let shareUrl = "";

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${title}&body=${url}`;
        break;
    }

    if (shareUrl) window.open(shareUrl, "_blank");
    setActiveShareId(null);
  };

  const copyToClipboard = async (article: NewsItem) => {
    try {
      await navigator.clipboard.writeText(article.url);
      setCopiedId(article.url);
      setTimeout(() => setCopiedId(null), 2000);
      setActiveShareId(null);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const toggleBookmark = async (e: React.MouseEvent, article: NewsItem) => {
    e.stopPropagation();
    if (!user) {
      handleLogin();
      return;
    }

    const articleId = btoa(article.url).replace(/[/+=]/g, "");
    const bookmarkRef = doc(db, `users/${user.uid}/bookmarks`, articleId);

    try {
      const bookmarkSnap = await getDoc(bookmarkRef);
      if (bookmarkSnap.exists()) {
        // Remove bookmark
        // Note: For simplicity in this demo, we'll just allow adding. 
        // But let's implement delete for completeness.
        await deleteDoc(bookmarkRef);
      } else {
        // Add bookmark
        await setDoc(bookmarkRef, {
          ...article,
          uid: user.uid,
          articleId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/bookmarks/${articleId}`);
    }
  };

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300",
      isDarkMode ? "bg-[#0F1115] text-gray-100" : "bg-[#F8F9FA] text-[#1A1A1A]"
    )}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 w-full border-b px-4 md:px-8 py-3 flex items-center justify-between shadow-sm transition-colors duration-300",
        isDarkMode ? "bg-[#16191F] border-gray-800" : "bg-white border-gray-100"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className={cn(
              "p-2 rounded-full md:hidden transition-colors duration-300",
              isDarkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-50 text-gray-600"
            )}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-auto">
              <OStvLogo className="h-full" isDarkMode={isDarkMode} />
            </div>
            <h1 className="text-xl font-black tracking-tighter hidden sm:block text-[#ED1C24] uppercase">OStv news</h1>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 relative group">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
            isDarkMode ? "text-gray-500 group-focus-within:text-[#ED1C24]" : "text-gray-400 group-focus-within:text-[#ED1C24]"
          )} />
          <input
            type="text"
            placeholder="Search news, topics, sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full border rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-[#ED1C24]/10 focus:bg-white focus:border-[#ED1C24]/30 transition-all outline-none text-sm placeholder:text-gray-400",
              isDarkMode 
                ? "bg-gray-800/50 border-gray-700 text-gray-100 focus:bg-gray-800" 
                : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white"
            )}
          />
        </form>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedCategory("live")}
            className="hidden lg:flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-black animate-pulse shadow-lg shadow-red-600/20 hover:scale-105 transition-transform"
          >
            <Radio className="w-3 h-3" />
            LIVE TV
          </button>
          <div className={cn(
            "hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors duration-300",
            isDarkMode ? "text-gray-400 bg-gray-800/50 border-gray-700" : "text-gray-600 bg-gray-50 border-gray-100"
          )}>
            <Clock className="w-3 h-3" />
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "p-2 rounded-full transition-all duration-300 border",
              isDarkMode 
                ? "bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700" 
                : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
            )}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {isAuthLoading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-[#ED1C24] transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <div className="relative group">
                <img 
                  src={user.photoURL || ""} 
                  alt={user.displayName || ""} 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-3 py-2 border-b border-gray-50 mb-2">
                    <p className="text-xs font-bold text-gray-900 truncate">{user.displayName}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <UserIcon className="w-3.5 h-3.5" />
                    Profile Settings
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogin}
                className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              >
                SIGN IN
              </button>
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-black transition-all shadow-lg shadow-black/10"
              >
                <UserIcon className="w-3.5 h-3.5" />
                SIGN UP
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar Navigation */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:z-0",
          isDarkMode ? "bg-[#16191F] border-gray-800" : "bg-white border-gray-200",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8 md:hidden">
              <OStvLogo className="h-10" isDarkMode={isDarkMode} />
              <button onClick={() => setIsSidebarOpen(false)} className={cn("p-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-3">Categories</p>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    selectedCategory === cat.id 
                      ? (isDarkMode ? "bg-[#ED1C24]/10 text-[#ED1C24]" : "bg-[#ED1C24]/5 text-[#ED1C24]")
                      : (isDarkMode ? "text-gray-400 hover:bg-gray-800 hover:text-gray-100" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
                  )}
                >
                  <span className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    selectedCategory === cat.id 
                      ? (isDarkMode ? "bg-[#ED1C24]/20" : "bg-[#ED1C24]/10") 
                      : (isDarkMode ? "bg-gray-800" : "bg-gray-100")
                  )}>
                    {cat.icon}
                  </span>
                  {cat.name}
                  {cat.id === "live" && (
                    <span className="ml-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                  )}
                  {selectedCategory === cat.id && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ED1C24]"
                    />
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
              {!user && !isAuthLoading && (
                <div className={cn(
                  "rounded-2xl p-4 mb-4 border transition-colors duration-300",
                  isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                )}>
                  <p className={cn("text-xs font-bold mb-1 uppercase tracking-tight", isDarkMode ? "text-gray-100" : "text-gray-900")}>Join OStv</p>
                  <p className="text-[10px] text-gray-500 mb-3 leading-tight">Create an account to save stories and get AI insights.</p>
                  <button 
                    onClick={handleLogin}
                    className={cn(
                      "w-full text-[10px] font-bold px-3 py-2 rounded-lg transition-colors",
                      isDarkMode ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-900 text-white hover:bg-black"
                    )}
                  >
                    SIGN UP FREE
                  </button>
                </div>
              )}
              <div className="bg-gradient-to-br from-[#ED1C24] to-[#B3151B] rounded-2xl p-4 text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-80 mb-1">OStv Premium</p>
                  <p className="text-sm font-bold mb-3 leading-tight">Get deeper AI insights on every story.</p>
                  <button className="bg-[#E5C06D] text-[#ED1C24] text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
                    UPGRADE NOW
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 min-h-screen">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className={cn("text-2xl font-bold tracking-tight", isDarkMode ? "text-gray-100" : "text-gray-900")}>
                {CATEGORIES.find(c => c.id === selectedCategory)?.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <div className={cn(
              "flex items-center gap-2 border rounded-lg p-1 shadow-sm transition-colors duration-300",
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            )}>
              <button className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                isDarkMode ? "bg-gray-700 text-gray-100" : "bg-gray-100 text-gray-900"
              )}>Featured</button>
              <button className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                isDarkMode ? "text-gray-400 hover:text-gray-100" : "text-gray-500 hover:text-gray-900"
              )}>Latest</button>
            </div>
          </div>

          {selectedCategory === "live" ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className={cn(
                "relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4",
                isDarkMode ? "border-gray-800" : "border-white"
              )}>
                <iframe 
                  width="100%" 
                  height="100%" 
                  src="https://www.youtube.com/embed/w_Ma8oQLmSM?autoplay=1&mute=0" 
                  title="OStv Live Stream" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                  className="absolute inset-0"
                ></iframe>
                
                <div className="absolute top-6 left-6 flex items-center gap-3">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-2 animate-pulse shadow-lg shadow-red-600/40">
                    <Radio className="w-3 h-3" />
                    LIVE NOW
                  </div>
                  <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                    2.4k Watching
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={cn(
                  "md:col-span-2 rounded-3xl p-8 border shadow-sm transition-colors duration-300",
                  isDarkMode ? "bg-[#16191F] border-gray-800" : "bg-white border-gray-100"
                )}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-auto">
                      <OStvLogo className="h-full" isDarkMode={isDarkMode} />
                    </div>
                    <div>
                      <h3 className={cn("text-xl font-black uppercase", isDarkMode ? "text-gray-100" : "text-gray-900")}>OStv Global News Live</h3>
                      <p className="text-sm text-gray-500">Broadcasting worldwide 24/7</p>
                    </div>
                  </div>
                  <p className={cn("leading-relaxed", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Welcome to the OStv live broadcast. Stay tuned for breaking news, in-depth analysis, and exclusive interviews from around the globe. Our AI-enhanced broadcast provides real-time fact-checking and context for every major story.
                  </p>
                  
                  <div className="mt-8 flex items-center gap-4">
                    <button className="flex items-center gap-2 bg-[#ED1C24] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#B3151B] transition-all shadow-lg shadow-[#ED1C24]/20">
                      <Play className="w-4 h-4 fill-current" />
                      Resume Stream
                    </button>
                    <button className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all",
                      isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}>
                      Share Stream
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "rounded-3xl p-6 border shadow-sm flex flex-col transition-colors duration-300",
                  isDarkMode ? "bg-[#16191F] border-gray-800" : "bg-white border-gray-100"
                )}>
                  <h4 className={cn("font-bold mb-4 flex items-center gap-2", isDarkMode ? "text-gray-100" : "text-gray-900")}>
                    <Radio className="w-4 h-4 text-[#ED1C24]" />
                    Up Next
                  </h4>
                  <div className="space-y-4">
                    {[
                      { time: "10:00 AM", title: "Global Market Update", host: "Sarah Jenkins" },
                      { time: "11:30 AM", title: "Tech Frontiers", host: "David Chen" },
                      { time: "01:00 PM", title: "The World Today", host: "OStv News Team" }
                    ].map((show, i) => (
                      <div key={i} className={cn(
                        "group cursor-pointer p-3 rounded-2xl transition-colors border border-transparent",
                        isDarkMode ? "hover:bg-gray-800 hover:border-gray-700" : "hover:bg-gray-50 hover:border-gray-100"
                      )}>
                        <p className="text-[10px] font-bold text-[#ED1C24] mb-1">{show.time}</p>
                        <p className={cn(
                          "text-sm font-bold group-hover:text-[#ED1C24] transition-colors",
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        )}>{show.title}</p>
                        <p className="text-xs text-gray-500">with {show.host}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : selectedCategory === "bookmarks" && !user ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors duration-300",
                isDarkMode ? "bg-gray-800" : "bg-gray-100"
              )}>
                <Bookmark className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className={cn("text-xl font-black uppercase mb-2", isDarkMode ? "text-gray-100" : "text-gray-900")}>Your Bookmarks</h3>
              <p className="text-gray-500 max-w-xs mb-8 leading-relaxed">
                Sign in or sign up to save your favorite stories and access them from any device.
              </p>
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-[#ED1C24] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#B3151B] transition-all shadow-lg shadow-[#ED1C24]/20"
              >
                <LogIn className="w-4 h-4" />
                SIGN IN / SIGN UP
              </button>
            </motion.div>
          ) : selectedCategory === "bookmarks" && user && news.length === 0 && !loading ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors duration-300",
                isDarkMode ? "bg-gray-800" : "bg-gray-100"
              )}>
                <Bookmark className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className={cn("text-xl font-black uppercase mb-2", isDarkMode ? "text-gray-100" : "text-gray-900")}>No Bookmarks Yet</h3>
              <p className="text-gray-500 max-w-xs mb-8 leading-relaxed">
                Start exploring and bookmark articles to read them later.
              </p>
              <button 
                onClick={() => setSelectedCategory("top")}
                className={cn(
                  "flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all",
                  isDarkMode ? "bg-gray-100 text-gray-900 hover:bg-white" : "bg-gray-900 text-white hover:bg-black"
                )}
              >
                EXPLORE NEWS
              </button>
            </motion.div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={cn(
                  "rounded-2xl p-4 border animate-pulse transition-colors duration-300",
                  isDarkMode ? "bg-[#16191F] border-gray-800" : "bg-white border-gray-200"
                )}>
                  <div className={cn("w-full aspect-video rounded-xl mb-4", isDarkMode ? "bg-gray-800" : "bg-gray-100")} />
                  <div className={cn("h-4 rounded w-3/4 mb-2", isDarkMode ? "bg-gray-800" : "bg-gray-100")} />
                  <div className={cn("h-4 rounded w-1/2 mb-4", isDarkMode ? "bg-gray-800" : "bg-gray-100")} />
                  <div className="space-y-2">
                    <div className={cn("h-3 rounded w-full", isDarkMode ? "bg-gray-800/50" : "bg-gray-50")} />
                    <div className={cn("h-3 rounded w-full", isDarkMode ? "bg-gray-800/50" : "bg-gray-50")} />
                    <div className={cn("h-3 rounded w-2/3", isDarkMode ? "bg-gray-800/50" : "bg-gray-50")} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((item, index) => (
                <motion.article
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleArticleClick(item)}
                  className={cn(
                    "group rounded-2xl border overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col",
                    isDarkMode 
                      ? "bg-[#16191F] border-gray-800 hover:shadow-black/20 hover:border-[#ED1C24]/30" 
                      : "bg-white border-gray-200 hover:shadow-blue-500/5 hover:border-[#ED1C24]/20"
                  )}
                >
                  <div className={cn(
                    "relative aspect-[16/10] overflow-hidden",
                    isDarkMode ? "bg-gray-800" : "bg-gray-100"
                  )}>
                    <img 
                      src={`https://picsum.photos/seed/${encodeURIComponent(item.title)}/800/500`}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#ED1C24] text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                        {item.category || selectedCategory}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => toggleBookmark(e, item)}
                      className={cn(
                        "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all",
                        bookmarkedIds.has(btoa(item.url).replace(/[/+=]/g, ""))
                          ? "bg-[#ED1C24] text-white"
                          : "bg-white/20 text-white hover:bg-white/40"
                      )}
                    >
                      <Bookmark className={cn("w-4 h-4", bookmarkedIds.has(btoa(item.url).replace(/[/+=]/g, "")) && "fill-current")} />
                    </button>
                    <button 
                      onClick={(e) => handleShare(e, item)}
                      className="absolute top-14 right-3 p-2 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/40 transition-all"
                      title="Share article"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {activeShareId === item.url && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          className={cn(
                            "absolute top-24 right-3 z-30 rounded-2xl shadow-2xl border p-2 min-w-[160px]",
                            isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            onClick={() => shareToSocial("twitter", item)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                              isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />
                            Twitter
                          </button>
                          <button 
                            onClick={() => shareToSocial("facebook", item)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                              isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                            Facebook
                          </button>
                          <button 
                            onClick={() => shareToSocial("linkedin", item)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                              isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                            LinkedIn
                          </button>
                          <button 
                            onClick={() => shareToSocial("email", item)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                              isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            Email
                          </button>
                          <div className={cn("h-px my-1", isDarkMode ? "bg-gray-800" : "bg-gray-50")} />
                          <button 
                            onClick={() => copyToClipboard(item)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                              isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            {copiedId === item.url ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                            )}
                            {copiedId === item.url ? "Copied!" : "Copy Link"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded bg-[#E5C06D]/20 flex items-center justify-center text-[10px] font-bold text-[#ED1C24]">
                        {item.source[0]}
                      </div>
                      <span className="text-xs font-semibold text-gray-500">{item.source}</span>
                    </div>
                    
                    <h3 className={cn(
                      "text-lg font-bold leading-tight transition-colors mb-3",
                      isDarkMode ? "text-gray-100 group-hover:text-[#ED1C24]" : "text-gray-900 group-hover:text-[#ED1C24]"
                    )}>
                      {item.title}
                    </h3>
                    
                    <p className={cn(
                      "text-sm line-clamp-3 mb-4 leading-relaxed",
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    )}>
                      {item.snippet}
                    </p>
                    
                    <div className={cn(
                      "mt-auto pt-4 border-t flex items-center justify-between",
                      isDarkMode ? "border-gray-800" : "border-gray-50"
                    )}>
                      <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Just now
                      </span>
                      <div className={cn(
                        "p-2 rounded-full transition-colors",
                        isDarkMode ? "bg-gray-800 group-hover:bg-[#ED1C24]/20 group-hover:text-[#ED1C24]" : "bg-gray-50 group-hover:bg-[#ED1C24]/10 group-hover:text-[#ED1C24]"
                      )}>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col",
                isDarkMode ? "bg-[#16191F]" : "bg-white"
              )}
            >
              <div className="relative h-64 md:h-80 overflow-hidden">
                <img 
                  src={`https://picsum.photos/seed/${encodeURIComponent(selectedArticle.title)}/1200/800`}
                  alt={selectedArticle.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => handleShare(e, selectedArticle)}
                  className="absolute top-4 right-16 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
                  title="Share article"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {activeShareId === selectedArticle.url && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className={cn(
                        "absolute top-16 right-16 z-30 rounded-2xl shadow-2xl border p-2 min-w-[160px]",
                        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
                      )}
                    >
                      <button 
                        onClick={() => shareToSocial("twitter", selectedArticle)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                          isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />
                        Twitter
                      </button>
                      <button 
                        onClick={() => shareToSocial("facebook", selectedArticle)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                          isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                        Facebook
                      </button>
                      <button 
                        onClick={() => shareToSocial("linkedin", selectedArticle)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                          isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                        LinkedIn
                      </button>
                      <button 
                        onClick={() => shareToSocial("email", selectedArticle)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                          isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        Email
                      </button>
                      <div className={cn("h-px my-1", isDarkMode ? "bg-gray-800" : "bg-gray-50")} />
                      <button 
                        onClick={() => copyToClipboard(selectedArticle)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                          isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {copiedId === selectedArticle.url ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        {copiedId === selectedArticle.url ? "Copied!" : "Copy Link"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-[#ED1C24] text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                      {selectedArticle.category || "General"}
                    </span>
                    <span className="text-white/80 text-xs font-medium">{selectedArticle.source}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    {selectedArticle.title}
                  </h2>
                </div>
              </div>

              <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className={cn(
                  "prose max-w-none",
                  isDarkMode ? "prose-invert prose-red" : "prose-red"
                )}>
                  <p className={cn(
                    "text-lg leading-relaxed mb-6 font-medium",
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  )}>
                    {selectedArticle.snippet}
                  </p>
                  
                  <div className={cn(
                    "border-l-4 p-4 rounded-r-xl mb-8",
                    isDarkMode ? "bg-[#ED1C24]/10 border-[#ED1C24]" : "bg-[#ED1C24]/5 border-[#ED1C24]"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {isSummarizing ? (
                        <Loader2 className="w-4 h-4 text-[#ED1C24] animate-spin" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-[#ED1C24]" />
                      )}
                      <span className="text-xs font-bold text-[#ED1C24] uppercase tracking-wider">OStv Insight</span>
                    </div>
                    {isSummarizing ? (
                      <div className="space-y-2">
                        <div className={cn("h-3 rounded w-full animate-pulse", isDarkMode ? "bg-[#ED1C24]/20" : "bg-[#ED1C24]/10")} />
                        <div className={cn("h-3 rounded w-full animate-pulse", isDarkMode ? "bg-[#ED1C24]/20" : "bg-[#ED1C24]/10")} />
                        <div className={cn("h-3 rounded w-2/3 animate-pulse", isDarkMode ? "bg-[#ED1C24]/20" : "bg-[#ED1C24]/10")} />
                      </div>
                    ) : (
                      <div className={cn(
                        "text-sm leading-relaxed",
                        isDarkMode ? "text-red-200" : "text-red-950"
                      )}>
                        <ReactMarkdown>{articleSummary}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "mt-10 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4",
                  isDarkMode ? "border-gray-800" : "border-gray-100"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isDarkMode ? "bg-gray-800" : "bg-gray-100"
                    )}>
                      <Globe className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className={cn("text-xs font-bold", isDarkMode ? "text-gray-100" : "text-gray-900")}>Original Source</p>
                      <p className="text-[10px] text-gray-500">{selectedArticle.source}</p>
                    </div>
                  </div>
                  
                  <a 
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#ED1C24] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#B3151B] transition-all shadow-lg shadow-[#ED1C24]/20"
                  >
                    Read Full Article
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Related Articles Section */}
                {getRelatedArticles(selectedArticle).length > 0 && (
                  <div className={cn(
                    "mt-12 pt-10 border-t",
                    isDarkMode ? "border-gray-800" : "border-gray-100"
                  )}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className={cn("text-lg font-black uppercase tracking-tight", isDarkMode ? "text-gray-100" : "text-gray-900")}>
                        Related Stories
                      </h3>
                      <div className="h-1 w-12 bg-[#ED1C24] rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {getRelatedArticles(selectedArticle).map((related, idx) => (
                        <div 
                          key={idx}
                          onClick={() => handleArticleClick(related)}
                          className={cn(
                            "group cursor-pointer rounded-xl overflow-hidden border transition-all",
                            isDarkMode ? "bg-gray-800/30 border-gray-700 hover:border-[#ED1C24]/50" : "bg-gray-50 border-gray-100 hover:border-[#ED1C24]/30"
                          )}
                        >
                          <div className="aspect-video overflow-hidden">
                            <img 
                              src={`https://picsum.photos/seed/${encodeURIComponent(related.title)}/400/250`}
                              alt={related.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <div className="p-3">
                            <p className="text-[10px] font-bold text-[#ED1C24] uppercase mb-1">{related.source}</p>
                            <h4 className={cn(
                              "text-xs font-bold line-clamp-2 leading-snug group-hover:text-[#ED1C24] transition-colors",
                              isDarkMode ? "text-gray-200" : "text-gray-800"
                            )}>
                              {related.title}
                            </h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Category Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-around md:hidden">
        {CATEGORIES.slice(0, 4).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 transition-colors",
              selectedCategory === cat.id ? "text-blue-600" : "text-gray-400"
            )}
          >
            {cat.icon}
            <span className="text-[10px] font-medium">{cat.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
