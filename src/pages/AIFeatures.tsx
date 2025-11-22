import { Layout } from "@/components/Layout";
import { TradeScreenshotBatchUpload } from "@/components/TradeScreenshotBatchUpload";
import { PatternsDashboard } from "@/components/PatternsDashboard";
import { BehavioralAlerts } from "@/components/BehavioralAlerts";
import { TradingAssistantChat } from "@/components/TradingAssistantChat";
import { StandaloneVoiceLogger } from "@/components/StandaloneVoiceLogger";
import { JournalInsightsPanel } from "@/components/JournalInsightsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Camera, TrendingUp, MessageSquare, Mic, Lightbulb } from "lucide-react";

const AIFeatures = () => {

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
            <Tabs defaultValue="screenshots" className="space-y-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="screenshots" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Screenshots
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Voice
                </TabsTrigger>
                <TabsTrigger value="patterns" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Patterns
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Behavior
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="assistant" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Assistant
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
              <h3 className="font-semibold mb-3">How It Works</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Camera className="w-4 h-4 text-primary" />
                    Screenshot Upload
                  </div>
                  <p className="text-muted-foreground">
                    Upload multiple screenshots - AI extracts all trade data automatically
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Mic className="w-4 h-4 text-primary" />
                    Voice Logging
                  </div>
                  <p className="text-muted-foreground">
                    Speak your trade details - AI saves everything automatically
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Pattern Analysis
                  </div>
                  <p className="text-muted-foreground">
                    Discovers winning/losing patterns across pairs, times, and sessions
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Brain className="w-4 h-4 text-primary" />
                    Behavioral Detection
                  </div>
                  <p className="text-muted-foreground">
                    Identifies revenge trading, overtrading, and emotional decisions
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Trading Assistant
                  </div>
                  <p className="text-muted-foreground">
                    Ask for second opinions on setups, get risk management advice
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Emotional Insights
                  </div>
                  <p className="text-muted-foreground">
                    Analyzes how your emotions correlate with trading performance
                  </p>
                </div>
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
                  <span className="font-medium">5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Pattern analysis:</span>
                  <span className="font-medium">15 credits</span>
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
