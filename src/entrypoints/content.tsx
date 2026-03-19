import { getSettings, Settings, db, Task } from '@/lib/db';
import { createRoot } from 'react-dom/client';
import { Target, Brain, CheckCircle, Clock, Plus, Zap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import '@/styles/global.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const settings = await getSettings();
    const currentHostname = window.location.hostname;
    const isSiteBlocked = settings.blacklist.some(domain => 
        currentHostname === domain || currentHostname.endsWith(`.${domain}`)
    );

    const needsNudge = !!(isSiteBlocked && (settings.focusEnabled || settings.isDeepWorkActive));
    const needsTicker = settings.isDeepWorkActive;

    let ui: any = null;

    const mountUi = async (showPaletteOnMount: boolean = false) => {
      if (ui) {
        window.dispatchEvent(new CustomEvent('ayamir-toggle-palette'));
        return;
      }

      ui = await createShadowRootUi(ctx, {
        name: 'ayamir-ui',
        position: 'inline',
        anchor: 'body',
        append: 'first',
        onMount: (container) => {
          const root = createRoot(container);
          root.render(<ContentUI settings={settings} needsNudge={needsNudge} needsTicker={needsTicker} initialPalette={showPaletteOnMount} />);
          return root;
        },
        onRemove: (root) => {
          root?.unmount();
        },
      });

      ui.mount();
    };

    if (needsNudge || needsTicker) {
      await mountUi();
    }

    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'toggleCommandPalette') {
        if (!ui) {
          mountUi(true);
        } else {
          window.dispatchEvent(new CustomEvent('ayamir-toggle-palette'));
        }
      }
    });
  },
});

