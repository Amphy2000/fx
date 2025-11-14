import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface ModernRadarChartProps {
  data: Array<{ metric: string; value: number; fullMark?: number }>;
  size?: number;
}

export const ModernRadarChart = ({ data, size = 300 }: ModernRadarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data}>
        <defs>
          <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <PolarGrid 
          stroke="hsl(var(--border))" 
          strokeWidth={1}
          gridType="polygon"
        />
        <PolarAngleAxis 
          dataKey="metric" 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          tickCount={6}
          axisLine={false}
        />
        <Radar
          name="Performance"
          dataKey="value"
          stroke="hsl(var(--chart-1))"
          fill="url(#radarGradient)"
          fillOpacity={0.7}
          strokeWidth={2}
          dot={{
            r: 4,
            fill: 'hsl(var(--chart-1))',
            strokeWidth: 0,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
