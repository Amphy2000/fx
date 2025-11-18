import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Table } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportDialog = ({ open, onOpenChange }: ExportDialogProps) => {
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async (type: 'trades' | 'analytics') => {
    setIsExporting(true);
    try {
      console.log('Starting CSV export:', { type, startDate, endDate });
      
      const { data, error } = await supabase.functions.invoke('export-csv', {
        body: {
          type,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      if (error) {
        console.error('CSV export error:', error);
        throw error;
      }

      if (!data?.csv) {
        throw new Error('No CSV data received from server');
      }

      console.log('CSV data received, length:', data.csv.length);

      // Create and download
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || `export-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`${type === 'trades' ? 'Trades' : 'Analytics'} exported successfully!`);
      onOpenChange(false);
    } catch (error: any) {
      console.error('CSV Export failed:', error);
      toast.error(error.message || "Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Trading Data</DialogTitle>
          <DialogDescription>
            Select a date range and choose your export format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  disabled={(date) => date > new Date() || date > endDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  disabled={(date) => date > new Date() || date < startDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="pt-4 space-y-2">
            <Label>Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleExportCSV('trades')}
                disabled={isExporting}
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
              >
                <Table className="h-8 w-8" />
                <span className="text-sm font-medium">Trades CSV</span>
                <span className="text-xs text-muted-foreground">Export all trade details</span>
              </Button>
              <Button
                onClick={() => handleExportCSV('analytics')}
                disabled={isExporting}
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
              >
                <Download className="h-8 w-8" />
                <span className="text-sm font-medium">Analytics CSV</span>
                <span className="text-xs text-muted-foreground">Export performance metrics</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
