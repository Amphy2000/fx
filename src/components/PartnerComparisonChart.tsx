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
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
          <CardDescription>
            How you stack up against your accountability partner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Your Average</p>
              <p className="text-3xl font-bold">{userAvg.toFixed(1)}%</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-6 w-6 ${
                  difference > 5 ? 'text-green-500' : 
                  difference < -5 ? 'text-red-500' : 
                  'text-muted-foreground'
                }`} />
                <Badge variant={
                  difference > 5 ? 'default' : 
                  difference < -5 ? 'destructive' : 
                  'secondary'
                }>
                  {Math.abs(difference).toFixed(1)}% {
                    difference > 0 ? 'ahead' : 
                    difference < 0 ? 'behind' : 
                    'tied'
                  }
                </Badge>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Partner Average</p>
              <p className="text-3xl font-bold">{partnerAvg.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Rate Over Time</CardTitle>
          <CardDescription>Track your progress together</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="You_rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="You"
              />
              <Line
                type="monotone"
                dataKey="Partner_rate"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                name="Partner"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Goals Completed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Goals Completed</CardTitle>
          <CardDescription>Daily goal completion comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="You_completed" fill="hsl(var(--primary))" name="You" />
              <Bar dataKey="Partner_completed" fill="hsl(var(--secondary))" name="Partner" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}