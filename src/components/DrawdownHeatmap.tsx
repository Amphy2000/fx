import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMemo, useState } from "react";
import { DrawdownDayModal } from "./DrawdownDayModal";

interface DrawdownHeatmapProps {
  trades: any[];
}

export const DrawdownHeatmap = ({ trades }: DrawdownHeatmapProps) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, tradesByDate, peakHistory, recoveryTimes } = useMemo(() => {
    const dailyDrawdown: Record<string, { 
      drawdown: number; 
      drawdownAmount: number;
      trades: number; 
      peak: number; 
      trough: number;
    }> = {};
    const tradesByDate: Record<string, any[]> = {};
    const peakHistory: Record<string, number> = {};
    let cumulativePnL = 0;
    let peak = 0;
    
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    sortedTrades.forEach(trade => {
      if (trade.profit_loss) {
        cumulativePnL += trade.profit_loss;
        peak = Math.max(peak, cumulativePnL);
        const drawdown = peak - cumulativePnL;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
        const date = new Date(trade.created_at).toISOString().split('T')[0];
        
        if (!dailyDrawdown[date]) {
          dailyDrawdown[date] = { 
            drawdown: 0, 
            drawdownAmount: 0,
            trades: 0, 
            peak, 
            trough: cumulativePnL 
          };
          tradesByDate[date] = [];
        }
        
        if (drawdown > dailyDrawdown[date].drawdown) {
          dailyDrawdown[date].drawdown = drawdownPercent;
          dailyDrawdown[date].drawdownAmount = drawdown;
          dailyDrawdown[date].peak = peak;
          dailyDrawdown[date].trough = cumulativePnL;
        }
        
        dailyDrawdown[date].trades += 1;
        tradesByDate[date].push(trade);
        peakHistory[date] = peak;
      }
    });
    
    // Calculate recovery times
    const recoveryTimes: Record<string, number | null> = {};
    const dates = Object.keys(dailyDrawdown).sort();
    
    dates.forEach((date, idx) => {
      if (dailyDrawdown[date].drawdown > 0) {
        const peak = dailyDrawdown[date].peak;
        let recoveryDate = null;
        
        for (let i = idx + 1; i < dates.length; i++) {
          const futureDate = dates[i];
          if (peakHistory[futureDate] >= peak) {
            const daysDiff = Math.floor(
              (new Date(futureDate).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
            );
            recoveryDate = daysDiff;
            break;
          }
        }
        
        recoveryTimes[date] = recoveryDate;
      } else {
        recoveryTimes[date] = 0;
      }
    });
    
    const data = Object.entries(dailyDrawdown).map(([date, stats]) => ({
      date,
      drawdown: -stats.drawdown,
      drawdownAmount: stats.drawdownAmount,
      trades: stats.trades,
      peak: stats.peak,
      trough: stats.trough
    }));
    
    return { data, tradesByDate, peakHistory, recoveryTimes };
  }, [trades]);

  const months = useMemo(() => {
    const monthMap = new Map<string, any[]>();
    data.forEach(day => {
      const monthKey = day.date.substring(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(day);
    });
    return Array.from(monthMap.entries()).slice(-6);
  }, [data]);

  const getColor = (drawdown: number) => {
    if (drawdown === 0) return 'hsl(var(--muted))';
    if (drawdown < -10) return 'hsl(var(--destructive))';
    if (drawdown < -5) return 'hsl(0 84% 60%)';
    if (drawdown < -2) return 'hsl(25 95% 63%)';
    return 'hsl(48 96% 70%)';
  };

  const selectedDayData = selectedDay ? data.find(d => d.date === selectedDay) : null;
  const selectedDayTrades = selectedDay ? tradesByDate[selectedDay] || [] : [];
  const selectedDayRecovery = selectedDay ? recoveryTimes[selectedDay] : null;

  const handleDayClick = (date: string) => {
    setSelectedDay(date);
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Drawdown Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TooltipProvider>
              {months.map(([month, days]) => (
                <div key={month}>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {days.map(day => {
                      const recovery = recoveryTimes[day.date];
                      const recoveryText = recovery === null ? 'Ongoing' : recovery === 0 ? 'Same Day' : `${recovery}d recovery`;
                      
                      return (
                        <Tooltip key={day.date}>
                          <TooltipTrigger asChild>
                            <div
                              className="aspect-square rounded cursor-pointer hover:ring-2 hover:ring-primary transition-all hover:scale-110"
                              style={{ backgroundColor: getColor(day.drawdown) }}
                              onClick={() => handleDayClick(day.date)}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{new Date(day.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}</p>
                              <p className="text-xs">Drawdown: <span className="font-semibold text-destructive">{day.drawdown.toFixed(2)}%</span></p>
                              <p className="text-xs">Amount: <span className="font-semibold">${day.drawdownAmount?.toFixed(2) || '0.00'}</span></p>
                              <p className="text-xs">Trades: <span className="font-semibold">{day.trades}</span></p>
                              <p className="text-xs">Peak → Trough: <span className="font-semibold">${day.peak?.toFixed(2)} → ${day.trough?.toFixed(2)}</span></p>
                              <p className="text-xs">Recovery: <span className="font-semibold">{recoveryText}</span></p>
                              <p className="text-xs text-muted-foreground mt-1">Click for details</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TooltipProvider>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, -2, -5, -10, -15].map(val => (
                  <div
                    key={val}
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: getColor(val) }}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDayData && (
        <DrawdownDayModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          date={selectedDay!}
          trades={selectedDayTrades}
          drawdownPercent={Math.abs(selectedDayData.drawdown)}
          drawdownAmount={selectedDayData.drawdownAmount || 0}
          peakValue={selectedDayData.peak || 0}
          troughValue={selectedDayData.trough || 0}
          recoveryDays={selectedDayRecovery}
        />
      )}
    </>
  );
};
