import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import scaledBotLogo from '@/assets/scaled-bot-logo.png';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createProperty, properties, loading: dataLoading } = useConversations();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Extract domain from URL
  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.replace('www.', '').split('/')[0];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setIsCreating(true);
    const domain = extractDomain(websiteUrl);
    const name = propertyName.trim() || domain;
    
    const property = await createProperty(name, domain);
    setIsCreating(false);

    if (property) {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    // If the user already has websites, onboarding should never block them.
    if (!authLoading && user && !dataLoading && properties.length > 0) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, dataLoading, properties.length, navigate]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={scaledBotLogo} alt="Scaled Bot" className="h-12 w-12 rounded-xl" />
            <h1 className="text-3xl font-bold text-foreground">Scaled Bot</h1>
          </div>
          <p className="text-muted-foreground">Let's get your website set up</p>
        </div>

        {/* Main Card */}
        <Card className="border-border/50 shadow-elegant">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Add Your Website</CardTitle>
            <CardDescription>
              Enter your website URL to get started with your chat widget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="text"
                  placeholder="yourwebsite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="h-11"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the domain where you'll install the chat widget
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyName">Property Name (optional)</Label>
                <Input
                  id="propertyName"
                  type="text"
                  placeholder={websiteUrl ? extractDomain(websiteUrl) : 'My Website'}
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  A friendly name to identify this website in your dashboard
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={!websiteUrl.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Continue to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                disabled={isCreating}
                onClick={() => navigate('/dashboard')}
              >
                Skip for now
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground">
          You can add more websites later from your settings
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
