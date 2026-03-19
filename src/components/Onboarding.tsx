import { useState } from 'react';
import { Target, Brain, Zap, Shield, ArrowRight, Check } from 'lucide-react';
import { updateSettings } from '@/lib/db';

interface OnboardingProps {
    onComplete: () => void;
}

const steps = [
    {
        icon: Target,
        gradient: 'from-indigo-500 to-purple-600',
        title: 'Welcome to AyaMir',
        subtitle: 'Protect your time, build your legacy.',
        description: 'A smart task manager that blocks distractions, tracks your focus, and rewards your productivity.',
        features: [
            { icon: '✅', text: 'Smart task management with priorities' },
            { icon: '🧠', text: 'Deep Work sessions with site blocking' },
            { icon: '🏆', text: 'XP, levels, and achievements' },
        ]
    },
    {
        icon: Brain,
        gradient: 'from-blue-500 to-indigo-600',
        title: 'Deep Work Mode',
        subtitle: 'Enter the flow state.',
        description: 'Start a timed focus session. Distracting sites get blocked. A typing challenge is the only way through.',
        features: [
            { icon: '⏱️', text: 'Customizable work/break intervals' },
            { icon: '🔒', text: 'Hard lock mode — no escape until done' },
            { icon: '🎵', text: 'Ambient sounds to stay in the zone' },
        ]
    },
    {
        icon: Zap,
        gradient: 'from-purple-500 to-pink-600',
        title: 'Quick Command Palette',
        subtitle: 'Add tasks from anywhere.',
        description: 'Press Ctrl+Shift+Space on any page to add a task instantly. No need to open the popup.',
        features: [
            { icon: '⌨️', text: 'Ctrl+Shift+E to open AyaMir' },
            { icon: '⚡', text: 'Ctrl+Shift+Space for quick task' },
            { icon: '🎯', text: 'Press ? inside popup for all shortcuts' },
        ]
    },
    {
        icon: Shield,
        gradient: 'from-green-500 to-emerald-600',
        title: '100% Private',
        subtitle: 'Your data never leaves your browser.',
        description: 'No accounts, no servers, no tracking. Everything stays on your device. Unlike other extensions, we never see your data.',
        features: [
            { icon: '🔒', text: 'All data stored locally in your browser' },
            { icon: '🚫', text: 'Zero network requests — works offline' },
            { icon: '👁️', text: 'Enable in Incognito for full site blocking' },
        ]
    },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const current = steps[step];
    const Icon = current.icon;

    const handleNext = async () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            await updateSettings({ onboardingCompleted: true });
            onComplete();
        }
    };

    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col z-50 animate-fade-in">
            {/* Progress dots */}
            <div className="flex justify-center gap-2 pt-6 pb-2">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === step ? 'w-8 bg-indigo-500' : i < step ? 'w-1.5 bg-indigo-300' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                        }`}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${current.gradient} flex items-center justify-center mb-6 shadow-lg animate-bounce-in`}>
                    <Icon className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{current.title}</h2>
                <p className="text-sm font-medium text-indigo-500 dark:text-indigo-400 mb-3">{current.subtitle}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">{current.description}</p>

                <div className="w-full space-y-3">
                    {current.features.map((feat, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-left animate-slide-up"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <span className="text-lg">{feat.icon}</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{feat.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom */}
            <div className="p-6 space-y-3">
                <button
                    onClick={handleNext}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                >
                    {step < steps.length - 1 ? (
                        <>Continue <ArrowRight className="w-4 h-4" /></>
                    ) : (
                        <>Get Started <Check className="w-4 h-4" /></>
                    )}
                </button>

                {step < steps.length - 1 && (
                    <button
                        onClick={async () => {
                            await updateSettings({ onboardingCompleted: true });
                            onComplete();
                        }}
                        className="w-full py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        Skip onboarding
                    </button>
                )}
            </div>
        </div>
    );
}
