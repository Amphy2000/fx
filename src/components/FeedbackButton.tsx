import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";

export const FeedbackButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 rounded-full shadow-lg z-50 h-14 w-14 md:h-auto md:w-auto md:px-4"
        size="icon"
      >
        <MessageSquare className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">Feedback</span>
      </Button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
};
