import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Marcus T.",
    role: "Forex Trader",
    avatar: "MT",
    rating: 5,
    text: "The AI interceptor stopped me from revenge trading after 3 losses. Saved me $2,400 in one session. This isn't just a journal - it's a psychological safety net."
  },
  {
    name: "Sarah L.",
    role: "Day Trader",
    avatar: "SL",
    rating: 5,
    text: "I was skeptical about 'psychology-first' until I saw the mental state correlation dashboard. My win rate is 73% when I sleep 7+ hours vs 42% with less sleep. Data doesn't lie."
  },
  {
    name: "James K.",
    role: "Prop Trader",
    avatar: "JK",
    rating: 5,
    text: "Voice logging is a game-changer. I log 20+ trades a day and it takes seconds per trade. Finally consistent with my journaling after 3 years of failed attempts."
  },
  {
    name: "Elena R.",
    role: "Swing Trader",
    avatar: "ER",
    rating: 5,
    text: "The AI coach identified that I overtrade on Mondays after losing weekends. 85% of my losses were from this pattern I never noticed. Changed my entire approach."
  },
  {
    name: "David M.",
    role: "Crypto Trader",
    avatar: "DM",
    rating: 5,
    text: "Check-in feature showed me that trading while stressed (7+/10) drops my win rate by 35%. Now I have data-driven rules: no trading above 6 stress. Game over."
  },
  {
    name: "Priya S.",
    role: "Options Trader",
    avatar: "PS",
    rating: 5,
    text: "Most journals focus on technical analysis. This focuses on what actually matters - me. My emotional patterns, my triggers, my behavioral loops. Finally making real progress."
  }
];

export const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Traders Using Psychology to Win
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Real results from traders who prioritized their mental game
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  
                  <p className="text-sm text-foreground leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  
                  <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-semibold">4.9/5 from 10,000+ traders</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};