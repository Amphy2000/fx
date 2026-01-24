import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X, Sparkles, Brain, Zap, BookOpen, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        description: "I'm your AI Trading Companion. Let me show you how to master your trading workflow in 60 seconds.",
        icon: <Sparkles className="w-8 h-8 text-yellow-500" />,
    },
    {
        title: "The Trading Dashboard",
        description: "This is your control center. Track your win rate, profit factor, and daily progress at a glance.",
        targetId: "tour-dashboard",
        icon: <BarChart3 className="w-8 h-8 text-blue-500" />,
    },
    {
        title: "AI Daily Journal",
        description: "The heart of your growth. Use your voice or text to record trades. Our AI will automatically analyze your psychology and setup quality.",
        targetId: "tour-ai-journal",
        icon: <Brain className="w-8 h-8 text-purple-500" />,
    },
    {
        title: "AI Setup Analyzer",
        description: "Not sure about a trade? Upload your chart here. Our AI scans for SMS (Smart Money) criteria and gives you a probability score.",
        targetId: "tour-ai-setup-analyzer",
        icon: <Zap className="w-8 h-8 text-yellow-500" />,
    },
    {
        title: "Exclusive SMS Course",
        description: "Bundle owners get direct access to the Execution Mastery playbook. Learn the exact strategies the AI uses to grade your trades.",
        targetId: "tour-sms-course",
        icon: <BookOpen className="w-8 h-8 text-green-500" />,
    },
    {
        title: "You're All Set!",
        description: "The more you journal, the smarter your AI analysis becomes. Ready to take your first trade?",
        icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
    }
];

export const OnboardingTour = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('has_completed_onboarding')
                    .eq('id', user.id)
                    .single();

                if (profile && !profile.has_completed_onboarding) {
                    // Small delay to let page load
                    setTimeout(() => setIsVisible(true), 1500);
                }
            }
        };
        checkStatus();
    }, []);

    useEffect(() => {
        if (isVisible && steps[currentStep].targetId) {
            const element = document.getElementById(steps[currentStep].targetId!);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTargetRect(element.getBoundingClientRect());
                element.classList.add('tour-highlight');
            } else {
                setTargetRect(null);
            }
        } else {
            setTargetRect(null);
        }

        return () => {
            // Cleanup highlight
            document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        }
    }, [currentStep, isVisible]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(curr => curr + 1);
        } else {
            completeTour();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(curr => curr - 1);
        }
    };

    const completeTour = async () => {
        setIsVisible(false);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('profiles')
                .update({ has_completed_onboarding: true })
                .eq('id', user.id);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Dimmed Background Overlay with cutout */}
            <div className="absolute inset-0 bg-black/70 pointer-events-auto" />

            {/* Spotlight cutout effect */}
            {targetRect && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute border-[2px] border-yellow-500 rounded-lg shadow-[0_0_50px_rgba(234,179,8,0.5)] z-[10000]"
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                    }}
                />
            )}

            {/* Tour Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`absolute pointer-events-auto z-[10001] w-[90%] max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden
            ${targetRect ? 'md:top-1/2 md:-translate-y-1/2 md:right-10' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
                >
                    {/* Background Decorative Gradients */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

                    <div className="relative z-10">
                        <button
                            onClick={completeTour}
                            className="absolute -top-2 -right-2 p-2 text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6 flex justify-center">{steps[currentStep].icon}</div>

                        <h2 className="text-2xl font-bold text-white mb-3 text-center">
                            {steps[currentStep].title}
                        </h2>

                        <p className="text-gray-400 text-center text-lg leading-relaxed mb-8">
                            {steps[currentStep].description}
                        </p>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex gap-1">
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-4 bg-yellow-500' : 'w-1 bg-white/20'}`}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-2">
                                {currentStep > 0 && (
                                    <Button
                                        variant="ghost"
                                        onClick={handleBack}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Back
                                    </Button>
                                )}
                                <Button
                                    onClick={handleNext}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all"
                                >
                                    {currentStep === steps.length - 1 ? "Let's Go!" : "Next"}
                                    {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
        .tour-highlight {
          position: relative !important;
          z-index: 10001 !important;
          transition: all 0.3s ease-in-out;
        }
      `}} />
        </div>
    );
};
