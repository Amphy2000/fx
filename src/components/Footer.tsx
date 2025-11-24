import { Link } from "react-router-dom";
import { Brain, Twitter, Linkedin, Send } from "lucide-react";
export const Footer = () => {
  return <footer className="border-t border-border/50 bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Amphy AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Master your trading psychology with AI-powered insights
            </p>
            <div className="flex items-center gap-3">
              <a href="https://x.com/amphyfx" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://www.linkedin.com/in/amphyfx" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://t.me/amphyfxacademy" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors" aria-label="Telegram Channel">
                <Send className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/guides" className="text-muted-foreground hover:text-foreground transition-colors">
                  Guides
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/psychology-guide" className="text-muted-foreground hover:text-foreground transition-colors">
                  Psychology Guide
                </Link>
              </li>
              <li>
                <Link to="/install" className="text-muted-foreground hover:text-foreground transition-colors">
                  Install App
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Amphy AI. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Made with ❤️ for traders who want to master their psychology
            </p>
          </div>
        </div>
      </div>
    </footer>;
};