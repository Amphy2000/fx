import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

interface DailyDrawdown {
  date: string;
  drawdown: number;
  trades: number;
}

interface DrawdownHeatmapProps {
  data: DailyDrawdown[];
  onDayClick?: (date: string) => void;
}

export const DrawdownHeatmap = ({ data, onDayClick }: DrawdownHeatmapProps) => {
  const months = useMemo(() => {
    const monthMap = new Map<string, DailyDrawdown[]>();
    data.forEach(day => {
      const monthKey = day.date.substring(0, 7); // YYYY-MM
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(day);
    });
    return Array.from(monthMap.entries()).slice(-6); // Last 6 months
  }, [data]);

  const getColor = (drawdown: number) => {
    if (drawdown === 0) return 'hsl(var(--muted))';
    if (drawdown < -10) return 'hsl(var(--destructive))';
    if (drawdown < -5) return 'hsl(0 84% 60%)';
    if (drawdown < -2) return 'hsl(25 95% 63%)';
    return 'hsl(48 96% 70%)';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawdown Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {months.map(([month, days]) => (
            <div key={month}>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => (
                  <div
                    key={day.date}
                    onClick={() => onDayClick?.(day.date)}
                    className="aspect-square rounded cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    style={{ backgroundColor: getColor(day.drawdown) }}
                    title={`${day.date}: ${day.drawdown.toFixed(2)}% (${day.trades} trades)`}
                  />
                ))}
              </div>
            </div>
          ))}
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
  );
};
