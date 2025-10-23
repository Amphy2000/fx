import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { formatDistance } from "date-fns";

interface TradesListProps {
  trades: any[];
  onTradeDeleted: () => void;
}

const TradesList = ({ trades, onTradeDeleted }: TradesListProps) => {
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
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trades.map((trade) => (
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TradesList;
