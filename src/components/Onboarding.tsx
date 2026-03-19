import { useState } from 'react';
import { Target, Brain, Zap, Shield, ArrowRight, Check } from 'lucide-react';
import { updateSettings } from '@/lib/db';

interface OnboardingProps {
    onComplete: () => void;
}

const t = (key: string) => chrome.i18n.getMessage(key) || key;

const steps = [
    {
        icon: Target,
        gradient: 'from-indigo-500 to-purple-600',
        titleKey: 'onb1Title',
        subtitleKey: 'onb1Subtitle',
        descKey: 'onb1Desc',
        features: [
            { icon: '✅', key: 'onb1Feat1' },
            { icon: '🧠', key: 'onb1Feat2' },
            { icon: '🏆', key: 'onb1Feat3' },
        ]
    },
    {
        icon: Brain,
        gradient: 'from-blue-500 to-indigo-600',
        titleKey: 'onb2Title',
        subtitleKey: 'onb2Subtitle',
        descKey: 'onb2Desc',
        features: [
            { icon: '⏱️', key: 'onb2Feat1' },
            { icon: '🔒', key: 'onb2Feat2' },
            { icon: '🎵', key: 'onb2Feat3' },
        ]
    },
    {
        icon: Zap,
        gradient: 'from-purple-500 to-pink-600',
        titleKey: 'onb3Title',
        subtitleKey: 'onb3Subtitle',
        descKey: 'onb3Desc',
        features: [
            { icon: '⌨️', key: 'onb3Feat1' },
            { icon: '⚡', key: 'onb3Feat2' },
            { icon: '🖱️', key: 'onb3Feat3' },
        ]
    },
    {
        icon: Shield,
        gradient: 'from-green-500 to-emerald-600',
        titleKey: 'onb4Title',
        subtitleKey: 'onb4Subtitle',
        descKey: 'onb4Desc',
        features: [
            { icon: '🔒', key: 'onb4Feat1' },
            { icon: '🚫', key: 'onb4Feat2' },
            { icon: '👁️', key: 'onb4Feat3' },
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

    const handleSkip = async () => {
        await updateSettings({ onboardingCompleted: true });
        onComplete();
    };

    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col z-50 animate-fade-in">
            {/* Progress dots */}
            <div className="flex justify-center gap-2 pt-4 pb-1">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === step ? 'w-6 bg-indigo-500' : i < step ? 'w-1.5 bg-indigo-300' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                        }`}
                    />
                ))}
            </div>

            {/* Content — compact layout */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-0">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">{t(current.titleKey)}</h2>
                <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-2">{t(current.subtitleKey)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5 max-w-[280px]">{t(current.descKey)}</p>

                <div className="w-full space-y-2">
                    {current.features.map((feat, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 rounded-xl text-left"
                        >
                            <span className="text-base">{feat.icon}</span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t(feat.key)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom buttons — always visible */}
            <div className="p-4 pt-3 space-y-2 flex-shrink-0">
                <button
                    onClick={handleNext}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                >
                    {step < steps.length - 1 ? (
                        <>{t('onbContinue')} <ArrowRight className="w-4 h-4" /></>
                    ) : (
                        <>{t('onbGetStarted')} <Check className="w-4 h-4" /></>
                    )}
                </button>

                {step < steps.length - 1 && (
                    <button
                        onClick={handleSkip}
                        className="w-full py-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        {t('onbSkip')}
                    </button>
                )}
            </div>
        </div>
    );
}
