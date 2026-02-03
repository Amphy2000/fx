import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    LayoutDashboard, Calendar, BarChart3, Brain, Sparkles, Zap,
    Heart, ClipboardCheck, Mic, Lightbulb, Flame, Award, Users,
    TrendingUp, Shield, Calculator, Target, Settings, Plug, CreditCard,
    Crown, BookOpen, Activity
} from "lucide-react";

interface Command {
    id: string;
    name: string;
    description: string;
    icon: any;
    url: string;
    keywords: string[];
    category: string;
}

const COMMANDS: Command[] = [
    // Trading
    { id: "dashboard", name: "Dashboard", description: "View your trading overview", icon: LayoutDashboard, url: "/dashboard", keywords: ["home", "main", "overview"], category: "Trading" },
    { id: "calendar", name: "Trade Calendar", description: "View all your trades", icon: Calendar, url: "/trade-calendar", keywords: ["trades", "history", "log"], category: "Trading" },
    { id: "weekly", name: "Weekly Summary", description: "Weekly performance report", icon: BarChart3, url: "/weekly-summary", keywords: ["report", "summary", "week"], category: "Trading" },

    // AI Features
    { id: "ai-hub", name: "AI Features Hub", description: "All AI-powered tools", icon: Brain, url: "/ai-features", keywords: ["artificial", "intelligence", "ai"], category: "AI" },
    { id: "ai-journal", name: "AI Daily Journal", description: "AI-powered journaling", icon: Sparkles, url: "/ai-journal", keywords: ["journal", "diary", "notes"], category: "AI" },
    { id: "ai-setup", name: "AI Setup Analyzer", description: "Analyze trade setups with AI", icon: Zap, url: "/ai-setup-analyzer", keywords: ["analyze", "setup", "pattern"], category: "AI" },

    // Journal & Tracking
    { id: "checkin", name: "Daily Check-In", description: "Track your mental state", icon: Heart, url: "/check-in", keywords: ["mood", "mental", "emotion"], category: "Journal" },
    { id: "routine", name: "Trading Routine", description: "Your daily trading routine", icon: ClipboardCheck, url: "/routine", keywords: ["habit", "daily", "ritual"], category: "Journal" },
    { id: "voice", name: "Voice Memos", description: "Record voice notes", icon: Mic, url: "/voice-memos", keywords: ["audio", "record", "note"], category: "Journal" },

    // Performance
    { id: "setups", name: "Setups", description: "Track your trading setups", icon: Lightbulb, url: "/setups", keywords: ["strategy", "pattern"], category: "Performance" },
    { id: "mental", name: "Mental State Analysis", description: "Emotions vs Performance", icon: Brain, url: "/analytics/mental-state", keywords: ["psychology", "emotion", "mood"], category: "Performance" },
    { id: "streaks", name: "Streaks", description: "Win/loss streaks", icon: Flame, url: "/streaks", keywords: ["winning", "losing", "consecutive"], category: "Performance" },
    { id: "achievements", name: "Achievements", description: "Your trading milestones", icon: Award, url: "/achievements", keywords: ["badges", "goals", "rewards"], category: "Performance" },
    { id: "leaderboard", name: "Leaderboard", description: "Compare with other traders", icon: Crown, url: "/leaderboard", keywords: ["ranking", "competition"], category: "Performance" },
    { id: "partners", name: "Accountability Partners", description: "Share your journey", icon: Users, url: "/accountability-partners", keywords: ["friends", "share", "community"], category: "Performance" },
    { id: "advanced", name: "Advanced Analytics", description: "Deep performance insights", icon: TrendingUp, url: "/analytics/advanced", keywords: ["stats", "metrics", "data"], category: "Performance" },

    // Tools
    { id: "prop", name: "Prop Firm Protector", description: "Calculate safe lot sizes", icon: Shield, url: "/prop-firm-protector", keywords: ["risk", "lot", "size", "challenge"], category: "Tools" },
    { id: "calc", name: "Calculators", description: "Trading calculators", icon: Calculator, url: "/calculators", keywords: ["calculate", "math"], category: "Tools" },
    { id: "targets", name: "Targets", description: "Set and track goals", icon: Target, url: "/targets", keywords: ["goals", "objectives"], category: "Tools" },

    // System
    { id: "integrations", name: "Integrations", description: "Connect MT5 and more", icon: Plug, url: "/integrations", keywords: ["mt5", "connect", "sync"], category: "System" },
    { id: "settings", name: "Settings", description: "App preferences", icon: Settings, url: "/settings", keywords: ["preferences", "config"], category: "System" },
    { id: "pricing", name: "Pricing", description: "View plans", icon: CreditCard, url: "/pricing", keywords: ["subscription", "upgrade", "plan"], category: "System" },
];

export const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();

    // Filter commands based on search
    const filteredCommands = search.trim() === ""
        ? COMMANDS
        : COMMANDS.filter(cmd =>
            cmd.name.toLowerCase().includes(search.toLowerCase()) ||
            cmd.description.toLowerCase().includes(search.toLowerCase()) ||
            cmd.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()))
        );

    // Group by category
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, Command[]>);

    // Keyboard shortcut to open (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Listen for custom trigger event (for mobile/buttons)
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener("open-command-palette", handleOpen);
        return () => window.removeEventListener("open-command-palette", handleOpen);
    }, []);

    // Handle arrow navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                navigate(filteredCommands[selectedIndex].url);
                setIsOpen(false);
                setSearch("");
            }
        }
    }, [filteredCommands, selectedIndex, navigate]);

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    const handleCommandClick = (url: string) => {
        navigate(url);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0 max-w-2xl max-h-[600px] overflow-hidden">
                <div className="flex flex-col h-full">
                    {/* Search Input */}
                    <div className="p-4 border-b">
                        <Input
                            placeholder="Search features... (Ctrl+K)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="border-0 focus-visible:ring-0 text-lg"
                            autoFocus
                        />
                    </div>

                    {/* Results */}
                    <div className="overflow-y-auto max-h-[500px] p-2">
                        {Object.entries(groupedCommands).map(([category, commands]) => (
                            <div key={category} className="mb-4">
                                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {category}
                                </div>
                                <div className="space-y-1">
                                    {commands.map((cmd, idx) => {
                                        const globalIndex = filteredCommands.indexOf(cmd);
                                        const Icon = cmd.icon;
                                        return (
                                            <div
                                                key={cmd.id}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${globalIndex === selectedIndex
                                                    ? "bg-primary text-primary-foreground"
                                                    : "hover:bg-muted"
                                                    }`}
                                                onClick={() => handleCommandClick(cmd.url)}
                                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm">{cmd.name}</div>
                                                    <div className={`text-xs ${globalIndex === selectedIndex ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                                        {cmd.description}
                                                    </div>
                                                </div>
                                                <kbd className={`px-2 py-1 text-xs rounded border ${globalIndex === selectedIndex ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-muted"}`}>
                                                    ↵
                                                </kbd>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {filteredCommands.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No features found for "{search}"</p>
                                <p className="text-xs mt-1">Try searching for "voice", "prop", or "analytics"</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t p-2 bg-muted/50">
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border bg-background">↑</kbd>
                                    <kbd className="px-1.5 py-0.5 rounded border bg-background">↓</kbd>
                                    Navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border bg-background">↵</kbd>
                                    Select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border bg-background">Esc</kbd>
                                    Close
                                </span>
                            </div>
                            <span>{filteredCommands.length} results</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
