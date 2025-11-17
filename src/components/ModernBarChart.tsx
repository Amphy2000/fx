import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface MonthlyData {
  month: string;
  pnl: number;
  trades: number;
}

interface ModernBarChartProps {
  data: MonthlyData[];
  title?: string;
}

export const ModernBarChart = ({ data, title = "Monthly Performance" }: ModernBarChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--foreground))"
              fontSize={11}
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
              fontSize={11}
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(0 0% 100%)',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'P/L']}
              labelStyle={{ color: 'hsl(0 0% 100%)' }}
              itemStyle={{ color: 'hsl(0 0% 100%)' }}
            />
            <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.pnl >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