function ContentUI({ settings, needsNudge, needsTicker, initialPalette }: { settings: Settings, needsNudge: boolean, needsTicker?: boolean, initialPalette?: boolean }) {
    const [showAnyway, setShowAnyway] = useState(false);
    const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const [challengeText, setChallengeText] = useState('');
    const [inputChallenge, setInputChallenge] = useState('');
    const [showChallenge, setShowChallenge] = useState(false);
    
    // Command Palette State
    const [showPalette, setShowPalette] = useState(initialPalette || false);
    const [taskTitle, setTaskTitle] = useState('');
    const [priority, setPriority] = useState<Task['priority']>('medium');
    const inputRef = useRef<HTMLInputElement>(null);

    const challengeQuotes = [
        chrome.i18n.getMessage("quote1"),
        chrome.i18n.getMessage("quote2"),
        chrome.i18n.getMessage("quote3")
    ];

    // Listen for Command Palette toggle
    useEffect(() => {
        const listener = () => {
            setShowPalette(prev => {
                const next = !prev;
                if (next) setTimeout(() => inputRef.current?.focus(), 100);
                return next;
            });
        };
        window.addEventListener('ayamir-toggle-palette', listener);
        return () => window.removeEventListener('ayamir-toggle-palette', listener);
    }, []);

    // Global Escape to close palette
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showPalette) {
                setShowPalette(false);
                setTaskTitle('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPalette]);

    useEffect(() => {
        if (!needsTicker || !settings.deepWorkEndTime) return;
        const updateTimer = () => {
            const now = Date.now();
            const end = settings.deepWorkEndTime!;
            if (now < end) {
                setRemainingTime(Math.floor((end - now) / 1000));
            } else {
                setRemainingTime(0);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [needsTicker, settings.deepWorkEndTime]);

    useEffect(() => {
        if ((needsNudge && !showAnyway && !showChallenge) || showPalette) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [needsNudge, showAnyway, showChallenge, showPalette]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleShowChallenge = () => {
        setChallengeText(challengeQuotes[Math.floor(Math.random() * challengeQuotes.length)]);
        setShowChallenge(true);
    };

    const handleChallengeSubmit = () => {
        if (inputChallenge === challengeText) {
            setShowAnyway(true);
            setShowChallenge(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;

        const newTask: Task = {
            title: taskTitle.trim(),
            startTime: null,
            isCompleted: false,
            createdAt: new Date(),
            priority
        };

        // Send task to background script for saving in the correct DB context
        chrome.runtime.sendMessage({ action: 'createTask', task: newTask }, (response) => {
            if (response && response.success) {
                setTaskTitle('');
                setPriority('medium');
                setShowPalette(false);
            } else {
                console.error('Failed to save task via background script', response?.error);
            }
        });
    };

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif' }}>
            
            {/* Command Palette Overlay */}
            {showPalette && (
                <div className="fixed inset-0 z-[2147483647] flex items-start justify-center pt-[20vh] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <form onSubmit={handleCreateTask} className="flex items-center gap-3 p-4 border-b border-slate-100">
                            <Zap className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={taskTitle}
                                onChange={e => setTaskTitle(e.target.value)}
                                placeholder={chrome.i18n.getMessage("quickTaskPlaceholder")}
                                className="flex-1 bg-transparent text-xl font-medium outline-none text-slate-800 placeholder:text-slate-300"
                                autoFocus
                            />
                            {taskTitle.trim() && (
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    {chrome.i18n.getMessage("enterSubmit")} ↵
                                </button>
                            )}
                        </form>
                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                            <div className="flex gap-2">
                                {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                            priority === p
                                                ? 'bg-slate-800 text-white shadow-sm'
                                                : 'text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs font-semibold text-slate-400">{chrome.i18n.getMessage("escToClose")}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Site Overlay */}
            {needsNudge && !showAnyway && !showPalette && (
                <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-gray-900/95 backdrop-blur-md">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center">
                            <div className={`p-4 rounded-full ${settings.isDeepWorkActive ? 'bg-indigo-100 text-indigo-600' : 'bg-primary-100 text-primary-600'}`}>
                                {settings.isDeepWorkActive ? <Brain className="w-12 h-12 animate-pulse" /> : <Target className="w-12 h-12" />}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900 m-0">
                                {settings.isDeepWorkActive ? chrome.i18n.getMessage('deepWorkActive') : chrome.i18n.getMessage('focusModeActive')}
                            </h1>
                            <p className="text-gray-500 m-0 text-base">
                                {settings.isDeepWorkActive 
                                    ? chrome.i18n.getMessage('deepWorkMessage')
                                    : chrome.i18n.getMessage('focusModeMessage')}
                            </p>
                        </div>

                        {!showChallenge ? (
                            <div className="flex flex-col gap-3 pt-4">
                                <button 
                                    onClick={() => chrome.runtime.sendMessage({ action: 'closeTab' })}
                                    className={`w-full py-3 px-4 text-white rounded-lg font-medium text-base transition-all border-0 cursor-pointer shadow-sm hover:shadow-md ${settings.isDeepWorkActive ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-primary-600 hover:bg-primary-700'}`}
                                >
                                    {chrome.i18n.getMessage('closeTabGetToWork')}
                                </button>
                                
                                <button 
                                    onClick={handleShowChallenge}
                                    className="w-full py-3 px-4 bg-transparent text-gray-500 hover:text-gray-800 font-medium text-sm transition-colors border-0 cursor-pointer underline-offset-4 hover:underline"
                                >
                                    {chrome.i18n.getMessage('continueAnyway')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 pt-2 text-left">
                                <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm font-medium leading-relaxed border border-red-100">
                                    {chrome.i18n.getMessage("typeToProceed")}
                                    <br/><br/>
                                    <span className="font-bold select-none">{challengeText}</span>
                                </div>
                                <textarea
                                    value={inputChallenge}
                                    onChange={(e) => setInputChallenge(e.target.value)}
                                    placeholder={chrome.i18n.getMessage("typeTextAbove")}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm resize-none"
                                    rows={3}
                                    onPaste={(e) => e.preventDefault()}
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowChallenge(false)}
                                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors border-0 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleChallengeSubmit}
                                        disabled={inputChallenge !== challengeText}
                                        className={`flex-1 py-2 rounded-lg font-medium transition-colors border-0 cursor-pointer ${inputChallenge === challengeText ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        Unlock Site
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Deep Work Ticker */}
            {needsTicker && remainingTime !== null && remainingTime > 0 && !showPalette && (
                <div className="fixed bottom-4 right-4 z-[2147483645] bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 border border-gray-700/50 backdrop-blur-xl group hover:scale-105 transition-transform cursor-default">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-none mb-1">{chrome.i18n.getMessage("deepWork")}</span>
                            <span className="text-xl font-bold font-mono leading-none tracking-tight">{formatTime(remainingTime)}</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-2xl overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                            style={{ width: `${(remainingTime / (settings.deepWorkModeDuration * 60)) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}