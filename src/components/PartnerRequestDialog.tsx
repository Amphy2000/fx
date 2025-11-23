import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PartnerRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  onSend: (message: string) => void;
}

export default function PartnerRequestDialog({
  open,
  onOpenChange,
  partnerName,
  onSend
}: PartnerRequestDialogProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    onSend(message);
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Partnership Request</DialogTitle>
          <DialogDescription>
            Send a request to {partnerName} to become accountability partners
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Hi! I'd love to be accountability partners. I think we have similar goals..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend}>
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
