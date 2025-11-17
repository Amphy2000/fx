import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Filter, Image as ImageIcon, Brain } from "lucide-react";
import { formatDistance, format } from "date-fns";
import { TradeInsightBadge } from "@/components/TradeInsightBadge";
import { EmotionTrackingModal } from "./EmotionTrackingModal";

interface TradesListProps {
  trades: any[];
  onTradeDeleted: () => void;
}

const TradesList = ({ trades, onTradeDeleted }: TradesListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterInstrument, setFilterInstrument] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [tradeInsights, setTradeInsights] = useState<Record<string, any>>({});
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [emotionModalOpen, setEmotionModalOpen] = useState(false);
  const [selectedTradeForEmotion, setSelectedTradeForEmotion] = useState<any>(null);
  
  const itemsPerPage = 10;
  const handleDelete = async (tradeId: string) => {
    try {
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", tradeId);

      if (error) throw error;

      toast.success("Trade deleted successfully");
      onTradeDeleted();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete trade");
    }
  };

  // Get unique instruments for filter
  const uniqueInstruments = useMemo(() => {
    const instruments = new Set(trades.map(t => t.pair));
    return Array.from(instruments);
  }, [trades]);

  // Apply filters and pagination
  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const matchesInstrument = filterInstrument === "all" || trade.pair === filterInstrument;
      const matchesResult = filterResult === "all" || trade.result === filterResult;
      
      let matchesDate = true;
      if (filterDateFrom || filterDateTo) {
        const tradeDate = new Date(trade.created_at);
        if (filterDateFrom) {
          matchesDate = matchesDate && tradeDate >= new Date(filterDateFrom);
        }
        if (filterDateTo) {
          matchesDate = matchesDate && tradeDate <= new Date(filterDateTo + "T23:59:59");
        }
      }
      
      return matchesInstrument && matchesResult && matchesDate;
    });
  }, [trades, filterInstrument, filterResult, filterDateFrom, filterDateTo]);

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(start, start + itemsPerPage);
  }, [filteredTrades, currentPage]);

  // Generate signed URLs for all screenshots in current page
  useEffect(() => {
    const generateSignedUrls = async () => {
      const urlsToGenerate = new Set<string>();
      
      paginatedTrades.forEach(trade => {
        if (trade.screenshot_url) {
          trade.screenshot_url.split(',').forEach((url: string) => {
            urlsToGenerate.add(url.trim());
          });
        }
      });

      const newSignedUrls: Record<string, string> = {};
      
      for (const url of urlsToGenerate) {
        try {
          // Extract file path from URL
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/');
          const fileName = pathParts.slice(pathParts.indexOf('trade-screenshots') + 1).join('/');
          
          const { data, error } = await supabase.storage
            .from('trade-screenshots')
            .createSignedUrl(fileName, 3600); // 1 hour expiry
          if (!error && data) {
            newSignedUrls[url] = data.signedUrl;
          }
        } catch (error) {
          console.error("Error generating signed URL:", error);
        }
      }
      
      setSignedUrls(newSignedUrls);
    };

    if (paginatedTrades.length > 0) {
      generateSignedUrls();
    }
  }, [paginatedTrades]);

  // Fetch trade insights for current page trades
  useEffect(() => {
    const fetchTradeInsights = async () => {
      const tradeIds = paginatedTrades.map(t => t.id);
      if (tradeIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('trade_insights')
          .select('*')
          .in('trade_id', tradeIds);

        if (error) throw error;

        const insightsMap: Record<string, any> = {};
        data?.forEach(insight => {
          insightsMap[insight.trade_id] = insight;
        });
        setTradeInsights(insightsMap);
      } catch (error) {
        console.error("Error fetching trade insights:", error);
      }
    };

    if (paginatedTrades.length > 0) {
      fetchTradeInsights();
    }
  }, [paginatedTrades]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "win":
        return "bg-success/20 text-success border-success/50";
      case "loss":
        return "bg-destructive/20 text-destructive border-destructive/50";
      case "breakeven":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-primary/20 text-primary border-primary/50";
    }
  };

  if (trades.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No trades logged yet. Start tracking your performance!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Trade History</CardTitle>
          <Badge variant="outline" className="text-xs">
            {filteredTrades.length} {filteredTrades.length === 1 ? 'trade' : 'trades'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Instrument</label>
              <Select value={filterInstrument} onValueChange={(v) => { setFilterInstrument(v); handleFilterChange(); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Instruments</SelectItem>
                  {uniqueInstruments.map(inst => (
                    <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Result</label>
              <Select value={filterResult} onValueChange={(v) => { setFilterResult(v); handleFilterChange(); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From Date</label>
              <Input 
                type="date" 
                value={filterDateFrom} 
                onChange={(e) => { setFilterDateFrom(e.target.value); handleFilterChange(); }}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To Date</label>
              <Input 
                type="date" 
                value={filterDateTo} 
                onChange={(e) => { setFilterDateTo(e.target.value); handleFilterChange(); }}
                className="h-9"
              />
            </div>
          </div>

          {(filterInstrument !== "all" || filterResult !== "all" || filterDateFrom || filterDateTo) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setFilterInstrument("all");
                setFilterResult("all");
                setFilterDateFrom("");
                setFilterDateTo("");
                handleFilterChange();
              }}
              className="h-8 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {filteredTrades.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No trades match your filters. Try adjusting them!
          </p>
        ) : (
          <>
            {/* Trades List */}
            {paginatedTrades.map((trade) => (
          <div
            key={trade.id}
            className="p-4 rounded-lg border border-border/50 bg-card/50 transition-smooth hover:bg-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{trade.pair}</h3>
                  <Badge
                    variant="outline"
                    className={
                      trade.direction === "buy"
                        ? "text-success border-success/50"
                        : "text-destructive border-destructive/50"
                    }
                  >
                    {trade.direction === "buy" ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {trade.direction.toUpperCase()}
                  </Badge>
                  <Badge className={getResultColor(trade.result)}>
                    {trade.result.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistance(new Date(trade.created_at), new Date(), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(trade.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Entry:</span>
                <p className="font-medium">{trade.entry_price}</p>
              </div>
              {trade.exit_price && (
                <div>
                  <span className="text-muted-foreground">Exit:</span>
                  <p className="font-medium">{trade.exit_price}</p>
                </div>
              )}
              {trade.stop_loss && (
                <div>
                  <span className="text-muted-foreground">SL:</span>
                  <p className="font-medium">{trade.stop_loss}</p>
                </div>
              )}
              {trade.take_profit && (
                <div>
                  <span className="text-muted-foreground">TP:</span>
                  <p className="font-medium">{trade.take_profit}</p>
                </div>
              )}
            </div>

            {trade.profit_loss && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <span className="text-muted-foreground text-sm">P/L: </span>
                <span
                  className={`font-semibold ${
                    trade.profit_loss > 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  ${trade.profit_loss.toFixed(2)}
                </span>
              </div>
            )}

            {trade.emotion_before && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Emotion: {trade.emotion_before}
                </Badge>
              </div>
            )}

            {trade.notes && (
              <div className="mt-3 p-2 rounded bg-muted/30">
                <p className="text-sm text-muted-foreground">{trade.notes}</p>
              </div>
            )}

            {/* Screenshots */}
            {trade.screenshot_url && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Screenshots</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {trade.screenshot_url.split(',').map((url: string, idx: number) => {
                    const trimmedUrl = url.trim();
                    const signedUrl = signedUrls[trimmedUrl] || trimmedUrl;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => window.open(signedUrl, '_blank')}
                        className="relative group"
                      >
                        <img
                          src={signedUrl}
                          alt={`Trade screenshot ${idx + 1}`}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                          className="w-20 h-20 object-cover rounded border-2 border-border hover:border-primary transition-smooth cursor-pointer"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-smooth rounded flex items-center justify-center">
                          <span className="text-white text-xs">View</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Trade Insights */}
            {tradeInsights[trade.id] && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">AI Analysis</span>
                </div>
                <TradeInsightBadge
                  behaviorLabel={tradeInsights[trade.id].behavior_label}
                  patternType={tradeInsights[trade.id].pattern_type}
                  confidenceScore={tradeInsights[trade.id].confidence_score}
                  executionGrade={tradeInsights[trade.id].execution_grade}
                  onClick={() => {
                    setSelectedInsight(tradeInsights[trade.id]);
                    setShowInsightModal(true);
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
          </>
        )}
      </CardContent>

      {/* AI Insight Detail Modal */}
      <Dialog open={showInsightModal} onOpenChange={setShowInsightModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Trade Analysis</DialogTitle>
          </DialogHeader>
          {selectedInsight && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Pattern Type</p>
                  <p className="font-semibold capitalize">{selectedInsight.pattern_type || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Execution Grade</p>
                  <p className="font-semibold text-lg">{selectedInsight.execution_grade || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Behavior Label</p>
                  <p className="font-semibold capitalize">{selectedInsight.behavior_label?.replace(/_/g, ' ') || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Confidence Score</p>
                  <p className="font-semibold">{selectedInsight.confidence_score || 0}%</p>
                </div>
              </div>

              {selectedInsight.behavior_comment && (
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-sm font-medium mb-2 text-accent-foreground">💬 AI Comment</p>
                  <p className="text-sm text-foreground">{selectedInsight.behavior_comment}</p>
                </div>
              )}

              {selectedInsight.ai_summary && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium mb-2 text-primary">📊 Analysis Summary</p>
                  <p className="text-sm text-foreground">{selectedInsight.ai_summary}</p>
                </div>
              )}

              {selectedInsight.recommendations && (
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-sm font-medium mb-2 text-success">💡 Recommendations</p>
                  <p className="text-sm text-foreground">{selectedInsight.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TradesList;
