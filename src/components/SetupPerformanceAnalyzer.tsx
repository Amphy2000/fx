import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Sparkles } from "lucide-react";
import { ModernDonutChart } from "./ModernDonutChart";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AISetupInsights } from "./AISetupInsights";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface SetupPerformanceAnalyzerProps {
  trades: any[];
  userId: string;
}

export const SetupPerformanceAnalyzer = ({ trades, userId }: SetupPerformanceAnalyzerProps) => {
  const { toast } = useToast();
  const [analyzingSetup, setAnalyzingSetup] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  const data = useMemo(() => {
    const setupStats: Record<string, any> = {};
    
    trades.forEach(trade => {
      const setupName = trade.setup_id || 'No Setup';
      if (!setupStats[setupName]) {
        setupStats[setupName] = {
          totalTrades: 0,
          wins: 0,
          totalWin: 0,
          totalLoss: 0,
          totalR: 0,
          totalPnL: 0
        };
      }
      
      const stats = setupStats[setupName];
      stats.totalTrades++;
      stats.totalPnL += trade.profit_loss || 0;
      stats.totalR += trade.r_multiple || 0;
      
      if (trade.result === 'win') {
        stats.wins++;
        stats.totalWin += trade.profit_loss || 0;
      } else if (trade.result === 'loss') {
        stats.totalLoss += Math.abs(trade.profit_loss || 0);
      }
    });
    
    return Object.entries(setupStats).map(([setupName, stats]) => {
      const winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
      const profitFactor = stats.totalLoss > 0 ? stats.totalWin / stats.totalLoss : 0;
      const avgR = stats.totalTrades > 0 ? stats.totalR / stats.totalTrades : 0;
      const avgWin = stats.wins > 0 ? stats.totalWin / stats.wins : 0;
      const avgLoss = (stats.totalTrades - stats.wins) > 0 ? stats.totalLoss / (stats.totalTrades - stats.wins) : 0;
      const expectancy = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss);
      
      return {
        setupName,
        totalTrades: stats.totalTrades,
        winRate,
        profitFactor,
        avgR,
        expectancy,
        totalPnL: stats.totalPnL
      };
    });
  }, [trades]);
  
  const sortedByPnL = [...data].sort((a, b) => b.totalPnL - a.totalPnL);
  const topSetups = sortedByPnL.slice(0, 5);

  const donutData = topSetups.map(setup => ({
    name: setup.setupName,
    value: Math.abs(setup.totalPnL),
  }));

  const getPerformanceColor = (value: number, metric: 'winRate' | 'profitFactor' | 'expectancy') => {
    if (metric === 'winRate') {
      return value >= 60 ? 'text-success' : value >= 50 ? 'text-warning' : 'text-destructive';
    }
    if (metric === 'profitFactor') {
      return value >= 2 ? 'text-success' : value >= 1.5 ? 'text-warning' : 'text-destructive';
    }
    if (metric === 'expectancy') {
      return value >= 0.5 ? 'text-success' : value >= 0 ? 'text-warning' : 'text-destructive';
    }
    return '';
  };

  const handleAnalyzeSetup = async (setupId: string, setupName: string) => {
    setAnalyzingSetup(setupId);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-setup-performance', {
        body: { setupId }
      });

      if (error) {
        if (error.message?.includes('402') || error.message?.includes('credits')) {
          toast({
            title: "Insufficient Credits",
            description: "You need 5 AI credits to analyze a setup. Please upgrade your plan.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Analysis Failed",
            description: error.message || "Unable to analyze setup",
            variant: "destructive"
          });
        }
      } else {
        setInsights({ ...data, setupName });
        setInsightsDialogOpen(true);
        toast({
          title: "Analysis Complete!",
          description: `Setup analysis finished. ${data.creditsRemaining} credits remaining.`
        });
      }
    } catch (error) {
      console.error('Error analyzing setup:', error);
      toast({
        title: "Error",
        description: "Failed to analyze setup",
        variant: "destructive"
      });
    } finally {
      setAnalyzingSetup(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Setups by P/L</CardTitle>
          </CardHeader>
          <CardContent>
            <ModernDonutChart data={donutData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSetups.slice(0, 3).map((setup, idx) => (
                <div key={setup.setupName} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0">
                    {idx === 0 ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : setup.totalPnL >= 0 ? (
                      <ArrowUpCircle className="h-5 w-5 text-success" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{setup.setupName}</div>
                    <div className="text-sm text-muted-foreground">
                      {setup.totalTrades} trades • {setup.winRate.toFixed(1)}% win rate
                    </div>
                    <div className="mt-1">
                      <Badge variant={setup.totalPnL >= 0 ? "default" : "destructive"}>
                        ${setup.totalPnL.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Setup Performance Breakdown</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI Analysis Available
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setup</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Profit Factor</TableHead>
                <TableHead className="text-right">Avg R</TableHead>
                <TableHead className="text-right">Expectancy</TableHead>
                <TableHead className="text-right">Total P/L</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByPnL.map((setup) => (
                <TableRow key={setup.setupName}>
                  <TableCell className="font-medium">{setup.setupName}</TableCell>
                  <TableCell className="text-right">{setup.totalTrades}</TableCell>
                  <TableCell className={`text-right font-medium ${getPerformanceColor(setup.winRate, 'winRate')}`}>
                    {setup.winRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getPerformanceColor(setup.profitFactor, 'profitFactor')}`}>
                    {setup.profitFactor.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {setup.avgR.toFixed(2)}R
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getPerformanceColor(setup.expectancy, 'expectancy')}`}>
                    ${setup.expectancy.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={setup.totalPnL >= 0 ? "default" : "destructive"}>
                      ${setup.totalPnL.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAnalyzeSetup(setup.setupName, setup.setupName)}
                      disabled={analyzingSetup === setup.setupName || setup.totalTrades < 5}
                      className="gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      {analyzingSetup === setup.setupName ? 'Analyzing...' : 'AI Analysis'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI Insights Dialog */}
      <Dialog open={insightsDialogOpen} onOpenChange={setInsightsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Setup Analysis</DialogTitle>
          </DialogHeader>
          {insights && (
            <AISetupInsights insights={insights} setupName={insights.setupName} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
