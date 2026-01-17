import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Mic,
  MessageSquare,
  X,
  TrendingUp,
  Sparkles,
  Users
} from "lucide-react";
import { GlobalVoiceAssistant } from "./GlobalVoiceAssistant";
import { FeedbackModal } from "./FeedbackModal";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { QuickTradeCapture } from "./QuickTradeCapture";

export const FloatingActionMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);

  if (location.pathname === "/bundle") return null;

  const quickActions = [
    {
      icon: Mic,
      label: "Voice Assistant",
      action: () => {
        setShowVoiceAssistant(true);
        setIsOpen(false);
      },
      color: "bg-primary hover:bg-primary/90",
      component: "voice"
    },
    {
      icon: TrendingUp,
      label: "Quick Log",
      action: () => {
        setShowQuickLog(true);
        setIsOpen(false);
      },
      color: "bg-green-600 hover:bg-green-700"
    },
    {
      icon: Sparkles,
      label: "AI Setup Analyzer",
      action: () => {
        navigate("/ai-setup-analyzer");
        setIsOpen(false);
      },
      color: "bg-orange-600 hover:bg-orange-700"
    },
    {
      icon: Users,
      label: "Partners",
      action: () => {
        navigate("/accountability-partners");
        setIsOpen(false);
      },
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      icon: MessageSquare,
      label: "Feedback",
      action: () => {
        setShowFeedback(true);
        setIsOpen(false);
      },
      color: "bg-purple-600 hover:bg-purple-700",
      component: null
    }
  ];

  return (
    <>
      {/* Main FAB Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-transform"
        style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>

      {/* Action Buttons */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-50">
          {quickActions.map((action, index) => (
            <div
              key={action.label}
              className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium shadow-md whitespace-nowrap">
                {action.label}
              </span>
              <Button
                onClick={action.action}
                size="icon"
                className={`h-12 w-12 rounded-full shadow-lg ${action.color}`}
              >
                <action.icon className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Modals */}
      <GlobalVoiceAssistant isOpen={showVoiceAssistant} onOpenChange={setShowVoiceAssistant} />
      <FeedbackModal open={showFeedback} onOpenChange={setShowFeedback} />
      <QuickTradeCapture
        isOpenExternal={showQuickLog}
        onOpenChangeExternal={setShowQuickLog}
        onTradeAdded={() => {
          setShowQuickLog(false);
          // Data refresh is handled by the page where this is rendered
        }}
      />
    </>
  );
};
