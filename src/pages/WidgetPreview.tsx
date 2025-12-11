import { useState } from 'react';
import { Copy, Check, ArrowLeft, Code, Palette, Settings2, Globe, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

const colorPresets = [
  { name: 'Sage', color: 'hsl(150, 25%, 45%)' },
  { name: 'Slate', color: 'hsl(215, 20%, 50%)' },
  { name: 'Lavender', color: 'hsl(260, 25%, 55%)' },
  { name: 'Dusty Rose', color: 'hsl(350, 25%, 55%)' },
  { name: 'Warm Gray', color: 'hsl(30, 15%, 50%)' },
  { name: 'Ocean', color: 'hsl(190, 30%, 45%)' },
];

// Convert hex to HSL
const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
};

const WidgetPreview = () => {
  const [propertyId] = useState('demo-property-123');
  const [primaryColor, setPrimaryColor] = useState('hsl(150, 25%, 45%)');
  const [agentName, setAgentName] = useState('Support Team');
  const [greeting, setGreeting] = useState("Hi there! 👋 How can I help you today?");
  const [copied, setCopied] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const extractBrandColors = async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-brand-colors', {
        body: { url: websiteUrl }
      });

      if (error) throw error;

      if (data.success && data.branding) {
        const { primaryColor: extractedColor, colors } = data.branding;
        
        // Try to get the best color (primary > accent > first available)
        let colorToUse = extractedColor || colors?.primary || colors?.accent;
        
        if (colorToUse) {
          // Convert hex to HSL if needed
          if (colorToUse.startsWith('#')) {
            colorToUse = hexToHsl(colorToUse);
          }
          setPrimaryColor(colorToUse);
          toast.success('Brand colors extracted successfully!');
        } else {
          toast.error('Could not find brand colors on this website');
        }
      } else {
        toast.error(data.error || 'Failed to extract brand colors');
      }
    } catch (error) {
      console.error('Error extracting brand colors:', error);
      toast.error('Failed to extract brand colors from website');
    } finally {
      setIsExtracting(false);
    }
  };

  const widgetScript = `<!-- LiveChat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['LiveChat']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','lc','https://your-domain.com/widget.js'));
  lc('init', {
    propertyId: '${propertyId}',
    primaryColor: '${primaryColor}',
    agentName: '${agentName}',
    greeting: '${greeting}'
  });
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetScript);
    setCopied(true);
    toast.success('Widget code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">Widget Customization</h1>
                <p className="text-sm text-muted-foreground">Customize and embed your chat widget</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Settings */}
          <div className="space-y-6">
            <Tabs defaultValue="appearance">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="appearance" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appearance" className="mt-6 space-y-6">
                {/* Extract from Website */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Match Your Website
                    </CardTitle>
                    <CardDescription>
                      Paste your website URL to automatically extract brand colors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="flex-1"
                      />
                      <Button 
                        onClick={extractBrandColors} 
                        disabled={isExtracting}
                        variant="secondary"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          'Extract'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Brand Color */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Brand Color</CardTitle>
                    <CardDescription>Choose your primary widget color</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-6 gap-3 mb-4">
                      {colorPresets.map(preset => (
                        <button
                          key={preset.name}
                          onClick={() => setPrimaryColor(preset.color)}
                          className="h-10 w-10 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="Custom color (HSL)"
                        className="font-mono text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Widget Settings</CardTitle>
                    <CardDescription>Configure how your widget appears to visitors</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="agentName">Display Name</Label>
                      <Input
                        id="agentName"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Support Team"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="greeting">Welcome Message</Label>
                      <Input
                        id="greeting"
                        value={greeting}
                        onChange={(e) => setGreeting(e.target.value)}
                        placeholder="Hi there! How can I help?"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Embed Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Embed Code
                </CardTitle>
                <CardDescription>
                  Add this code to your website's HTML, just before the closing &lt;/body&gt; tag
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-sidebar text-sidebar-foreground p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{widgetScript}</code>
                  </pre>
                  <Button
                    onClick={handleCopy}
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-8">
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-base">Live Preview</CardTitle>
                <CardDescription>See how your widget will look on your website</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-[600px] bg-gradient-to-br from-secondary to-muted">
                  {/* Mock website content */}
                  <div className="p-8">
                    <div className="h-8 w-48 bg-foreground/10 rounded mb-6" />
                    <div className="space-y-3">
                      <div className="h-4 w-full bg-foreground/5 rounded" />
                      <div className="h-4 w-5/6 bg-foreground/5 rounded" />
                      <div className="h-4 w-4/6 bg-foreground/5 rounded" />
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="h-32 bg-foreground/5 rounded-lg" />
                      <div className="h-32 bg-foreground/5 rounded-lg" />
                    </div>
                  </div>

                  {/* Widget positioned in preview */}
                  <div className="absolute bottom-4 right-4">
                    <ChatWidget
                      propertyId={propertyId}
                      primaryColor={primaryColor}
                      agentName={agentName}
                      greeting={greeting}
                      isPreview={true}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WidgetPreview;
