import { useState, useEffect } from 'react';
import { Copy, Check, Code, Palette, Loader2, Building2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';
const colorPresets = [{
  name: 'Sage',
  color: 'hsl(150, 25%, 45%)'
}, {
  name: 'Slate',
  color: 'hsl(215, 20%, 50%)'
}, {
  name: 'Lavender',
  color: 'hsl(260, 25%, 55%)'
}, {
  name: 'Dusty Rose',
  color: 'hsl(350, 25%, 55%)'
}, {
  name: 'Warm Gray',
  color: 'hsl(30, 15%, 50%)'
}, {
  name: 'Ocean',
  color: 'hsl(190, 30%, 45%)'
}];
const stylePresets = [{
  name: 'Bubbly',
  radius: 24,
  description: 'Soft, friendly rounded corners'
}, {
  name: 'Modern',
  radius: 12,
  description: 'Clean, contemporary look'
}, {
  name: 'Sharp',
  radius: 4,
  description: 'Professional, minimal rounding'
}, {
  name: 'Custom',
  radius: null,
  description: 'Set your own corner radius'
}];

// Convert hex to HSL
const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
};

// Display Settings Card with Save button
const DisplaySettingsCard = ({
  greeting,
  setGreeting,
  extractedFont,
  propertyId
}: {
  greeting: string;
  setGreeting: (value: string) => void;
  extractedFont: string | null;
  propertyId: string | undefined;
}) => {
  const [localGreeting, setLocalGreeting] = useState(greeting);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    setLocalGreeting(greeting);
    setHasChanges(false);
  }, [greeting]);
  const handleGreetingChange = (value: string) => {
    setLocalGreeting(value);
    setHasChanges(value !== greeting);
  };
  const handleSave = async () => {
    if (!propertyId) return;
    setIsSaving(true);
    const {
      error
    } = await supabase.from('properties').update({
      greeting: localGreeting || null
    }).eq('id', propertyId);
    setIsSaving(false);
    if (error) {
      toast.error('Failed to save settings');
      console.error('Error saving greeting:', error);
      return;
    }
    setGreeting(localGreeting);
    setHasChanges(false);
    toast.success('Welcome message saved!');
  };
  return <Card>
      <CardHeader>
        <CardTitle className="text-base">Welcome Message</CardTitle>
        <CardDescription>The first message visitors see when they open the chat</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="greeting">Welcome Message</Label>
          <Input id="greeting" value={localGreeting} onChange={e => handleGreetingChange(e.target.value)} placeholder="Hi there! How can I help?" />
          <p className="text-xs text-muted-foreground">
            This message is shared with AI Support settings
          </p>
        </div>
        {extractedFont && <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Detected font from your website: <span className="font-medium text-foreground">{extractedFont}</span>
            </p>
          </div>}
        <Button onClick={handleSave} disabled={!hasChanges || isSaving || !propertyId} className="w-full">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Welcome Message
        </Button>
      </CardContent>
    </Card>;
};
const WidgetPreview = () => {
  const {
    properties,
    loading,
    deleteProperty
  } = useConversations();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>();
  const [primaryColor, setPrimaryColor] = useState('hsl(150, 25%, 45%)');
  const [textColor, setTextColor] = useState('hsl(0, 0%, 100%)');
  const [borderColor, setBorderColor] = useState('hsl(0, 0%, 0%, 0.1)');
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');
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
      const {
        data,
        error
      } = await supabase.functions.invoke('extract-brand-colors', {
        body: {
          url
        }
      });
      if (error) throw error;
      if (data.success && data.branding) {
        const {
          colors,
          typography
        } = data.branding;

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
    textColor: '${textColor}',
    borderColor: '${borderColor}',
    widgetSize: '${widgetSize}',
    borderRadius: ${borderRadius},
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
    return <div className="flex h-screen bg-sidebar">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>;
  }
  if (properties.length === 0) {
    return <div className="flex h-screen bg-sidebar">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader 
            title="Widget Customization" 
            description="Customize and embed your chat widget"
          />
          <div className="flex-1 p-2 overflow-auto">
            <div className="h-full rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm flex items-center justify-center">
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
        </div>
      </div>;
  }
  return <div className="flex h-screen bg-sidebar">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <PageHeader 
          title="Widget Customization" 
          description="Customize and embed your chat widget"
        >
          <PropertySelector properties={properties} selectedPropertyId={selectedPropertyId} onPropertyChange={handlePropertyChange} onDeleteProperty={deleteProperty} variant="header" />
        </PageHeader>

        <main className="flex-1 p-2 overflow-auto">
          <div className="h-full rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
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
                          {stylePresets.map(style => <SelectItem key={style.name} value={style.name}>
                              {style.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {stylePresets.find(s => s.name === selectedStyle)?.description}
                      </p>
                    </div>

                    {selectedStyle === 'Custom' && <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Corner Radius</Label>
                          <span className="text-sm text-muted-foreground">{borderRadius}px</span>
                        </div>
                        <Slider value={[borderRadius]} onValueChange={handleRadiusChange} max={32} min={0} step={2} className="w-full" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Sharp</span>
                          <span>Rounded</span>
                        </div>
                      </div>}
                  </CardContent>
                </Card>

                {/* Brand Color */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Brand Color</CardTitle>
                    <CardDescription>
                      Choose your primary widget color
                      {isExtracting && <span className="flex items-center gap-2 mt-1 text-primary">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Extracting from your website...
                        </span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-6 gap-3 mb-4">
                      {colorPresets.map(preset => <button key={preset.name} onClick={() => setPrimaryColor(preset.color)} className="h-10 w-10 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" style={{
                        backgroundColor: preset.color
                      }} title={preset.name} />)}
                    </div>
                    <div className="flex gap-2">
                      <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="Custom color (HSL)" className="font-mono text-sm" />
                    </div>
                  </CardContent>
                </Card>

                {/* Text & Border Colors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Text & Border</CardTitle>
                    <CardDescription>Customize text and border colors</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Text Color (on primary)</Label>
                      <div className="flex gap-2">
                        <div className="flex gap-2">
                          <button onClick={() => setTextColor('hsl(0, 0%, 100%)')} className={cn("h-10 w-10 rounded-full border-2 transition-transform hover:scale-110", textColor === 'hsl(0, 0%, 100%)' ? "ring-2 ring-ring ring-offset-2" : "")} style={{
                            backgroundColor: 'white',
                            borderColor: 'hsl(0, 0%, 80%)'
                          }} title="White" />
                          <button onClick={() => setTextColor('hsl(0, 0%, 0%)')} className={cn("h-10 w-10 rounded-full border-2 transition-transform hover:scale-110", textColor === 'hsl(0, 0%, 0%)' ? "ring-2 ring-ring ring-offset-2" : "")} style={{
                            backgroundColor: 'black',
                            borderColor: 'hsl(0, 0%, 30%)'
                          }} title="Black" />
                        </div>
                        <Input value={textColor} onChange={e => setTextColor(e.target.value)} placeholder="Custom (HSL)" className="font-mono text-sm flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Border Color</Label>
                      <div className="flex gap-2">
                        <div className="flex gap-2">
                          <button onClick={() => setBorderColor('hsl(0, 0%, 0%, 0.1)')} className={cn("h-10 w-10 rounded-full border-2 transition-transform hover:scale-110", borderColor === 'hsl(0, 0%, 0%, 0.1)' ? "ring-2 ring-ring ring-offset-2" : "")} style={{
                            backgroundColor: 'hsl(0, 0%, 90%)',
                            borderColor: 'hsl(0, 0%, 70%)'
                          }} title="Light" />
                          <button onClick={() => setBorderColor('hsl(0, 0%, 0%, 0.3)')} className={cn("h-10 w-10 rounded-full border-2 transition-transform hover:scale-110", borderColor === 'hsl(0, 0%, 0%, 0.3)' ? "ring-2 ring-ring ring-offset-2" : "")} style={{
                            backgroundColor: 'hsl(0, 0%, 70%)',
                            borderColor: 'hsl(0, 0%, 50%)'
                          }} title="Medium" />
                          <button onClick={() => setBorderColor('transparent')} className={cn("h-10 w-10 rounded-full border-2 border-dashed transition-transform hover:scale-110", borderColor === 'transparent' ? "ring-2 ring-ring ring-offset-2" : "")} style={{
                            borderColor: 'hsl(0, 0%, 60%)'
                          }} title="None" />
                        </div>
                        <Input value={borderColor} onChange={e => setBorderColor(e.target.value)} placeholder="Custom (HSL)" className="font-mono text-sm flex-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Widget Size */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Widget Size</CardTitle>
                    <CardDescription>Choose the size of your chat widget</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {(['small', 'medium', 'large'] as const).map(size => <button key={size} onClick={() => setWidgetSize(size)} className={cn("flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all", widgetSize === size ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                          <div className="bg-muted rounded" style={{
                          width: size === 'small' ? 32 : size === 'medium' ? 44 : 56,
                          height: size === 'small' ? 32 : size === 'medium' ? 44 : 56
                        }} />
                          <span className="text-sm font-medium capitalize">{size}</span>
                        </button>)}
                    </div>
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
                      {selectedProperty && <span className="text-xs font-normal text-muted-foreground ml-2">
                          for {selectedProperty.name}
                        </span>}
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
                      <Button onClick={handleCopy} size="sm" variant="secondary" className="absolute top-2 right-2" disabled={!selectedPropertyId}>
                        {copied ? <>
                            <Check className="h-4 w-4 mr-1" />
                            Copied
                          </> : <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Mobile Preview & Display Settings */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12" y2="18" />
                  </svg>
                  Mobile Preview
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  {selectedProperty?.domain ? `Preview on ${selectedProperty.domain}` : 'Select a property to see a live preview'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex justify-center">
                <div className="relative w-[375px] h-[667px] bg-gradient-to-br from-secondary to-muted overflow-hidden rounded-[2rem] border-4 border-foreground/20 shadow-xl">
                  {/* Phone notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground/20 rounded-b-xl z-10" />
                  
                  {/* Website iframe preview */}
                  {selectedProperty?.domain ? <iframe src={`https://${selectedProperty.domain.replace(/^https?:\/\//, '')}`} className="w-full h-full border-0 pointer-events-none" title={`Mobile preview of ${selectedProperty.name}`} sandbox="allow-scripts allow-same-origin" loading="lazy" /> : <div className="p-6 pt-10">
                      <div className="h-6 w-32 bg-foreground/10 rounded mb-4" />
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-foreground/5 rounded" />
                        <div className="h-3 w-5/6 bg-foreground/5 rounded" />
                        <div className="h-3 w-4/6 bg-foreground/5 rounded" />
                      </div>
                      <div className="mt-6 space-y-3">
                        <div className="h-24 bg-foreground/5 rounded-lg" />
                        <div className="h-24 bg-foreground/5 rounded-lg" />
                      </div>
                    </div>}

                  {/* Widget positioned in preview */}
                  <div className="absolute bottom-4 right-4">
                    <ChatWidget propertyId={selectedPropertyId || ''} primaryColor={primaryColor} textColor={textColor} borderColor={borderColor} widgetSize={widgetSize} borderRadius={borderRadius} greeting={greeting} isPreview={true} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Display Settings */}
            <DisplaySettingsCard greeting={greeting} setGreeting={setGreeting} extractedFont={extractedFont} propertyId={selectedPropertyId} />
          </div>
        </div>

        {/* Desktop Preview - Full Width Below */}
        <div className="mt-8">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-base flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Desktop Preview
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                Full-width desktop view of your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative w-full h-[700px] bg-gradient-to-br from-secondary to-muted overflow-hidden rounded-lg border border-border shadow-lg">
                {/* Browser chrome */}
                <div className="h-8 bg-foreground/10 flex items-center px-3 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-5 bg-background/50 rounded-md flex items-center px-3">
                      <span className="text-xs text-muted-foreground truncate">
                        {selectedProperty?.domain ? `https://${selectedProperty.domain.replace(/^https?:\/\//, '')}` : 'https://your-website.com'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Website iframe preview */}
                <div className="relative h-[calc(100%-2rem)]">
                  {selectedProperty?.domain ? <iframe src={`https://${selectedProperty.domain.replace(/^https?:\/\//, '')}`} className="w-full h-full border-0 pointer-events-none" title={`Desktop preview of ${selectedProperty.name}`} sandbox="allow-scripts allow-same-origin" loading="lazy" /> : <div className="p-8">
                      <div className="max-w-4xl mx-auto">
                        <div className="h-10 w-64 bg-foreground/10 rounded mb-8" />
                        <div className="grid grid-cols-3 gap-6 mb-8">
                          <div className="h-40 bg-foreground/5 rounded-lg" />
                          <div className="h-40 bg-foreground/5 rounded-lg" />
                          <div className="h-40 bg-foreground/5 rounded-lg" />
                        </div>
                        <div className="space-y-3">
                          <div className="h-4 w-full bg-foreground/5 rounded" />
                          <div className="h-4 w-5/6 bg-foreground/5 rounded" />
                          <div className="h-4 w-4/6 bg-foreground/5 rounded" />
                          <div className="h-4 w-3/4 bg-foreground/5 rounded" />
                        </div>
                      </div>
                    </div>}

                  {/* Widget positioned in preview */}
                  <div className="absolute bottom-4 right-4">
                    <ChatWidget propertyId={selectedPropertyId || ''} primaryColor={primaryColor} textColor={textColor} borderColor={borderColor} widgetSize={widgetSize} borderRadius={borderRadius} greeting={greeting} isPreview={true} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
          </div>
      </main>
      </div>
    </div>;
};
export default WidgetPreview;