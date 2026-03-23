import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { updateSettings } from '@/lib/db';
import { t } from '@/lib/i18n';

interface DailyFocusProps {
    onClose: () => void;
}

export default function DailyFocus({ onClose }: DailyFocusProps) {
    const [goal, setGoal] = useState('');
    const [prompt] = useState(() => {
        const prompts = [t('dailyFocusPrompt1'), t('dailyFocusPrompt2'), t('dailyFocusPrompt3')];
        return prompts[Math.floor(Math.random() * prompts.length)];
    });
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 200);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goal.trim()) {
            onClose();
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        await updateSettings({
            dailyFocusGoal: goal.trim(),
            dailyFocusDate: today,
        });
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 flex flex-col z-50 animate-fade-in">
            <div className="flex justify-end p-4">
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                    aria-label="Close daily focus"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 animate-bounce-in">
                    <Sparkles className="w-8 h-8 text-yellow-300" />
                </div>

                <p className="text-white/70 text-sm font-medium mb-2">{t('dailyFocusLabel')}</p>
                <h2 className="text-xl font-bold text-white text-center mb-8 leading-snug">{prompt}</h2>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={goal}
                        onChange={e => setGoal(e.target.value)}
                        placeholder={t('dailyFocusPlaceholder')}
                        className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder:text-white/30 text-sm font-medium outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-all"
                    />
                    <button
                        type="submit"
                        className="w-full py-3.5 bg-white text-teal-700 rounded-2xl font-bold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        {goal.trim() ? (
                            <>{t('dailyFocusLockIn')} <ArrowRight className="w-4 h-4" /></>
                        ) : (
                            t('dailyFocusSkip')
                        )}
                    </button>
                </form>
            </div>

            <div className="p-6 text-center">
                <p className="text-white/30 text-xs">{t('dailyFocusHelper')}</p>
            </div>
        </div>
    );
}
