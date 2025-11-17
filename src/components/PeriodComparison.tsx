import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PeriodComparisonProps {
  trades: any[];
}

export const PeriodComparison = ({ trades }: PeriodComparisonProps) => {
  const [comparisonType, setComparisonType] = useState<'week' | 'month' | 'custom'>('week');

  const comparisonData = useMemo(() => {
    const now = new Date();
    let period1Start: Date, period1End: Date, period2Start: Date, period2End: Date;

    if (comparisonType === 'week') {
      period1End = now;
      period1Start = new Date(now);
      period1Start.setDate(now.getDate() - 7);
      
      period2End = new Date(period1Start);
      period2Start = new Date(period1Start);
      period2Start.setDate(period1Start.getDate() - 7);
    } else {
      // month
      period1End = now;
      period1Start = new Date(now);
      period1Start.setMonth(now.getMonth() - 1);
      
      period2End = new Date(period1Start);
      period2Start = new Date(period1Start);
      period2Start.setMonth(period1Start.getMonth() - 1);
    }

    const period1Trades = trades.filter(t => {
      const date = new Date(t.created_at);
      return date >= period1Start && date <= period1End;
    });

    const period2Trades = trades.filter(t => {
      const date = new Date(t.created_at);
      return date >= period2Start && date <= period2End;
    });

    return {
      current: calculatePeriodStats(period1Trades, period1Start, period1End),
      previous: calculatePeriodStats(period2Trades, period2Start, period2End)
    };
  }, [trades, comparisonType]);

  const getChangeIndicator = (current: number, previous: number, inverse = false) => {
    if (previous === 0) return { value: 0, improved: false };
    
    const change = ((current - previous) / previous) * 100;
    const improved = inverse ? change < 0 : change > 0;
    
    return { value: Math.abs(change), improved };
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Period Comparison
          </CardTitle>
          <Select value={comparisonType} onValueChange={(v: any) => setComparisonType(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week vs Week</SelectItem>
              <SelectItem value="month">Month vs Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Period Labels */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Previous {comparisonType}</p>
              <p className="text-sm font-semibold">
                {comparisonData.previous.startDate} - {comparisonData.previous.endDate}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current {comparisonType}</p>
              <p className="text-sm font-semibold">
                {comparisonData.current.startDate} - {comparisonData.current.endDate}
              </p>
            </div>
          </div>

          {/* Metrics Comparison */}
          <div className="space-y-4">
            <ComparisonMetric
              label="Total Trades"
              previous={comparisonData.previous.totalTrades}
              current={comparisonData.current.totalTrades}
            />
            <ComparisonMetric
              label="Win Rate"
              previous={comparisonData.previous.winRate}
              current={comparisonData.current.winRate}
              suffix="%"
            />
            <ComparisonMetric
              label="Profit Factor"
              previous={comparisonData.previous.profitFactor}
              current={comparisonData.current.profitFactor}
            />
            <ComparisonMetric
              label="Total P/L"
              previous={comparisonData.previous.totalPnL}
              current={comparisonData.current.totalPnL}
              prefix="$"
            />
            <ComparisonMetric
              label="Avg R-Multiple"
              previous={comparisonData.previous.avgR}
              current={comparisonData.current.avgR}
              suffix="R"
            />
            <ComparisonMetric
              label="Max Drawdown"
              previous={comparisonData.previous.maxDrawdown}
              current={comparisonData.current.maxDrawdown}
              suffix="%"
              inverse
            />
            <ComparisonMetric
              label="Expectancy"
              previous={comparisonData.previous.expectancy}
              current={comparisonData.current.expectancy}
              prefix="$"
            />
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-2">Performance Summary:</p>
            <div className="space-y-1">
              {(() => {
                const improvements = [];
                const declines = [];

                const metrics = [
                  { label: 'Win Rate', ...getChangeIndicator(comparisonData.current.winRate, comparisonData.previous.winRate) },
                  { label: 'Profit Factor', ...getChangeIndicator(comparisonData.current.profitFactor, comparisonData.previous.profitFactor) },
                  { label: 'P/L', ...getChangeIndicator(comparisonData.current.totalPnL, comparisonData.previous.totalPnL) },
                ];

                metrics.forEach(m => {
                  if (m.improved) improvements.push(`${m.label} +${m.value.toFixed(1)}%`);
                  else declines.push(`${m.label} -${m.value.toFixed(1)}%`);
                });

                return (
                  <>
                    {improvements.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Improved: {improvements.join(', ')}</span>
                      </div>
                    )}
                    {declines.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">Declined: {declines.join(', ')}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ComparisonMetric = ({ 
  label, 
  previous, 
  current, 
  prefix = '', 
  suffix = '', 
  inverse = false 
}: any) => {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const improved = inverse ? change < 0 : change > 0;
  const changeAbs = Math.abs(change);

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {prefix}{previous.toFixed(2)}{suffix}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold min-w-[60px] text-right">
          {prefix}{current.toFixed(2)}{suffix}
        </span>
        {change !== 0 && (
          <Badge variant={improved ? "default" : "destructive"} className="min-w-[60px]">
            {improved ? '+' : '-'}{changeAbs.toFixed(1)}%
          </Badge>
        )}
      </div>
    </div>
  );
};

function calculatePeriodStats(trades: any[], startDate: Date, endDate: Date) {
  const wins = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  const totalWin = trades.filter(t => t.result === 'win').reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const totalLoss = Math.abs(trades.filter(t => t.result === 'loss').reduce((sum, t) => sum + (t.profit_loss || 0), 0));
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const avgR = trades.length > 0 ? trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length : 0;

  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  trades.forEach(t => {
    equity += t.profit_loss || 0;
    peak = Math.max(peak, equity);
    const dd = peak - equity;
    maxDrawdown = Math.max(maxDrawdown, dd);
  });
  const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

  const avgWin = wins > 0 ? totalWin / wins : 0;
  const avgLoss = losses > 0 ? totalLoss / losses : 0;
  const expectancy = trades.length > 0 ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss : 0;

  return {
    startDate: startDate.toLocaleDateString(),
    endDate: endDate.toLocaleDateString(),
    totalTrades: trades.length,
    wins,
    losses,
    winRate,
    profitFactor,
    totalPnL,
    avgR,
    maxDrawdown: maxDrawdownPercent,
    expectancy
  };
}
