import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface Trade {
  result: string;
  emotion_before: string | null;
  emotion_after: string | null;
  created_at: string;
}

interface EmotionalInsightsProps {
  trades: Trade[];
}

const COLORS = ['#d4af37', '#c9a22b', '#be951f', '#b38813', '#a87b07'];

const emotionEmojis: Record<string, string> = {
  calm: '😌',
  neutral: '😐',
  anxious: '😟',
  impatient: '😤',
  confident: '😎',
  satisfied: '😁',
  regretful: '😔',
  frustrated: '😤',
  content: '😌',
};

const EmotionalInsights = ({ trades }: EmotionalInsightsProps) => {
  // Filter trades with emotions
  const tradesWithEmotions = trades.filter(t => t.emotion_before || t.emotion_after);
  
  if (tradesWithEmotions.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            🧘 Emotional Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Start tracking your emotions before and after trades to see personalized insights here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Win rate by pre-trade emotion
  const emotionWinRates: Record<string, { wins: number; total: number }> = {};
  trades.forEach(trade => {
    if (trade.emotion_before && trade.result) {
      if (!emotionWinRates[trade.emotion_before]) {
        emotionWinRates[trade.emotion_before] = { wins: 0, total: 0 };
      }
      emotionWinRates[trade.emotion_before].total++;
      if (trade.result === 'win') {
        emotionWinRates[trade.emotion_before].wins++;
      }
    }
  });

  // Only include emotions with at least 2 trades for meaningful insights
  const winRateData = Object.entries(emotionWinRates)
    .filter(([_, stats]) => stats.total >= 2)
    .map(([emotion, stats]) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      emoji: emotionEmojis[emotion] || '',
      winRate: Math.round((stats.wins / stats.total) * 100),
      trades: stats.total,
    }));

  // Post-trade emotions for losses
  const lossEmotions: Record<string, number> = {};
  trades.forEach(trade => {
    if (trade.result === 'loss' && trade.emotion_after) {
      lossEmotions[trade.emotion_after] = (lossEmotions[trade.emotion_after] || 0) + 1;
    }
  });

  // Only show loss emotions if at least 3 losses recorded
  const losses = trades.filter(t => t.result === 'loss');
  const lossEmotionData = losses.length >= 3 
    ? Object.entries(lossEmotions).map(([emotion, count]) => ({
        name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        emoji: emotionEmojis[emotion] || '',
        value: count,
      }))
    : [];

  // Weekly emotional stability (last 4 weeks)
  const now = new Date();
  const weeklyData = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7 + 7));
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - (i * 7));

    const weekTrades = trades.filter(t => {
      const tradeDate = new Date(t.created_at);
      return tradeDate >= weekStart && tradeDate <= weekEnd;
    });

    const calmCount = weekTrades.filter(t => t.emotion_before === 'calm' || t.emotion_before === 'confident').length;
    const anxiousCount = weekTrades.filter(t => t.emotion_before === 'anxious' || t.emotion_before === 'impatient').length;
    const stability = weekTrades.length > 0 ? Math.round((calmCount / weekTrades.length) * 100) : 0;

    weeklyData.push({
      week: `W${4-i}`,
      stability,
      calm: calmCount,
      anxious: anxiousCount,
    });
  }

  // AI Insight
  const bestEmotion = winRateData.sort((a, b) => b.winRate - a.winRate)[0];
  const worstEmotion = winRateData.sort((a, b) => a.winRate - b.winRate)[0];

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            🧘 Emotional Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Reflection */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-primary">AI Reflection</p>
                {winRateData.length > 0 && bestEmotion && bestEmotion.trades >= 3 && (
                  <p className="text-foreground/80">
                    Your highest win rate ({bestEmotion.winRate}%) comes when feeling{' '}
                    <span className="font-semibold">{bestEmotion.emotion}</span> across {bestEmotion.trades} trades.
                    This is your optimal trading mindset.
                  </p>
                )}
                {winRateData.length > 1 && worstEmotion && worstEmotion.trades >= 2 && worstEmotion.winRate < 40 && (
                  <p className="text-destructive">
                    Trading while {worstEmotion.emotion} has led to a{' '}
                    {worstEmotion.winRate}% win rate across {worstEmotion.trades} trades.
                    Consider avoiding trades when feeling this way.
                  </p>
                )}
                {lossEmotionData.length > 0 && (
                  <p className="text-foreground/80">
                    After losses, you most commonly feel <span className="font-semibold">{lossEmotionData[0].name}</span>.
                    {lossEmotionData[0].name.toLowerCase().includes('angry') || 
                     lossEmotionData[0].name.toLowerCase().includes('frustrated')
                      ? ' Take a break before your next trade to avoid revenge trading.'
                      : ' Acknowledging this emotion helps you stay disciplined.'}
                  </p>
                )}
                {weeklyData.length > 2 && weeklyData.some(d => d.stability < 50) && (
                  <p className="text-warning">
                    Your pre-trade emotional state varies significantly week-to-week.
                    Establishing a consistent pre-trade routine may improve your results.
                  </p>
                )}
                {winRateData.length === 0 && (
                  <p className="text-muted-foreground">
                    Record more trades with emotional data to receive personalized insights.
                    Aim for at least 2-3 trades per emotional state for meaningful patterns.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate by Emotion */}
            {winRateData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Win Rate by Pre-Trade Emotion</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={winRateData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
                    <XAxis 
                      dataKey="emotion" 
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                      tickFormatter={(value, index) => {
                        const data = winRateData[index];
                        return `${data?.emoji || ''} ${value}`;
                      }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      fontSize={11} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Win Rate %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 600 }}
                      formatter={(value: any, name: any, props: any) => {
                        const emoji = props.payload?.emoji || '';
                        return [`${value}% (${props.payload?.trades} trades)`, `${emoji} Win Rate`];
                      }}
                    />
                    <Bar 
                      dataKey="winRate" 
                      fill="url(#winRateGradient)" 
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                      animationBegin={0}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Loss Emotions Distribution */}
            {lossEmotionData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Post-Trade Emotions (Losses)</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <defs>
                      {lossEmotionData.map((_, index) => (
                        <linearGradient key={`gradient-${index}`} id={`pieGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                          <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={lossEmotionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, emoji, cx, cy, midAngle, innerRadius, outerRadius }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 25;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        const percentText = `${(percent * 100).toFixed(0)}%`;
                        
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="hsl(var(--foreground))" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            fontSize="11"
                            className="select-none"
                          >
                            {`${emoji} ${name} ${percentText}`}
                          </text>
                        );
                      }}
                      outerRadius={90}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                      animationDuration={800}
                      animationBegin={100}
                    >
                      {lossEmotionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#pieGradient${index})`}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any, name: any, props: any) => {
                        const emoji = props.payload?.emoji || '';
                        return [`${value} times`, `${emoji} ${name}`];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Weekly Emotional Stability */}
          {weeklyData.some(d => d.stability > 0) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Weekly Emotional Stability Trend</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="stabilityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="calmGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="anxiousGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                    <filter id="shadow">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    fontSize={11}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    fontSize={11} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                    iconType="circle"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stability" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Stability %" 
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, filter: 'url(#shadow)' }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    animationDuration={800}
                    fill="url(#stabilityGradient)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="calm" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={3}
                    name="Calm Trades" 
                    dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4, filter: 'url(#shadow)' }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    animationDuration={800}
                    animationBegin={100}
                    fill="url(#calmGradient)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="anxious" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={3}
                    name="Anxious Trades" 
                    dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4, filter: 'url(#shadow)' }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    animationDuration={800}
                    animationBegin={200}
                    fill="url(#anxiousGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmotionalInsights;
