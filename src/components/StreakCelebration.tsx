import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import { Flame, Trophy, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StreakCelebrationProps {
  streakCount: number;
  type: "daily" | "weekly" | "achievement";
  message: string;
  onClose: () => void;
}

export const StreakCelebration = ({ streakCount, type, message, onClose }: StreakCelebrationProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Trigger confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Auto close after 5 seconds
    const timeout = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case "daily":
        return <Flame className="h-16 w-16 text-orange-500" />;
      case "weekly":
        return <Target className="h-16 w-16 text-primary" />;
      case "achievement":
        return <Trophy className="h-16 w-16 text-yellow-500" />;
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          className="fixed bottom-8 right-8 z-[9998]"
        >
          <Card className="p-6 bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/50 shadow-2xl max-w-sm">
            <div className="flex flex-col items-center text-center space-y-4">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 0.5,
                  repeat: 2
                }}
              >
                {getIcon()}
              </motion.div>
              
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {streakCount} {type === "daily" ? "Day" : type === "weekly" ? "Week" : ""} Streak! 🔥
                </h3>
                <p className="text-muted-foreground">
                  {message}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};