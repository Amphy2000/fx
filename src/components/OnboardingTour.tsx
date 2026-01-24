import React, { useState, useEffect, useCallback, useRef } from "react";
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
        title: "Dashboard",
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
        title: "SMS Course",
        description: "Unlock the Execution Mastery playbook. Learn the exact logic our AI uses to grade your trades.",
        targetId: "tour-sms-course",
        icon: <BookOpen className="w-12 h-12 text-amber-500" />,
    },
    {
        title: "Ready to Start?",
        description: "The more you journal, the smarter your AI becomes. Log your first trade and let AI do the heavy lifting!",
        icon: <Sparkles className="w-12 h-12 text-yellow-500 animate-pulse" />,
    }
];

export const OnboardingTour = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const { setOpen } = useSidebar();
    const location = useLocation();
    const navigate = useNavigate();
    const cardRef = useRef<HTMLDivElement>(null);

    // 1. Initial Launch Logic (Delayed to ensure UI loads)
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

            // DB Fallback
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_completed')
                    .eq('id', session.user.id)
                    .single();

                if (profile && !profile.onboarding_completed) {
                    // Wait for other modals (like check-in) to potentially show up first
                    setTimeout(() => setIsVisible(true), 3000);
                }
            }
        };
        checkStatus();
    }, [location.pathname, location.search, navigate]);

    // 2. Position Engine
    const updateTargetRect = useCallback(() => {
        if (!isVisible) return;
        const currentStepData = steps[currentStep];

        if (!currentStepData.targetId) {
            setTargetRect(null);
            return;
        }

        const element = document.getElementById(currentStepData.targetId);
        if (element) {
            // Ensure it's in view
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setTargetRect(rect);
            }
        }
    }, [currentStep, isVisible]);

    // 3. Step & Sidebar Management
    useEffect(() => {
        if (isVisible) {
            const targetId = steps[currentStep].targetId;
            if (targetId && (targetId.startsWith('tour-') || targetId.includes('course'))) {
                setOpen(true);
            }

            const timer = setTimeout(updateTargetRect, 500);
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
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', session.user.id);
        }
    };

    if (!isVisible) return null;

    const step = steps[currentStep];

    // Calculate card position
    let cardStyle: React.CSSProperties = {};
    if (targetRect) {
        const isSidebar = step.targetId?.startsWith('tour-');
        if (isSidebar) {
            cardStyle = {
                left: Math.min(window.innerWidth - 420, 300),
                top: '50%',
                transform: 'translateY(-50%)'
            };
        } else {
            // Fallback for non-sidebar targets if we add them later
            cardStyle = {
                left: targetRect.left + (targetRect.width / 2),
                top: targetRect.top > window.innerHeight / 2 ? targetRect.top - 200 : targetRect.bottom + 20,
                transform: 'translateX(-50%)'
            };
        }
    } else {
        // Centered for Welcome/Finish
        cardStyle = {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
        };
    }

    return (
        <div className="fixed inset-0 z-[999999] pointer-events-none overflow-hidden">
            {/* Dimmed Background - REMOVED blur to fix "blurry features" issue */}
            <div className="absolute inset-0 bg-black/80 pointer-events-auto" onClick={completeTour} />

            {/* Sharp Spotlight hole */}
            {targetRect && (
                <motion.div
                    className="absolute z-[1000000] border-2 border-yellow-500 rounded-xl"
                    initial={false}
                    animate={{
                        top: targetRect.top - 10,
                        left: targetRect.left - 10,
                        width: targetRect.width + 20,
                        height: targetRect.height + 20,
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    style={{
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 40px rgba(234, 179, 8, 0.5)'
                    }}
                />
            )}

            {/* Tour Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    ref={cardRef}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed pointer-events-auto z-[1000001] w-[95%] max-w-[360px] bg-[#0A0A0A] border border-white/20 rounded-2xl shadow-3xl p-6 flex flex-col"
                    style={cardStyle}
                >
                    <button onClick={completeTour} className="absolute top-4 right-4 text-white/40 hover:text-white p-1 z-20">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative z-10">
                        <div className="flex justify-center mb-4">{step.icon}</div>

                        <h3 className="text-xl font-bold text-center mb-2 text-white">
                            {step.title}
                        </h3>

                        <p className="text-white/70 text-center text-sm leading-relaxed mb-6 font-medium">
                            {step.description}
                        </p>

                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex gap-1">
                                {steps.map((_, i) => (
                                    <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-4 bg-yellow-500' : 'w-1 bg-white/10'}`} />
                                ))}
                            </div>

                            <div className="flex gap-2">
                                {currentStep > 0 && (
                                    <Button variant="ghost" size="sm" onClick={handleBack} className="text-white/40 hover:text-white text-xs h-8">
                                        Back
                                    </Button>
                                )}
                                <Button onClick={handleNext} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-8 px-4 text-xs">
                                    {currentStep === steps.length - 1 ? "Finish" : "Next"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Glass effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none" />
                </motion.div>
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
        /* Force Sidebar Z-Index lower than tour but ensure it's visible */
        [data-sidebar="sidebar"] {
          z-index: 10000 !important;
        }
        /* Ensure highlight is crisp */
        .tour-highlight-active {
            outline: 2px solid #eab308;
            outline-offset: 4px;
            box-shadow: 0 0 20px rgba(234, 179, 8, 0.4);
        }
      `}} />
        </div>
    );
};
