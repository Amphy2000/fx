import { useState } from "react";
import { Layout } from "@/components/Layout";
import { TradeScreenshotBatchUpload } from "@/components/TradeScreenshotBatchUpload";
import { PatternsDashboard } from "@/components/PatternsDashboard";
import { BehavioralAlerts } from "@/components/BehavioralAlerts";
import { TradingAssistantChat } from "@/components/TradingAssistantChat";
import { StandaloneVoiceLogger } from "@/components/StandaloneVoiceLogger";
import { JournalInsightsPanel } from "@/components/JournalInsightsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Camera, TrendingUp, MessageSquare, Mic, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";

const AIFeatures = () => {
  const [activeTab, setActiveTab] = useState("screenshots");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Brain className="w-8 h-8 text-primary" />
            AI-Powered Trading Features
          </h1>
          <p className="text-muted-foreground">
            Advanced AI analysis to improve your trading performance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 h-auto p-1">
                <TabsTrigger value="screenshots" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
                  <Camera className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  <span className="truncate">Screenshots</span>
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
                  <Mic className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  <span className="truncate">Voice</span>
                </TabsTrigger>
                <TabsTrigger value="patterns" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  <span className="truncate">Patterns</span>
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
                  <Brain className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  <span className="truncate">Behavior</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
                  <Lightbulb className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  <span className="truncate">Insights</span>
                </TabsTrigger>
                <TabsTrigger value="assistant" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
                  <MessageSquare className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  <span className="truncate">Assistant</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="screenshots">
                <TradeScreenshotBatchUpload />
              </TabsContent>

              <TabsContent value="voice">
                <StandaloneVoiceLogger />
              </TabsContent>

              <TabsContent value="patterns">
                <PatternsDashboard />
              </TabsContent>

              <TabsContent value="behavior">
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <h3>Emotional Trading Detection</h3>
                    <p>
                      Our AI monitors your trading behavior in real-time to detect:
                    </p>
                    <ul>
                      <li><strong>Revenge Trading:</strong> Quick trades after losses with increased lot sizes</li>
                      <li><strong>Overtrading:</strong> Taking too many trades in a short period</li>
                      <li><strong>Lot Size Escalation:</strong> Progressive increase in position sizes</li>
                      <li><strong>FOMO Trading:</strong> Entering trades outside your strategy</li>
                    </ul>
                  </div>
                  <BehavioralAlerts />
                </div>
              </TabsContent>

              <TabsContent value="insights">
                <JournalInsightsPanel />
              </TabsContent>

              <TabsContent value="assistant">
                <TradingAssistantChat />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Card 
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setActiveTab("screenshots")}
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Camera className="w-4 h-4 text-primary" />
                    Screenshot Upload
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload multiple screenshots - AI extracts all trade data automatically
                  </p>
                </Card>

                <Card 
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setActiveTab("voice")}
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Mic className="w-4 h-4 text-primary" />
                    Voice Logging
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Speak your trade details - AI saves everything automatically
                  </p>
                </Card>

                <Card 
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setActiveTab("patterns")}
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Pattern Analysis
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Discovers winning/losing patterns across pairs, times, and sessions
                  </p>
                </Card>

                <Card 
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setActiveTab("behavior")}
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Brain className="w-4 h-4 text-primary" />
                    Behavioral Detection
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Identifies revenge trading, overtrading, and emotional decisions
                  </p>
                </Card>

                <Card 
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setActiveTab("assistant")}
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Trading Assistant
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ask for second opinions on setups, get risk management advice
                  </p>
                </Card>

                <Card 
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setActiveTab("insights")}
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Emotional Insights
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Analyzes how your emotions correlate with trading performance
                  </p>
                </Card>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">💎 AI Credits</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Screenshot extraction:</span>
                  <span className="font-medium">10 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Voice logging:</span>
                  <span className="font-medium">1 credit</span>
                </div>
                <div className="flex justify-between">
                  <span>Pattern analysis:</span>
                  <span className="font-medium">3 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Chat message:</span>
                  <span className="font-medium">5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Behavior detection:</span>
                  <span className="font-medium">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Emotional insights:</span>
                  <span className="font-medium">5 credits</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AIFeatures;
