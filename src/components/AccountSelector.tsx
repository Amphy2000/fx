import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface AccountSelectorProps {
  accounts: any[];
  selectedAccountId: string | null;
  onAccountChange: (accountId: string | null) => void;
}

export function AccountSelector({ accounts, selectedAccountId, onAccountChange }: AccountSelectorProps) {
  if (accounts.length === 0) return null;

  return (
    <Select 
      value={selectedAccountId || "all"} 
      onValueChange={(value) => onAccountChange(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-[200px]">
        <Building2 className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Accounts</SelectItem>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.account_name || `${account.broker_name} ${account.account_number}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
