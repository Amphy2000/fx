import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Gift, ArrowRight, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBundleAnalytics } from "@/hooks/useBundleAnalytics";

const BundleOffer = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isOwned, setIsOwned] = useState(false);
    const { trackButtonClick, trackPaymentInitiated } = useBundleAnalytics();

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_tier')
                    .eq('id', user.id)
                    .single();

                if (profile?.subscription_tier === 'lifetime') {
                    setIsOwned(true);
                }
            }
        };
        checkStatus();
    }, []);

    const handlePurchase = async () => {
        // Track button click
        trackButtonClick();

        if (isOwned) {
            navigate("/dashboard");
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.error("Please sign in or create an account to claim this bundle.");
            navigate("/auth?redirect=/bundle");
            return;
        }

        // Track payment initiated
        trackPaymentInitiated({ email: user.email });

        try {
            const { data, error } = await supabase.functions.invoke('initialize-payment', {
                body: {
                    planType: 'bundle',
                    email: user.email,
                }
            });

            if (error) {
                console.error('Edge Function invocation error:', error);
                let errorMessage = error.message || "Edge Function failed";

                // If it's a 400 error, try to extract the message from the response
                try {
                    const errorContext = error.context;
                    if (errorContext && typeof errorContext.json === 'function') {
                        const errorBody = await errorContext.json();
                        if (errorBody && errorBody.error) {
                            errorMessage = errorBody.error;
                        }
                    }
                } catch (jsonErr: any) {
                    console.error('Error parsing response body:', jsonErr);
                    if (jsonErr?.message) errorMessage = jsonErr.message;
                }

                throw new Error(errorMessage);
            }

            if (data?.authorization_url) {
                window.location.href = data.authorization_url;
            } else if (data?.error) {
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error('Payment initialization error:', error);
            const message = error.message || "Failed to initialize payment.";

            if (message.includes("FLUTTERWAVE_SECRET_KEY")) {
                toast.error("System configuration error: Flutterwave key is missing. Please contact support.");
            } else {
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-yellow-500/30">
            {/* Background Gradient Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
            </div>

            <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-semibold mb-6"
                    >
                        <Sparkles className="w-4 h-4" />
                        EXCLUSIVE FLASH SALE BUNDLE
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
                    >
                        The Ultimate <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500">
                            Trader's Power Pack
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-400 max-w-2xl mx-auto"
                    >
                        Master Smart Money Concepts and automate your journaling with AI.
                        Two world-class tools, one impossible price.
                    </motion.p>
                </div>

                {/* The Math Section */}
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="bg-white/5 border-white/10 backdrop-blur-xl h-full overflow-hidden group hover:border-yellow-500/30 transition-all">
                            <div className="p-8">
                                <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-white">SMS Ebook Course</h3>
                                <p className="text-gray-400 mb-6">Complete playbook on Smart Money Scalping. Learn to read institutional order flow like a pro.</p>
                                <div className="flex items-center gap-2 mb-8">
                                    <span className="text-gray-500 line-through">₦10,000</span>
                                    <span className="text-yellow-500 font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-sm">INCLUDED</span>
                                </div>
                                <ul className="space-y-3">
                                    {["100+ Page Playbook", "Institutional Strategies", "Scalping Techniques", "Risk Management"].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                                            <Check className="w-4 h-4 text-green-500" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="bg-white/5 border-white/10 backdrop-blur-xl h-full overflow-hidden group hover:border-purple-500/30 transition-all">
                            <div className="p-8">
                                <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                                    <Gift className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-white">AI Journaling App</h3>
                                <p className="text-gray-400 mb-6">Lifetime access to the AI-powered trading journal. Let AI analyze your trades while you sleep.</p>
                                <div className="flex items-center gap-2 mb-8">
                                    <span className="text-gray-500 line-through">₦30,000</span>
                                    <span className="text-purple-500 font-bold px-2 py-0.5 rounded bg-purple-500/10 text-sm">LIFETIME ACCESS</span>
                                </div>
                                <ul className="space-y-3">
                                    {["AI Trade Validation", "Voice-to-Journal AI", "Psychology Analysis", "No Monthly Fees"].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                                            <Check className="w-4 h-4 text-green-500" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Pricing Card */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-3xl mx-auto"
                >
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-purple-500 rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <Card className="relative bg-[#0a0a0a] border-white/10 p-10 md:p-16 rounded-3xl overflow-hidden">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                                <div className="text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                        <span className="text-sm font-bold text-yellow-500 tracking-widest uppercase">Limited Time Bundle</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Get Both Today</h2>
                                    <p className="text-gray-400 mb-0">Total Value: <span className="line-through">₦40,000</span></p>
                                    <div className="mt-4 flex items-baseline justify-center md:justify-start">
                                        <span className="text-6xl md:text-7xl font-extrabold text-white">₦15,000</span>
                                        <span className="text-gray-500 ml-4 font-medium italic text-lg hover:text-yellow-500 transition-colors cursor-pointer" onClick={() => toast("Fastest finger gets it for ₦12,500? Contact us!")}>Special Deal</span>
                                    </div>
                                    {/* Scarcity Counter */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30"
                                    >
                                        <Sparkles className="w-4 h-4 text-red-400" />
                                        <span className="text-sm font-semibold text-red-400">Limited to first 10 traders • 6 slots remaining</span>
                                    </motion.div>
                                </div>

                                <div className="w-full md:w-auto flex flex-col items-center gap-6">
                                    <Button
                                        size="lg"
                                        onClick={handlePurchase}
                                        disabled={loading}
                                        className={`w-full md:w-64 h-20 text-xl font-bold rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${isOwned
                                            ? "bg-green-500 hover:bg-green-400 text-white shadow-[0_0_40px_rgba(34,197,94,0.3)]"
                                            : "bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_40px_rgba(234,179,8,0.3)] hover:shadow-[0_0_60px_rgba(234,179,8,0.5)]"
                                            }`}
                                    >
                                        {loading ? "Initializing..." : isOwned ? "YOU OWN THIS" : "CLAIM NOW"}
                                        {!loading && <ArrowRight className="w-6 h-6" />}
                                    </Button>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <ShieldCheck className="w-4 h-4" />
                                            Secure Payment via Flutterwave
                                        </div>
                                        {/* Instant Access Reassurance */}
                                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                                            <Zap className="w-3 h-3" />
                                            Instant automated access • Start learning 30 seconds after payment
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </motion.div>

                {/* Social Proof / Trust */}
                <div className="mt-20 text-center">
                    <p className="text-gray-500 text-sm mb-12 uppercase tracking-[0.2em]">Trusted by 500+ Traders</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                        {/* Add dummy logos or icons if needed */}
                        <span className="text-2xl font-bold text-white">MT5 CONNECT</span>
                        <span className="text-2xl font-bold text-white">SMART MONEY</span>
                        <span className="text-2xl font-bold text-white">AI TRACK3R</span>
                        <span className="text-2xl font-bold text-white">QUANT GEAR</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 text-center text-gray-600 text-sm">
                <p>&copy; 2026 FX Journal & SMS Course. All rights reserved.</p>
                <div className="mt-4 flex justify-center gap-6">
                    <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
                    <a href="/terms" className="hover:text-white transition-colors">Terms</a>
                    <a href="mailto:amphyai@outlook.com" className="hover:text-white transition-colors">Support</a>
                </div>
            </footer>
        </div>
    );
};

export default BundleOffer;
