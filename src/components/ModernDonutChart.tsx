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
  showPercentage = true,
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
    <div className="w-full">
      <div className="relative mx-auto" style={{ width: Math.min(size, 250), height: Math.min(size, 250) }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={Math.min(size, 250) * innerRadiusRatio / 2}
              outerRadius={Math.min(size, 250) * 0.45}
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
      </div>
      
      {/* Legend below - Always show */}
      <div className="flex justify-center gap-3 mt-4 flex-wrap px-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">{item.name}</span>
              {showPercentage && (
                <span className="text-xs text-muted-foreground">
                  {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
