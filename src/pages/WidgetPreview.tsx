import { useState } from 'react';
import { Copy, Check, ArrowLeft, Code, Palette, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const colorPresets = [
  { name: 'Teal', color: 'hsl(172, 66%, 50%)' },
  { name: 'Blue', color: 'hsl(217, 91%, 60%)' },
  { name: 'Purple', color: 'hsl(262, 83%, 58%)' },
  { name: 'Pink', color: 'hsl(330, 81%, 60%)' },
  { name: 'Orange', color: 'hsl(25, 95%, 53%)' },
  { name: 'Green', color: 'hsl(142, 71%, 45%)' },
];

const WidgetPreview = () => {
  const [propertyId] = useState('demo-property-123');
  const [primaryColor, setPrimaryColor] = useState('hsl(172, 66%, 50%)');
  const [agentName, setAgentName] = useState('Support Team');
  const [greeting, setGreeting] = useState("Hi there! 👋 How can I help you today?");
  const [copied, setCopied] = useState(false);

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
