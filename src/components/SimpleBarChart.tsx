import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface SimpleBarChartProps {
  data: Array<{ name: string; value: number }>;
  color?: string;
}

export const SimpleBarChart = ({ data, color = "hsl(var(--chart-1))" }: SimpleBarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} barSize={40}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          stroke="hsl(var(--foreground))"
          fontSize={11}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          angle={-15}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          stroke="hsl(var(--foreground))"
          fontSize={11}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [`${value}%`, 'Win Rate']}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={color}
              opacity={0.8 + (index * 0.05)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};