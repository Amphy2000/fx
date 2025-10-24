import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";

interface Trade {
  id: string;
  pair: string;
  direction: string;
  result: string;
  profit_loss: number;
  created_at: string;
}

export default function TradeCalendar() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, [currentDate]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchTrades();
  };

  const fetchTrades = async () => {
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTrades((data || []) as Trade[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTradesForDay = (day: Date) => {
    return trades.filter(trade => 
      isSameDay(new Date(trade.created_at), day)
    );
  };

  const getDayStats = (day: Date) => {
    const dayTrades = getTradesForDay(day);
    const totalPL = dayTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
    const wins = dayTrades.filter(t => t.result === "win").length;
    const losses = dayTrades.filter(t => t.result === "loss").length;
    return { totalPL, wins, losses, count: dayTrades.length };
  };

  const getMonthStats = () => {
    const totalPL = trades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
    const wins = trades.filter(t => t.result === "win").length;
    const losses = trades.filter(t => t.result === "loss").length;
    const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : "0";
    return { totalPL, wins, losses, totalTrades: trades.length, winRate };
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const monthStats = getMonthStats();

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading calendar...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Trade Calendar</h1>
            <p className="text-muted-foreground mt-2">View your trades by day and track monthly performance</p>
          </div>

          {/* Month Stats Summary */}
          <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{format(currentDate, "MMMM yyyy")} Summary</span>
                <Badge variant={monthStats.totalPL >= 0 ? "default" : "destructive"} className="text-lg px-4 py-1">
                  ${monthStats.totalPL.toFixed(2)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{monthStats.totalTrades}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Wins</p>
                  <p className="text-2xl font-bold text-success">{monthStats.wins}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Losses</p>
                  <p className="text-2xl font-bold text-destructive">{monthStats.losses}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">{monthStats.winRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <h2 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const dayStats = getDayStats(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const hasTrades = dayStats.count > 0;

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-24 p-2 rounded-lg border transition-all
                      ${isCurrentMonth ? "bg-card" : "bg-muted/30"}
                      ${isToday ? "border-primary border-2" : "border-border"}
                      ${hasTrades ? "hover:shadow-lg cursor-pointer" : ""}
                    `}
                  >
                    <div className="flex flex-col h-full">
                      <span className={`text-sm font-medium mb-1 ${!isCurrentMonth ? "text-muted-foreground" : ""}`}>
                        {format(day, "d")}
                      </span>
                      
                      {hasTrades && (
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Badge variant="secondary" className="px-1 py-0 text-xs">
                              {dayStats.count}
                            </Badge>
                          </div>
                          <div className={`text-xs font-semibold ${dayStats.totalPL >= 0 ? "text-success" : "text-destructive"}`}>
                            ${dayStats.totalPL.toFixed(2)}
                          </div>
                          <div className="flex gap-1 text-xs">
                            {dayStats.wins > 0 && (
                              <span className="text-success flex items-center">
                                <TrendingUp className="h-3 w-3" />
                                {dayStats.wins}
                              </span>
                            )}
                            {dayStats.losses > 0 && (
                              <span className="text-destructive flex items-center">
                                <TrendingDown className="h-3 w-3" />
                                {dayStats.losses}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
