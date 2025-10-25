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

  const winRateData = Object.entries(emotionWinRates).map(([emotion, stats]) => ({
    emotion: `${emotionEmojis[emotion] || ''} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`,
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

  const lossEmotionData = Object.entries(lossEmotions).map(([emotion, count]) => ({
    name: `${emotionEmojis[emotion] || ''} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`,
    value: count,
  }));

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
                {bestEmotion && (
                  <p className="text-foreground/80">
                    You perform best when feeling <span className="font-semibold">{bestEmotion.emotion}</span> ({bestEmotion.winRate}% win rate).
                  </p>
                )}
                {worstEmotion && worstEmotion.winRate < 50 && (
                  <p className="text-foreground/80">
                    Losses often occur when <span className="font-semibold">{worstEmotion.emotion}</span> — consider pausing trading on stressful days.
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
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={winRateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="emotion" tick={{ fill: '#999', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#999', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#d4af37' }}
                    />
                    <Bar dataKey="winRate" fill="#d4af37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Loss Emotions Distribution */}
            {lossEmotionData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Post-Trade Emotions (Losses)</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={lossEmotionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {lossEmotionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
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
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="week" tick={{ fill: '#999', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#999', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    labelStyle={{ color: '#d4af37' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="stability" stroke="#d4af37" strokeWidth={2} name="Stability %" />
                  <Line type="monotone" dataKey="calm" stroke="#4ade80" strokeWidth={2} name="Calm Trades" />
                  <Line type="monotone" dataKey="anxious" stroke="#f87171" strokeWidth={2} name="Anxious Trades" />
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
