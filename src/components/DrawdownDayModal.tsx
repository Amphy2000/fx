import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Trade {
  id: string;
  pair: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  volume: number;
  profit_loss: number;
  r_multiple: number;
  open_time: string;
  close_time: string;
}

interface DrawdownDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  trades: Trade[];
  drawdownPercent: number;
  drawdownAmount: number;
  peakValue: number;
  troughValue: number;
  recoveryDays: number | null;
}

export const DrawdownDayModal = ({
  open,
  onOpenChange,
  date,
  trades,
  drawdownPercent,
  drawdownAmount,
  peakValue,
  troughValue,
  recoveryDays
}: DrawdownDayModalProps) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{formattedDate}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Drawdown Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-xs text-muted-foreground uppercase">Drawdown %</p>
              <p className="text-xl font-bold text-destructive">{drawdownPercent.toFixed(2)}%</p>
            </div>
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-xs text-muted-foreground uppercase">Drawdown $</p>
              <p className="text-xl font-bold text-destructive">${drawdownAmount.toFixed(2)}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground uppercase">Peak → Trough</p>
              <p className="text-sm font-bold">${peakValue.toFixed(2)} → ${troughValue.toFixed(2)}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground uppercase">Recovery Time</p>
              <p className="text-xl font-bold">
                {recoveryDays === null ? 'Ongoing' : recoveryDays === 0 ? 'Same Day' : `${recoveryDays} days`}
              </p>
            </div>
          </div>

          {/* Trades Table */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Trades ({trades.length})</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>Lot Size</TableHead>
                    <TableHead>R-Multiple</TableHead>
                    <TableHead>P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.pair}</TableCell>
                      <TableCell>
                        <Badge variant={trade.direction === 'BUY' ? 'default' : 'secondary'}>
                          {trade.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.entry_price?.toFixed(5) || 'N/A'}</TableCell>
                      <TableCell>{trade.exit_price?.toFixed(5) || 'N/A'}</TableCell>
                      <TableCell>{trade.volume?.toFixed(2) || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={trade.r_multiple >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {trade.r_multiple?.toFixed(2) || 'N/A'}R
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {trade.profit_loss >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={trade.profit_loss >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            ${trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
