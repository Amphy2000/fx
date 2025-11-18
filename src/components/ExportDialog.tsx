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
import { CalendarIcon, Download, FileText, Table } from "lucide-react";
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

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      console.log('Starting PDF export with dates:', { startDate, endDate });
      
      const { data, error } = await supabase.functions.invoke('export-pdf', {
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      if (error) {
        console.error('PDF export error:', error);
        throw error;
      }

      if (!data?.html) {
        throw new Error('No HTML data received from server');
      }

      console.log('PDF data received, HTML length:', data.html.length);

      // Validate HTML content
      if (data.html.length < 100) {
        throw new Error('Invalid HTML received - content too short');
      }

      console.log('Creating PDF container...');

      // Create a temporary container
      const container = document.createElement('div');
      container.innerHTML = data.html;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.padding = '20px';
      container.style.backgroundColor = 'white';
      container.style.color = 'black';
      container.style.width = '210mm';
      document.body.appendChild(container);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Starting PDF generation with html2pdf...');

      // Use html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 10,
        filename: data.fileName || `trading-report-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as const }
      };

      console.log('Starting PDF generation...');
      
      // Add timeout to PDF generation
      const pdfPromise = html2pdf().set(opt).from(container).save();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF generation timed out after 30 seconds')), 30000)
      );
      
      await Promise.race([pdfPromise, timeoutPromise]);
      
      console.log('PDF generation complete');

      // Clean up
      document.body.removeChild(container);

      toast.success("PDF exported successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error('PDF Export failed:', error);
      toast.error(error.message || "Failed to export PDF. Please try a smaller date range.");
    } finally {
      setIsExporting(false);
    }
  };

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
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <FileText className="h-6 w-6" />
                <span className="text-xs">PDF Report</span>
              </Button>
              <Button
                onClick={() => handleExportCSV('trades')}
                disabled={isExporting}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Table className="h-6 w-6" />
                <span className="text-xs">Trades CSV</span>
              </Button>
              <Button
                onClick={() => handleExportCSV('analytics')}
                disabled={isExporting}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Download className="h-6 w-6" />
                <span className="text-xs">Analytics CSV</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
