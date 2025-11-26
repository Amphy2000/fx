import { Button } from "@/components/ui/button";
import { Twitter } from "lucide-react";

interface ShareToTwitterButtonProps {
  stats: {
    totalTrades?: number;
    winRate?: number;
    totalPnL?: number;
    wins?: number;
    losses?: number;
    profitFactor?: number;
    mostTradedPair?: string;
  };
  type?: "dashboard" | "weekly";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function ShareToTwitterButton({ 
  stats, 
  type = "dashboard",
  variant = "outline",
  size = "sm" 
}: ShareToTwitterButtonProps) {
  const formatTweet = () => {
    const baseUrl = "https://fx.lovable.app";
    
    if (type === "weekly") {
      return `📊 My Weekly Trading Report\n\n` +
        `📈 ${stats.totalTrades || 0} Trades | ${stats.winRate || 0}% Win Rate\n` +
        `💰 ${stats.totalPnL && stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL?.toLocaleString() || 0} P/L\n` +
        `🎯 ${stats.wins || 0}W/${stats.losses || 0}L\n` +
        (stats.mostTradedPair ? `🔥 Top Pair: ${stats.mostTradedPair}\n` : '') +
        `\nTracking my progress with @AmphyAI 🧠\n` +
        `${baseUrl}`;
    }
    
    // Dashboard type
    return `📊 Trading Update\n\n` +
      `📈 ${stats.totalTrades || 0} Trades | ${stats.winRate || 0}% Win Rate\n` +
      `💰 ${stats.totalPnL && stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL?.toLocaleString() || 0} P/L\n` +
      (stats.profitFactor ? `⚡ ${stats.profitFactor}x Profit Factor\n` : '') +
      `\nAI-powered trading psychology & analytics with @AmphyAI 🧠\n` +
      `${baseUrl}`;
  };

  const handleShare = () => {
    const tweet = formatTweet();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleShare}
      className="gap-2"
    >
      <Twitter className="h-4 w-4" />
      <span className="hidden sm:inline">Share to Twitter</span>
      <span className="sm:hidden">Share</span>
    </Button>
  );
}
