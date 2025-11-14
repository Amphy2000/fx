import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ModernGaugeChartProps {
  value: number;
  maxValue?: number;
  size?: number;
  showLabels?: boolean;
  greenLabel?: string;
  redLabel?: string;
  neutralLabel?: string;
}

export const ModernGaugeChart = ({ 
  value, 
  maxValue = 100, 
  size = 200,
  showLabels = true,
  greenLabel,
  redLabel,
  neutralLabel
}: ModernGaugeChartProps) => {
  const percentage = (value / maxValue) * 100;
  
  // Create gauge data
  const data = [
    { value: percentage, fill: 'url(#gaugeGradient)' },
    { value: 100 - percentage, fill: 'hsl(var(--muted))' }
  ];
  
  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 60) return 'hsl(var(--gauge-good))';
    if (percentage >= 40) return 'hsl(var(--gauge-warning))';
    return 'hsl(var(--gauge-danger))';
  };
  
  const getLabel = () => {
    if (percentage >= 60 && greenLabel) return greenLabel;
    if (percentage >= 40 && neutralLabel) return neutralLabel;
    if (redLabel) return redLabel;
    return '';
  };

  return (
    <div className="relative" style={{ width: size, height: size * 0.7 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={getColor()} stopOpacity={1} />
              <stop offset="100%" stopColor={getColor()} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="85%"
            startAngle={180}
            endAngle={0}
            innerRadius={size * 0.25}
            outerRadius={size * 0.35}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center value display */}
      <div className="absolute inset-0 flex items-end justify-center pb-2">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: getColor() }}>
            {value.toFixed(1)}%
          </div>
          {showLabels && getLabel() && (
            <div className="text-xs text-muted-foreground mt-1">{getLabel()}</div>
          )}
        </div>
      </div>
      
      {/* Labels on sides */}
      {showLabels && (
        <>
          <div className="absolute left-0 bottom-0 text-xs text-gauge-good font-medium">
            {greenLabel || maxValue}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 text-xs text-muted-foreground">
            {neutralLabel || '0'}
          </div>
          <div className="absolute right-0 bottom-0 text-xs text-gauge-danger font-medium">
            {redLabel || '0'}
          </div>
        </>
      )}
    </div>
  );
};
