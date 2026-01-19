import { Link } from 'react-router-dom';
import { Zap, Shield, Globe, ArrowRight, Code, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { useAuth } from '@/hooks/useAuth';
import scaledBotLogo from '@/assets/scaled-bot-logo.png';

const features = [
  {
    icon: Zap,
    title: 'Real-time Messaging',
    description: 'Instant communication with your website visitors using WebSocket technology.',
  },
  {
    icon: Users,
    title: 'Multi-Agent Support',
    description: 'Assign multiple agents to properties and manage team availability.',
  },
  {
    icon: Globe,
    title: 'Multi-Property',
    description: 'Manage chat widgets across multiple websites from one dashboard.',
  },
  {
    icon: Code,
    title: 'Easy Integration',
    description: 'Simple JavaScript snippet that works with any website or framework.',
  },
  {
    icon: Shield,
    title: 'Visitor Tracking',
    description: 'See visitor information, browsing history, and current page in real-time.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Ready',
    description: 'Built for future analytics, AI responses, and advanced features.',
  },
];

const Index = () => {
  const { user, isAdmin, isAgent, signOut } = useAuth();
  
  // Determine the correct dashboard route based on user role
  const getDashboardRoute = () => {
    if (isAgent) return '/conversations';
    if (isAdmin) return '/admin';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={scaledBotLogo} alt="Scaled Bot" className="h-9 w-9 rounded-lg" />
              <span className="font-bold text-xl text-foreground">Scaled Bot</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link to={getDashboardRoute()}>
                    <Button variant="ghost">Dashboard</Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin">
                      <Button variant="ghost">Admin</Button>
                    </Link>
                  )}
                  <Button variant="outline" onClick={signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/widget-preview">
                    <Button variant="ghost">Widget Demo</Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="chat-gradient text-primary-foreground hover:opacity-90">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-accent/50 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Internal Live Chat Tool
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Connect with your visitors
              <span className="block text-primary">in real-time</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              A multi-tenant live chat system for your websites. Create properties, 
              assign agents, and start chatting with visitors instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={getDashboardRoute()}>
                <Button size="lg" className="chat-gradient text-primary-foreground hover:opacity-90 gap-2">
                  Open Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/widget-preview">
                <Button size="lg" variant="outline" className="gap-2">
                  <Code className="h-5 w-5" />
                  View Widget Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Built for scale</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to provide exceptional customer support across all your properties.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="bg-card p-6 rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Ready for the future</h2>
              <p className="text-lg text-muted-foreground">
                Built with a modular architecture to support upcoming features.
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  'AI Auto-responses',
                  'User Analytics',
                  'Browser Events',
                  'File Upload',
                  'Departments',
                  'Triggers',
                  'WhatsApp Integration',
                  'And more...'
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-2 w-2 rounded-full bg-primary/60" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={scaledBotLogo} alt="Scaled Bot" className="h-8 w-8 rounded-lg" />
              <span className="font-semibold text-foreground">Scaled Bot</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Internal tool for live customer support
            </p>
          </div>
        </div>
      </footer>

      {/* Demo Widget */}
      <ChatWidget />
    </div>
  );
};

export default Index;
