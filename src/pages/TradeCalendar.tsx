import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const formatCurrency = (amount: number) => {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  let formatted = "";
  if (abs >= 1000) {
    formatted = (abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 2) + "K";
    formatted = formatted.replace(/\.00K$/, 'K').replace(/(\.\d)0K$/, '$1K');
  } else {
    formatted = abs.toFixed(2);
    formatted = formatted.replace(/\.00$/, '');
  }
  return `${isNegative ? "-" : ""}$${formatted}`;
};

const getCellColors = (totalPL: number) => {
  if (totalPL > 0) {
    return {
      bg: "bg-[#e8f5e9] dark:bg-emerald-500/10",
      border: "border-[#c8e6c9] dark:border-emerald-500/20",
      hoverRing: "hover:ring-emerald-500/30",
      text: "text-[#2e7d32] dark:text-emerald-400",
      dateColor: "text-[#2e7d32]/90 dark:text-emerald-400/90"
    };
  }
  if (totalPL < 0) {
    return {
      bg: "bg-[#ffebee] dark:bg-rose-500/10",
      border: "border-[#ffcdd2] dark:border-rose-500/20",
      hoverRing: "hover:ring-rose-500/30",
      text: "text-[#d32f2f] dark:text-rose-400",
      dateColor: "text-[#d32f2f]/90 dark:text-rose-400/90"
    };
  }
  return {
    bg: "bg-[#e3f2fd] dark:bg-blue-500/10",
    border: "border-[#bbdefb] dark:border-blue-500/20",
    hoverRing: "hover:ring-blue-500/30",
    text: "text-[#1565c0] dark:text-blue-400",
    dateColor: "text-[#1565c0]/90 dark:text-blue-400/90"
  };
};

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
    setLoading(true);
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
    return { totalPL, wins, count: dayTrades.length };
  };

  const getMonthStats = () => {
    const totalPL = trades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
    const tradeDays = new Set(trades.map(t => format(new Date(t.created_at), 'yyyy-MM-dd'))).size;
    return { totalPL, tradeDays };
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const monthStats = getMonthStats();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Calendar</h1>
          <p className="text-muted-foreground text-sm md:text-base">Track your daily trading performance and consistency.</p>
        </div>

        {/* Stats & Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">Monthly stats:</h2>
            <span className={`px-3 py-1 rounded-md font-bold text-sm tracking-wide ${
              monthStats.totalPL > 0 
                ? "bg-[#e8f5e9] text-[#4caf50] dark:bg-emerald-500/20 dark:text-emerald-400" 
                : monthStats.totalPL < 0
                ? "bg-[#ffebee] text-[#f44336] dark:bg-rose-500/20 dark:text-rose-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {formatCurrency(monthStats.totalPL)}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                 <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </Button>
              <span className="text-base font-bold min-w-[120px] text-center">{format(currentDate, "MMMM yyyy")}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                 <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium text-foreground bg-[#f3f4f6] dark:bg-muted px-4 py-1.5 rounded-full">
                {monthStats.tradeDays} {monthStats.tradeDays === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="w-full mt-2">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2 sm:mb-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
              <div key={idx} className="text-center">
                 <div className="py-2.5 rounded-lg border border-[#e5e7eb] dark:border-border/50 bg-white dark:bg-muted/10 text-xs sm:text-sm font-semibold text-foreground shadow-sm">
                   {day}
                 </div>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className={`grid grid-cols-7 gap-2 sm:gap-3 transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {calendarDays.map((day) => {
              const dayStats = getDayStats(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const hasTrades = dayStats.count > 0;
              const isToday = isSameDay(day, new Date());
              
              let cellWrapperClass = "relative flex flex-col items-center justify-center rounded-lg transition-all duration-200 min-h-[100px] sm:min-h-[140px] md:min-h-[160px] ";
              
              if (!isCurrentMonth) {
                cellWrapperClass += "bg-white dark:bg-background border border-[#f3f4f6] dark:border-border/20 opacity-0 pointer-events-none"; // hidden if not current month to match zella style
              } else if (!hasTrades) {
                cellWrapperClass += "bg-[#f8f9fa] dark:bg-muted/10 border border-[#e5e7eb] dark:border-border/40 shadow-sm";
              } else {
                const colors = getCellColors(dayStats.totalPL);
                cellWrapperClass += `${colors.bg} ${colors.border} border shadow-sm hover:ring-2 hover:ring-offset-1 hover:ring-offset-background ${colors.hoverRing} cursor-pointer`;
              }

              return (
                <div key={day.toISOString()} className={cellWrapperClass}>
                   <span className={`absolute top-2 right-2.5 text-[13px] sm:text-sm ${
                     isToday 
                       ? 'flex items-center justify-center w-6 h-6 rounded-full bg-[#673ab7] text-white font-bold' 
                       : hasTrades 
                         ? getCellColors(dayStats.totalPL).dateColor 
                         : 'text-muted-foreground'
                   }`}>
                     {format(day, "d")}
                   </span>
                   
                   {hasTrades && isCurrentMonth && (() => {
                     const colors = getCellColors(dayStats.totalPL);
                     const winRate = ((dayStats.wins / dayStats.count) * 100).toFixed(1);
                     
                     return (
                       <div className="flex flex-col items-center justify-center gap-[2px] mt-4 px-1 text-center w-full">
                          <span className={`font-bold text-[13px] sm:text-[15px] lg:text-[17px] tracking-tight ${colors.text}`}>
                            {formatCurrency(dayStats.totalPL)}
                          </span>
                          <span className={`text-[10px] sm:text-[11px] font-medium ${colors.text} opacity-80`}>
                            {dayStats.count} {dayStats.count === 1 ? 'trade' : 'trades'}
                          </span>
                          <span className={`text-[10px] sm:text-[11px] font-medium ${colors.text} opacity-80 tabular-nums`}>
                            {winRate.endsWith('.0') ? winRate.slice(0, -2) : winRate}%
                          </span>
                       </div>
                     );
                   })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
