import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ModernDonutChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  size?: number;
  innerRadiusRatio?: number;
  showPercentage?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
}

export const ModernDonutChart = ({ 
  data, 
  size = 200,
  innerRadiusRatio = 0.65,
  showPercentage = false,
  centerLabel,
  centerValue
}: ModernDonutChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const COLORS = [
    'hsl(var(--gauge-good))',
    'hsl(var(--gauge-danger))',
    'hsl(var(--chart-1))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * innerRadiusRatio / 2}
            outerRadius={size * 0.45}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {centerValue !== undefined && (
            <div className="text-2xl font-bold text-foreground">
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div className="text-xs text-muted-foreground mt-1">
              {centerLabel}
            </div>
          )}
        </div>
      </div>
      
      {/* Legend below */}
      {showPercentage && (
        <div className="flex justify-center gap-4 mt-2 flex-wrap">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-muted-foreground">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
