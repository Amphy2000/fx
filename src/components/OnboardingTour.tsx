import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X, Sparkles, Brain, Zap, BookOpen, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Step {
    title: string;
    description: string;
    targetId?: string;
    icon: React.ReactNode;
}

const steps: Step[] = [
    {
        title: "Welcome to Amphy AI!",
        description: "Your personal AI Trading Companion is ready. Let's master your trading psychology together.",
        icon: <Sparkles className="w-12 h-12 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />,
    },
    {
        title: "Trading Dashboard",
        description: "Your command center. Track win rates, profit factors, and emotional performance in real-time.",
        targetId: "tour-dashboard",
        icon: <BarChart3 className="w-12 h-12 text-blue-500" />,
    },
    {
        title: "Trade Calendar",
        description: "Review your journey. Identify which days your mind is sharpest and your trades are cleanest.",
        targetId: "tour-trade-calendar",
        icon: <Calendar className="w-12 h-12 text-green-500" />,
    },
    {
        title: "AI Daily Journal",
        description: "Record your trades via voice or text. Our AI analyzes your setup quality and psychological triggers.",
        targetId: "tour-ai-journal",
        icon: <Brain className="w-12 h-12 text-purple-500" />,
    },
    {
        title: "AI Setup Analyzer",
        description: "Upload charts before you enter. AI scans for SMS criteria to give you a clinical probability score.",
        targetId: "tour-ai-setup-analyzer",
        icon: <Zap className="w-12 h-12 text-yellow-500" />,
    },
    {
        title: "Exclusive SMS Course",
        description: "Unlock the Execution Mastery playbook. Learn the exact logic our AI uses to grade your trades.",
        targetId: "tour-sms-course",
        icon: <BookOpen className="w-12 h-12 text-amber-500" />,
    },
    {
        title: "Ready to Dominate?",
        description: "The more you journal, the smarter your AI becomes. Log your first trade and let AI handle the heavy lifting!",
        icon: <Sparkles className="w-12 h-12 text-yellow-400 animate-pulse" />,
    }
];

export const OnboardingTour = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const { setOpen } = useSidebar();
    const location = useLocation();
    const navigate = useNavigate();

    // 1. Trigger Login/Start Logic
    useEffect(() => {
        const checkStatus = async () => {
            const hasSeenLocal = localStorage.getItem('amphy_onboarding_completed');
            const searchParams = new URLSearchParams(location.search);
            const forceStart = searchParams.get('startTour') === 'true';

            if (forceStart) {
                navigate(location.pathname, { replace: true });
                setIsVisible(true);
                setCurrentStep(0);
                return;
            }

            if (hasSeenLocal === 'true') return;

            // Verify with DB as fallback
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_completed')
                    .eq('id', user.id)
                    .single();

                if (profile && !profile.onboarding_completed) {
                    setTimeout(() => setIsVisible(true), 2000);
                }
            } else if (!hasSeenLocal) {
                setTimeout(() => setIsVisible(true), 2000);
            }
        };
        checkStatus();
    }, [location.pathname, location.search, navigate]);

    const updateTargetRect = useCallback(() => {
        if (!isVisible) return;
        const targetId = steps[currentStep].targetId;
        if (!targetId) {
            setTargetRect(null);
            return;
        }

        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setTargetRect(rect);
            }
        }
    }, [currentStep, isVisible]);

    useEffect(() => {
        if (isVisible) {
            const targetId = steps[currentStep].targetId;
            if (targetId && (targetId.startsWith('tour-') || targetId.includes('course'))) {
                setOpen(true);
            }
            const timer = setTimeout(updateTargetRect, 600);
            window.addEventListener('resize', updateTargetRect);
            window.addEventListener('scroll', updateTargetRect, true);
            const poll = setInterval(updateTargetRect, 1000);
            return () => {
                clearTimeout(timer);
                clearInterval(poll);
                window.removeEventListener('resize', updateTargetRect);
                window.removeEventListener('scroll', updateTargetRect, true);
            };
        }
    }, [currentStep, isVisible, setOpen, updateTargetRect]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(curr => curr + 1);
        } else {
            completeTour();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(curr => curr - 1);
    };

    const completeTour = async () => {
        setIsVisible(false);
        localStorage.setItem('amphy_onboarding_completed', 'true');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
        }
    };

    if (!isVisible) return null;

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[999999] pointer-events-none">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto" onClick={completeTour} />

            {targetRect && (
                <motion.div
                    className="absolute z-[1000000] border-2 border-yellow-500 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5),0_0_40px_rgba(234,179,8,0.4)]"
                    initial={false}
                    animate={{
                        top: targetRect.top - 12,
                        left: targetRect.left - 12,
                        width: targetRect.width + 24,
                        height: targetRect.height + 24,
                    }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className={`fixed pointer-events-auto z-[1000001] w-[92%] max-w-sm bg-[#0C0C0C]/95 border border-white/10 rounded-3xl shadow-2xl p-8 backdrop-blur-xl
            ${targetRect
                            ? (targetRect.left < window.innerWidth / 2 ? 'left-[300px]' : 'right-[40px]')
                            : 'left-1/2 -translate-x-1/2'
                        }
            ${targetRect
                            ? (targetRect.top < window.innerHeight / 2 ? 'top-[120px]' : 'bottom-[120px]')
                            : 'top-1/2 -translate-y-1/2'
                        }`}
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl pointer-events-none" />

                    <button onClick={completeTour} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex justify-center mb-8">{step.icon}</div>

                    <h3 className="text-3xl font-bold text-center mb-4 text-white tracking-tight">
                        {step.title}
                    </h3>
                    <p className="text-white/60 text-center text-lg leading-relaxed mb-10 font-light">
                        {step.description}
                    </p>

                    <div className="flex items-center justify-between gap-6">
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-yellow-500' : 'w-1.5 bg-white/10'}`} />
                            ))}
                        </div>

                        <div className="flex gap-3">
                            {currentStep > 0 && (
                                <Button variant="ghost" size="sm" onClick={handleBack} className="text-white/40 hover:text-white hover:bg-white/5 font-medium">
                                    Back
                                </Button>
                            )}
                            <Button onClick={handleNext} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-8 h-12 rounded-2xl shadow-[0_10px_20px_-5px_rgba(234,179,8,0.3)] transition-all active:scale-95">
                                {currentStep === steps.length - 1 ? "LET'S GO!" : "NEXT"}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
