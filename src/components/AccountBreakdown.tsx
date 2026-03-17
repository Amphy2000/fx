import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AccountBreakdownProps {
  trades: any[];
  accounts: any[];
}

export function AccountBreakdown({ trades, accounts }: AccountBreakdownProps) {
  if (accounts.length <= 1) return null;

  const accountStats = accounts
    .map((account) => {
      const accountTrades = trades.filter((trade) => trade.mt5_account_id === account.id);
      const totalPnL = accountTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
      const wins = accountTrades.filter((trade) => trade.result === "win").length;
      const winRate = accountTrades.length > 0 ? (wins / accountTrades.length) * 100 : 0;

      return {
        id: account.id,
        name: account.account_name || `${account.broker_name} ${account.account_number}`,
        broker: account.broker_name,
        totalPnL,
        trades: accountTrades.length,
        winRate,
        wins,
        losses: accountTrades.length - wins,
      };
    })
    .sort((a, b) => b.totalPnL - a.totalPnL);

  const totalPnL = accountStats.reduce((sum, account) => sum + account.totalPnL, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Connected account breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accountStats.map((account) => {
            const percentageOfTotal = totalPnL !== 0 ? (account.totalPnL / totalPnL) * 100 : 0;

            return (
              <div key={account.id} className="space-y-2 rounded-xl border bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.broker} • {account.trades} trades • {account.winRate.toFixed(1)}% WR
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${account.totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
                      {account.totalPnL >= 0 ? "+" : ""}${account.totalPnL.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.abs(percentageOfTotal).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={account.winRate} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                    {account.wins}W / {account.losses}L
                  </span>
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold">All connected accounts</p>
                <p className="text-xs text-muted-foreground">Combined performance overview</p>
              </div>
              <p className={`text-xl font-bold ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
                {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
