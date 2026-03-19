import { getSettings, Settings, db, Task } from '@/lib/db';
import { createRoot } from 'react-dom/client';
import { Target, Brain, Zap, Shield } from 'lucide-react';
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

    // Check scheduled blocking
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const isScheduledBlock = settings.scheduledBlocking?.enabled &&
        settings.scheduledBlocking.days.includes(currentDay) &&
        currentHour >= settings.scheduledBlocking.startHour &&
        currentHour < settings.scheduledBlocking.endHour;

    const shouldBlock = isSiteBlocked && (settings.focusEnabled || settings.isDeepWorkActive || isScheduledBlock);
    const needsNudge = !!shouldBlock;
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
            priority,
            url: window.location.href,
        };

        chrome.runtime.sendMessage({ action: 'createTask', task: newTask }, (response) => {
            if (response && response.success) {
                setTaskTitle('');
                setPriority('medium');
                setShowPalette(false);
            }
        });
    };

    const priorityConfig: Record<string, { color: string; label: string }> = {
        low: { color: 'bg-slate-400', label: 'Low' },
        medium: { color: 'bg-blue-500', label: 'Medium' },
        high: { color: 'bg-orange-500', label: 'High' },
        urgent: { color: 'bg-red-500', label: 'Urgent' },
    };

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif' }}>

            {/* Command Palette Overlay */}
            {showPalette && (
                <div
                    className="fixed inset-0 z-[2147483647] flex items-start justify-center pt-[20vh] bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => { setShowPalette(false); setTaskTitle(''); }}
                >
                    <div
                        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        style={{ animation: 'slideDown 0.2s ease-out' }}
                    >
                        <form onSubmit={handleCreateTask} className="flex items-center gap-3 p-4 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={taskTitle}
                                onChange={e => setTaskTitle(e.target.value)}
                                placeholder={chrome.i18n.getMessage("quickTaskPlaceholder")}
                                className="flex-1 bg-transparent text-lg font-medium outline-none text-slate-800 placeholder:text-slate-300"
                                autoFocus
                            />
                            {taskTitle.trim() && (
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                                >
                                    Save ↵
                                </button>
                            )}
                        </form>
                        <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                            <div className="flex gap-1.5">
                                {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                            priority === p
                                                ? 'bg-slate-800 text-white shadow-sm'
                                                : 'text-slate-400 hover:bg-slate-200'
                                        }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${priorityConfig[p].color}`} />
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400">{chrome.i18n.getMessage("escToClose")}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Site Overlay */}
            {needsNudge && !showAnyway && !showPalette && (
                <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
                    <div className="max-w-md w-full text-center space-y-8 p-8" style={{ animation: 'scaleIn 0.3s ease-out' }}>
                        {/* Icon */}
                        <div className="flex justify-center">
                            <div className={`p-5 rounded-3xl ${
                                settings.isDeepWorkActive
                                    ? 'bg-indigo-500/20 ring-2 ring-indigo-500/30'
                                    : 'bg-white/10 ring-2 ring-white/10'
                            }`}>
                                {settings.isDeepWorkActive
                                    ? <Brain className="w-14 h-14 text-indigo-400" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }} />
                                    : <Shield className="w-14 h-14 text-white/80" />
                                }
                            </div>
                        </div>

                        {/* Text */}
                        <div className="space-y-3">
                            <h1 className="text-3xl font-bold text-white m-0 tracking-tight">
                                {settings.isDeepWorkActive ? chrome.i18n.getMessage('deepWorkActive') : chrome.i18n.getMessage('focusModeActive')}
                            </h1>
                            <p className="text-white/50 m-0 text-base leading-relaxed max-w-sm mx-auto">
                                {settings.isDeepWorkActive
                                    ? chrome.i18n.getMessage('deepWorkMessage')
                                    : chrome.i18n.getMessage('focusModeMessage')}
                            </p>

                            {/* Timer if deep work active */}
                            {settings.isDeepWorkActive && remainingTime !== null && remainingTime > 0 && (
                                <div className="text-4xl font-bold text-indigo-400 tabular-nums tracking-tight pt-2" style={{ fontFamily: 'ui-monospace, monospace' }}>
                                    {formatTime(remainingTime)}
                                </div>
                            )}
                        </div>

                        {!showChallenge ? (
                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    onClick={() => chrome.runtime.sendMessage({ action: 'closeTab' })}
                                    className={`w-full py-4 px-4 text-white rounded-2xl font-semibold text-base transition-all border-0 cursor-pointer shadow-lg ${
                                        settings.isDeepWorkActive
                                            ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
                                            : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                                    }`}
                                >
                                    {chrome.i18n.getMessage('closeTabGetToWork')}
                                </button>

                                <button
                                    onClick={handleShowChallenge}
                                    className="w-full py-3 px-4 bg-transparent text-white/30 hover:text-white/60 font-medium text-sm transition-colors border-0 cursor-pointer"
                                >
                                    {chrome.i18n.getMessage('continueAnyway')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 pt-2 text-left">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl text-sm font-medium leading-relaxed">
                                    {chrome.i18n.getMessage("typeToProceed")}
                                    <br/><br/>
                                    <span className="font-bold select-none text-white/90">{challengeText}</span>
                                </div>
                                <textarea
                                    value={inputChallenge}
                                    onChange={(e) => setInputChallenge(e.target.value)}
                                    placeholder={chrome.i18n.getMessage("typeTextAbove")}
                                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-red-500/30 focus:border-red-500/30 outline-none text-sm text-white placeholder:text-white/20 resize-none backdrop-blur-sm"
                                    rows={3}
                                    onPaste={(e) => e.preventDefault()}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowChallenge(false)}
                                        className="flex-1 py-3 bg-white/5 text-white/60 rounded-2xl font-medium hover:bg-white/10 transition-colors border-0 cursor-pointer"
                                    >
                                        {chrome.i18n.getMessage('cancel')}
                                    </button>
                                    <button
                                        onClick={handleChallengeSubmit}
                                        disabled={inputChallenge !== challengeText}
                                        className={`flex-1 py-3 rounded-2xl font-medium transition-colors border-0 cursor-pointer ${
                                            inputChallenge === challengeText
                                                ? 'bg-red-600 text-white hover:bg-red-500'
                                                : 'bg-white/5 text-white/20 cursor-not-allowed'
                                        }`}
                                    >
                                        {chrome.i18n.getMessage('unlockSite')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Deep Work Ticker */}
            {needsTicker && remainingTime !== null && remainingTime > 0 && !showPalette && !needsNudge && (
                <div className="fixed bottom-5 right-5 z-[2147483645] bg-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-xl hover:scale-105 transition-transform cursor-default"
                     style={{ animation: 'slideUp 0.3s ease-out' }}>
                    <div className="flex items-center gap-2.5">
                        <Brain className="w-5 h-5 text-indigo-400" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{chrome.i18n.getMessage("deepWork")}</span>
                            <span className="text-xl font-bold leading-none tracking-tight tabular-nums" style={{ fontFamily: 'ui-monospace, monospace' }}>
                                {formatTime(remainingTime)}
                            </span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-b-2xl overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                            style={{ width: `${(remainingTime / (settings.deepWorkModeDuration * 60)) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
