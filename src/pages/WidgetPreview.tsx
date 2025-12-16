import { useState, useEffect } from 'react';
import { Copy, Check, ArrowLeft, Code, Palette, Loader2, Building2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useConversations } from '@/hooks/useConversations';

const colorPresets = [
  { name: 'Sage', color: 'hsl(150, 25%, 45%)' },
  { name: 'Slate', color: 'hsl(215, 20%, 50%)' },
  { name: 'Lavender', color: 'hsl(260, 25%, 55%)' },
  { name: 'Dusty Rose', color: 'hsl(350, 25%, 55%)' },
  { name: 'Warm Gray', color: 'hsl(30, 15%, 50%)' },
  { name: 'Ocean', color: 'hsl(190, 30%, 45%)' },
];

const stylePresets = [
  { name: 'Bubbly', radius: 24, description: 'Soft, friendly rounded corners' },
  { name: 'Modern', radius: 12, description: 'Clean, contemporary look' },
  { name: 'Sharp', radius: 4, description: 'Professional, minimal rounding' },
  { name: 'Custom', radius: null, description: 'Set your own corner radius' },
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
  const { properties, loading } = useConversations();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>();
  const [primaryColor, setPrimaryColor] = useState('hsl(150, 25%, 45%)');
  const [agentName, setAgentName] = useState('Support Team');
  const [greeting, setGreeting] = useState("Hi there! 👋 How can I help you today?");
  const [copied, setCopied] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [borderRadius, setBorderRadius] = useState(24);
  const [selectedStyle, setSelectedStyle] = useState('Bubbly');
  const [extractedFont, setExtractedFont] = useState<string | null>(null);

  // Auto-select first property and load its settings when properties load
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      const firstProperty = properties[0];
      setSelectedPropertyId(firstProperty.id);
      // Load property settings
      if (firstProperty.widget_color) setPrimaryColor(firstProperty.widget_color);
      if (firstProperty.greeting) setGreeting(firstProperty.greeting);
      // Auto-extract brand from property domain
      extractBrandFromProperty(firstProperty.domain);
    }
  }, [properties, selectedPropertyId]);

  // Update settings when property changes
  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      if (property.widget_color) setPrimaryColor(property.widget_color);
      if (property.greeting) setGreeting(property.greeting);
      // Auto-extract brand from the new property's domain
      extractBrandFromProperty(property.domain);
    }
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const extractBrandFromProperty = async (domain: string) => {
    if (!domain) return;

    setIsExtracting(true);
    try {
      // Format the domain as a URL
      let url = domain.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      const { data, error } = await supabase.functions.invoke('extract-brand-colors', {
        body: { url }
      });

      if (error) throw error;

      if (data.success && data.branding) {
        const { colors, typography } = data.branding;
        
        // Try to get the best color (primary > accent > first available)
        let colorToUse = colors?.primary || colors?.accent;
        
        if (colorToUse) {
          // Convert hex to HSL if needed
          if (colorToUse.startsWith('#')) {
            colorToUse = hexToHsl(colorToUse);
          }
          setPrimaryColor(colorToUse);
        }

        // Extract font if available
        if (typography?.fontFamilies?.primary) {
          setExtractedFont(typography.fontFamilies.primary);
        }

        toast.success('Brand styles extracted from your website!');
      }
    } catch (error) {
      console.error('Error extracting brand colors:', error);
      // Silently fail - user can still customize manually
    } finally {
      setIsExtracting(false);
    }
  };

  const handleStyleChange = (styleName: string) => {
    setSelectedStyle(styleName);
    const preset = stylePresets.find(s => s.name === styleName);
    if (preset && preset.radius !== null) {
      setBorderRadius(preset.radius);
    }
  };

  const handleRadiusChange = (value: number[]) => {
    setBorderRadius(value[0]);
    // If user changes radius manually, switch to Custom
    const matchingStyle = stylePresets.find(s => s.radius === value[0]);
    setSelectedStyle(matchingStyle?.name || 'Custom');
  };

  const widgetScript = selectedPropertyId ? `<!-- Scaled Bot Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['ScaledBot']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','sb','https://your-domain.com/widget.js'));
  sb('init', {
    propertyId: '${selectedPropertyId}',
    primaryColor: '${primaryColor}',
    borderRadius: ${borderRadius},
    agentName: '${agentName}',
    greeting: '${greeting}'
  });
</script>` : '// Select a property to generate embed code';

  const handleCopy = () => {
    if (!selectedPropertyId) {
      toast.error('Please select a property first');
      return;
    }
    navigator.clipboard.writeText(widgetScript);
    setCopied(true);
    toast.success('Widget code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-secondary/30">
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
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No Properties Yet</h2>
            <p className="text-muted-foreground mb-4">
              Create a property first to customize your widget.
            </p>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-4">
              {/* Property Selector */}
              <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
                <SelectTrigger className="w-[220px]">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Settings */}
          <div className="space-y-6">
            <Tabs defaultValue="widget">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="widget" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Widget
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="h-4 w-4" />
                  Embed Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="widget" className="mt-6 space-y-6">
                {/* Style Preset */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Widget Style</CardTitle>
                    <CardDescription>Choose a preset style or customize the corner radius</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Style Preset</Label>
                      <Select value={selectedStyle} onValueChange={handleStyleChange}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stylePresets.map((style) => (
                            <SelectItem key={style.name} value={style.name}>
                              {style.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {stylePresets.find(s => s.name === selectedStyle)?.description}
                      </p>
                    </div>

                    {selectedStyle === 'Custom' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Corner Radius</Label>
                          <span className="text-sm text-muted-foreground">{borderRadius}px</span>
                        </div>
                        <Slider
                          value={[borderRadius]}
                          onValueChange={handleRadiusChange}
                          max={32}
                          min={0}
                          step={2}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Sharp</span>
                          <span>Rounded</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Brand Color */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Brand Color</CardTitle>
                    <CardDescription>
                      Choose your primary widget color
                      {isExtracting && (
                        <span className="flex items-center gap-2 mt-1 text-primary">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Extracting from your website...
                        </span>
                      )}
                    </CardDescription>
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

                {/* Widget Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Display Settings</CardTitle>
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
                    {extractedFont && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <Sparkles className="h-3 w-3 inline mr-1" />
                          Detected font from your website: <span className="font-medium text-foreground">{extractedFont}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="code" className="mt-6">
                {/* Embed Code */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Embed Code
                      {selectedProperty && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          for {selectedProperty.name}
                        </span>
                      )}
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
                        disabled={!selectedPropertyId}
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
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-8">
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-base">Live Preview</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  We automatically extract colors and fonts from your website to match your brand
                </CardDescription>
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
                      propertyId={selectedPropertyId || ''}
                      primaryColor={primaryColor}
                      borderRadius={borderRadius}
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
