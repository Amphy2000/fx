import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AccountBreakdownProps {
  trades: any[];
  accounts: any[];
}

export function AccountBreakdown({ trades, accounts }: AccountBreakdownProps) {
  if (accounts.length <= 1) return null;

  // Calculate stats per account
  const accountStats = accounts.map(account => {
    const accountTrades = trades.filter(t => t.mt5_account_id === account.id);
    const totalPnL = accountTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const wins = accountTrades.filter(t => t.result === "win").length;
    const winRate = accountTrades.length > 0 ? (wins / accountTrades.length) * 100 : 0;

    return {
      id: account.id,
      name: account.account_name || `${account.broker_name} ${account.account_number}`,
      broker: account.broker_name,
      totalPnL,
      trades: accountTrades.length,
      winRate,
      wins,
      losses: accountTrades.length - wins
    };
  });

  // Calculate totals
  const totalPnL = accountStats.reduce((sum, acc) => sum + acc.totalPnL, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Account Performance Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accountStats.map((account) => {
            const percentageOfTotal = totalPnL !== 0 ? (account.totalPnL / totalPnL) * 100 : 0;
            
            return (
              <div key={account.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.broker} • {account.trades} trades • {account.winRate.toFixed(1)}% WR
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${account.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${account.totalPnL >= 0 ? '+' : ''}{account.totalPnL.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.abs(percentageOfTotal).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={account.winRate} 
                    className="h-2 flex-1"
                  />
                  <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                    {account.wins}W / {account.losses}L
                  </span>
                </div>
              </div>
            );
          })}
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="font-bold">Total Across All Accounts</p>
              <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
