import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
    Mic, Shield, BarChart3, Brain, Zap, Target,
    TrendingUp, Flame, Award, Users, Sparkles, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Feature {
    id: string;
    name: string;
    description: string;
    icon: any;
    url: string;
    category: "new" | "popular" | "hidden-gem";
}

const ALL_FEATURES: Feature[] = [
    {
        id: "voice-memos",
        name: "Voice Memos",
        description: "Record trade thoughts instantly - no typing needed",
        icon: Mic,
        url: "/voice-memos",
        category: "new"
    },
    {
        id: "prop-firm-protector",
        name: "Prop Firm Protector",
        description: "Calculate safe lot sizes to never blow your account",
        icon: Shield,
        url: "/prop-firm-protector",
        category: "popular"
    },
    {
        id: "advanced-analytics",
        name: "Advanced Analytics",
        description: "Deep dive into your trading patterns",
        icon: TrendingUp,
        url: "/analytics/advanced",
        category: "hidden-gem"
    },
    {
        id: "mental-state",
        name: "Mental State Analysis",
        description: "See how your emotions affect your P&L",
        icon: Brain,
        url: "/analytics/mental-state",
        category: "hidden-gem"
    },
    {
        id: "ai-setup-analyzer",
        name: "AI Setup Analyzer",
        description: "Let AI analyze your trade setups",
        icon: Zap,
        url: "/ai-setup-analyzer",
        category: "popular"
    },
    {
        id: "streaks",
        name: "Streaks",
        description: "Track your winning and losing streaks",
        icon: Flame,
        url: "/streaks",
        category: "hidden-gem"
    },
    {
        id: "achievements",
        name: "Achievements",
        description: "Unlock badges as you improve",
        icon: Award,
        url: "/achievements",
        category: "popular"
    },
    {
        id: "accountability-partners",
        name: "Accountability Partners",
        description: "Share your journey with trusted traders",
        icon: Users,
        url: "/accountability-partners",
        category: "hidden-gem"
    }
];

export const FeatureDiscoveryCard = () => {
    const navigate = useNavigate();
    const [dismissedFeatures, setDismissedFeatures] = useState<string[]>([]);
    const [visitedPages, setVisitedPages] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        loadUserPreferences();
    }, []);

    const loadUserPreferences = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Load dismissed features from localStorage
            const dismissed = localStorage.getItem(`dismissed_features_${user.id}`);
            if (dismissed) {
                setDismissedFeatures(JSON.parse(dismissed));
            }

            // Track visited pages
            const visited = localStorage.getItem(`visited_pages_${user.id}`);
            if (visited) {
                setVisitedPages(JSON.parse(visited));
            }
        } catch (error) {
            console.error("Error loading preferences:", error);
        }
    };

    const dismissFeature = async (featureId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updated = [...dismissedFeatures, featureId];
        setDismissedFeatures(updated);
        localStorage.setItem(`dismissed_features_${user.id}`, JSON.stringify(updated));
    };

    const dismissCard = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setIsVisible(false);
        localStorage.setItem(`hide_discovery_card_${user.id}`, "true");
    };

    const handleFeatureClick = (feature: Feature) => {
        navigate(feature.url);
    };

    // Filter features user hasn't visited or dismissed
    const suggestedFeatures = ALL_FEATURES.filter(
        f => !visitedPages.includes(f.url) && !dismissedFeatures.includes(f.id)
    ).slice(0, 3);

    if (!isVisible || suggestedFeatures.length === 0) return null;

    const getCategoryBadge = (category: Feature["category"]) => {
        switch (category) {
            case "new":
                return <Badge className="bg-blue-500 text-white">New</Badge>;
            case "popular":
                return <Badge className="bg-green-500 text-white">Popular</Badge>;
            case "hidden-gem":
                return <Badge className="bg-purple-500 text-white">Hidden Gem</Badge>;
        }
    };

    return (
        <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border-2 border-blue-200 dark:border-blue-800 relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-400/20 to-blue-400/20 rounded-full blur-2xl" />

            <CardHeader className="relative">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                            💡 Features You Might Love
                        </CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={dismissCard}
                        className="h-6 w-6"
                        title="Hide this card"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                    Unlock the full power of Amphy AI - try these features!
                </p>
            </CardHeader>

            <CardContent className="relative">
                <div className="grid gap-3">
                    {suggestedFeatures.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.id}
                                className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-md cursor-pointer"
                                onClick={() => handleFeatureClick(feature)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white shrink-0">
                                        <Icon className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {feature.name}
                                            </h4>
                                            {getCategoryBadge(feature.category)}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {feature.description}
                                        </p>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dismissFeature(feature.id);
                                        }}
                                        title="Not interested"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 text-center">
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate("/ai-features")}
                        className="text-xs text-blue-600 dark:text-blue-400"
                    >
                        View All Features →
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
