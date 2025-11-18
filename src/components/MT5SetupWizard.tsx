import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, FolderOpen, Upload, Play, Link2, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    id: 1,
    title: "Download EA",
    icon: Download,
    description: "Get the Expert Advisor file",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download our pre-configured Expert Advisor that will automatically sync your trades.
        </p>
        <Button size="lg" className="w-full" asChild>
          <a href="/MT5_Trade_Sync_EA.mq5" download>
            <Download className="h-5 w-5 mr-2" />
            Download MT5_Trade_Sync_EA.mq5
          </a>
        </Button>
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Save this file somewhere easy to find (like your Downloads folder)
          </AlertDescription>
        </Alert>
      </div>
    ),
  },
  {
    id: 2,
    title: "Open Data Folder",
    icon: FolderOpen,
    description: "Navigate to MT5 Experts folder",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Find the Expert Advisors folder in your MT5 installation.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="font-semibold text-sm">In MetaTrader 5:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click <Badge variant="secondary">File</Badge> → <Badge variant="secondary">Open Data Folder</Badge></li>
            <li>Open <Badge variant="secondary">MQL5</Badge> folder</li>
            <li>Open <Badge variant="secondary">Experts</Badge> folder</li>
          </ol>
        </div>
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            You should see a folder that may contain other EA files
          </AlertDescription>
        </Alert>
      </div>
    ),
  },
  {
    id: 3,
    title: "Install EA",
    icon: Upload,
    description: "Copy EA file to Experts folder",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copy the downloaded EA file into the Experts folder and restart MT5.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Find the downloaded <code className="text-xs bg-background px-2 py-1 rounded">MT5_Trade_Sync_EA.mq5</code></li>
            <li>Copy it into the <Badge variant="secondary">Experts</Badge> folder</li>
            <li>Close MT5 completely</li>
            <li>Restart MetaTrader 5</li>
          </ol>
        </div>
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            After restart, the EA will appear in Navigator under "Expert Advisors"
          </AlertDescription>
        </Alert>
      </div>
    ),
  },
  {
    id: 4,
    title: "Activate EA",
    icon: Play,
    description: "Drag EA onto chart",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Activate the EA by dragging it onto any chart.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Press <kbd className="px-2 py-1 text-xs bg-background border rounded">Ctrl+N</kbd> to open Navigator</li>
            <li>Expand <Badge variant="secondary">Expert Advisors</Badge></li>
            <li>Find <code className="text-xs bg-background px-2 py-1 rounded">MT5_Trade_Sync_EA</code></li>
            <li>Drag it onto any chart</li>
          </ol>
        </div>
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            A settings window will appear - keep it open for the next step!
          </AlertDescription>
        </Alert>
      </div>
    ),
  },
  {
    id: 5,
    title: "Configure",
    icon: Link2,
    description: "Add your API key",
    content: (
      <div className="space-y-4">
        <Alert className="bg-primary/5 border-primary">
          <AlertDescription>
            <strong>Get your API key:</strong> Go to{" "}
            <a href="/integrations" className="underline font-semibold">Integrations page</a> 
            {" "}and copy your API key
          </AlertDescription>
        </Alert>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="font-semibold text-sm">In the EA settings:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to <Badge variant="secondary">Inputs</Badge> tab</li>
            <li>Find <code className="text-xs bg-background px-2 py-1 rounded">API_KEY</code></li>
            <li>Paste your API key</li>
            <li>Check ✓ <Badge variant="secondary">Allow Algo Trading</Badge></li>
            <li>Click <Badge variant="default">OK</Badge></li>
          </ol>
        </div>
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Look for 😊 in the chart's top-right corner - the EA is now active!
          </AlertDescription>
        </Alert>
        <Button size="lg" className="w-full" asChild>
          <a href="/integrations">
            Go to Integrations Page
          </a>
        </Button>
      </div>
    ),
  },
];

export const MT5SetupWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Interactive Setup Wizard
          </CardTitle>
          <Badge variant="outline">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>

        <div className="min-h-[300px]">
          {step.content}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button asChild>
              <a href="/integrations">
                Complete Setup
                <CheckCircle className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
