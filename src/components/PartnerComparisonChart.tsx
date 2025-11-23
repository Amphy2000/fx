import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PartnerComparisonChartProps {
  snapshots: any[];
  partnership: any;
  currentUserId: string;
}

export default function PartnerComparisonChart({
  snapshots,
  partnership,
  currentUserId,
}: PartnerComparisonChartProps) {
  // Prepare data for charts
  const chartData = snapshots.reduce((acc: any[], snapshot) => {
    const date = new Date(snapshot.snapshot_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const existingDate = acc.find(item => item.date === date);
    const isCurrentUser = snapshot.user_id === currentUserId;
    const label = isCurrentUser ? 'You' : 'Partner';

    if (existingDate) {
      existingDate[`${label}_completed`] = snapshot.goals_completed;
      existingDate[`${label}_rate`] = parseFloat(snapshot.completion_rate);
    } else {
      acc.push({
        date,
        [`${label}_completed`]: snapshot.goals_completed,
        [`${label}_rate`]: parseFloat(snapshot.completion_rate),
      });
    }

    return acc;
  }, []);

  // Calculate comparison stats
  const userSnapshots = snapshots.filter(s => s.user_id === currentUserId);
  const partnerSnapshots = snapshots.filter(s => s.user_id !== currentUserId);

  const userAvg = userSnapshots.length > 0
    ? userSnapshots.reduce((sum, s) => sum + parseFloat(s.completion_rate), 0) / userSnapshots.length
    : 0;

  const partnerAvg = partnerSnapshots.length > 0
    ? partnerSnapshots.reduce((sum, s) => sum + parseFloat(s.completion_rate), 0) / partnerSnapshots.length
    : 0;

  const difference = userAvg - partnerAvg;
  const TrendIcon = difference > 5 ? TrendingUp : difference < -5 ? TrendingDown : Minus;

  return (
    <div className="space-y-6">
      {/* Comparison Summary */}
      <Card className="shadow-lg border-primary/10 bg-gradient-to-br from-background via-primary/5 to-background">
        <CardHeader>
          <CardTitle className="text-xl">Performance Comparison</CardTitle>
          <CardDescription>
            How you stack up against your accountability partner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground mb-3">Your Average</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {userAvg.toFixed(1)}%
              </p>
            </div>
            <div className="flex items-center justify-center p-4">
              <div className="flex flex-col items-center gap-3">
                <TrendIcon className={`h-8 w-8 ${
                  difference > 5 ? 'text-green-500' : 
                  difference < -5 ? 'text-red-500' : 
                  'text-muted-foreground'
                }`} />
                <Badge 
                  variant={
                    difference > 5 ? 'default' : 
                    difference < -5 ? 'destructive' : 
                    'secondary'
                  }
                  className="text-sm font-semibold px-4 py-1"
                >
                  {Math.abs(difference).toFixed(1)}% {
                    difference > 0 ? 'ahead' : 
                    difference < 0 ? 'behind' : 
                    'tied'
                  }
                </Badge>
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
              <p className="text-sm font-medium text-muted-foreground mb-3">Partner Average</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-secondary to-secondary/70 bg-clip-text text-transparent">
                {partnerAvg.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Rate Trend */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <CardTitle>Completion Rate Over Time</CardTitle>
          <CardDescription>Track your progress together</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>No data available for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="You_rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  name="You"
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Partner_rate"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={3}
                  name="Partner"
                  dot={{ fill: 'hsl(var(--secondary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Goals Completed Comparison */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <CardTitle>Goals Completed</CardTitle>
          <CardDescription>Daily goal completion comparison</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>No data available for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar 
                  dataKey="You_completed" 
                  fill="hsl(var(--primary))" 
                  name="You" 
                  radius={[8, 8, 0, 0]}
                />
                <Bar 
                  dataKey="Partner_completed" 
                  fill="hsl(var(--secondary))" 
                  name="Partner" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}