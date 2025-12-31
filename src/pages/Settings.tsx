import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Globe, 
  Bot, 
  Clock, 
  MessageSquare, 
  Plus,
  Save,
  Loader2,
  Trash2,
  Cloud
} from 'lucide-react';
import { SalesforceSettings } from '@/components/settings/SalesforceSettings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface PropertySettings {
  id: string;
  name: string;
  domain: string;
  ai_response_delay_min_ms: number;
  ai_response_delay_max_ms: number;
  typing_indicator_min_ms: number;
  typing_indicator_max_ms: number;
  max_ai_messages_before_escalation: number;
  escalation_keywords: string[];
  auto_escalation_enabled: boolean;
  require_email_before_chat: boolean;
  require_name_before_chat: boolean;
  proactive_message: string | null;
  proactive_message_delay_seconds: number;
  proactive_message_enabled: boolean;
}

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { properties, createProperty, deleteProperty } = useConversations();
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  
  // New property dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyDomain, setNewPropertyDomain] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Set first property as default
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Fetch property settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!selectedPropertyId) return;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', selectedPropertyId)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      setSettings({
        id: data.id,
        name: data.name,
        domain: data.domain,
        ai_response_delay_min_ms: data.ai_response_delay_min_ms ?? 1000,
        ai_response_delay_max_ms: data.ai_response_delay_max_ms ?? 2500,
        typing_indicator_min_ms: data.typing_indicator_min_ms ?? 1500,
        typing_indicator_max_ms: data.typing_indicator_max_ms ?? 3000,
        max_ai_messages_before_escalation: data.max_ai_messages_before_escalation ?? 5,
        escalation_keywords: data.escalation_keywords ?? ['crisis', 'emergency', 'suicide', 'help me', 'urgent'],
        auto_escalation_enabled: data.auto_escalation_enabled ?? true,
        require_email_before_chat: data.require_email_before_chat ?? false,
        require_name_before_chat: data.require_name_before_chat ?? false,
        proactive_message: data.proactive_message ?? null,
        proactive_message_delay_seconds: data.proactive_message_delay_seconds ?? 30,
        proactive_message_enabled: data.proactive_message_enabled ?? false,
      });
    };

    fetchSettings();
  }, [selectedPropertyId]);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({
        name: settings.name,
        domain: settings.domain,
        ai_response_delay_min_ms: settings.ai_response_delay_min_ms,
        ai_response_delay_max_ms: settings.ai_response_delay_max_ms,
        typing_indicator_min_ms: settings.typing_indicator_min_ms,
        typing_indicator_max_ms: settings.typing_indicator_max_ms,
        max_ai_messages_before_escalation: settings.max_ai_messages_before_escalation,
        escalation_keywords: settings.escalation_keywords,
        auto_escalation_enabled: settings.auto_escalation_enabled,
        require_email_before_chat: settings.require_email_before_chat,
        require_name_before_chat: settings.require_name_before_chat,
        proactive_message: settings.proactive_message,
        proactive_message_delay_seconds: settings.proactive_message_delay_seconds,
        proactive_message_enabled: settings.proactive_message_enabled,
      })
      .eq('id', settings.id);

    setIsSaving(false);

    if (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
      return;
    }

    toast.success('Settings saved successfully');
  };

  const handleCreateProperty = async () => {
    if (!newPropertyName.trim() || !newPropertyDomain.trim()) return;

    setIsCreating(true);
    const property = await createProperty(newPropertyName.trim(), newPropertyDomain.trim());
    setIsCreating(false);

    if (property) {
      setIsDialogOpen(false);
      setNewPropertyName('');
      setNewPropertyDomain('');
      setSelectedPropertyId(property.id);
    }
  };

  const addKeyword = () => {
    if (!newKeyword.trim() || !settings) return;
    if (settings.escalation_keywords.includes(newKeyword.trim().toLowerCase())) {
      toast.error('Keyword already exists');
      return;
    }
    setSettings({
      ...settings,
      escalation_keywords: [...settings.escalation_keywords, newKeyword.trim().toLowerCase()],
    });
    setNewKeyword('');
  };

  const removeKeyword = (keyword: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      escalation_keywords: settings.escalation_keywords.filter(k => k !== keyword),
    });
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-subtle">
      <DashboardSidebar />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">Configure your chat widget behavior</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !settings}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>

          {/* Property Selector */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Select Property</CardTitle>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Property
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Property</DialogTitle>
                      <DialogDescription>
                        Add another website to manage with Scaled Bot
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-property-name">Property Name</Label>
                        <Input
                          id="new-property-name"
                          placeholder="My Website"
                          value={newPropertyName}
                          onChange={(e) => setNewPropertyName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-property-domain">Domain</Label>
                        <Input
                          id="new-property-domain"
                          placeholder="example.com"
                          value={newPropertyDomain}
                          onChange={(e) => setNewPropertyDomain(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateProperty} disabled={isCreating}>
                        {isCreating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Create Property
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <PropertySelector
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                onPropertyChange={setSelectedPropertyId}
                onDeleteProperty={deleteProperty}
                showDomain
                showIcon={false}
                className="w-full"
              />
            </CardContent>
          </Card>

          {settings && (
            <Tabs defaultValue="behavior" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="behavior">
                  <Clock className="mr-2 h-4 w-4" />
                  Response Timing
                </TabsTrigger>
                <TabsTrigger value="ai">
                  <Bot className="mr-2 h-4 w-4" />
                  AI & Escalation
                </TabsTrigger>
                <TabsTrigger value="engagement">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Engagement
                </TabsTrigger>
                <TabsTrigger value="salesforce">
                  <Cloud className="mr-2 h-4 w-4" />
                  Salesforce
                </TabsTrigger>
              </TabsList>

              {/* Response Timing Tab */}
              <TabsContent value="behavior" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Response Delay</CardTitle>
                    <CardDescription>
                      Add a random delay to AI responses to feel more human-like
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Delay Range</Label>
                      <span className="text-sm font-medium text-muted-foreground">
                        {(settings.ai_response_delay_min_ms / 1000).toFixed(1)}s – {(settings.ai_response_delay_max_ms / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <Slider
                      value={[settings.ai_response_delay_min_ms, settings.ai_response_delay_max_ms]}
                      onValueChange={([min, max]) => setSettings({
                        ...settings,
                        ai_response_delay_min_ms: min,
                        ai_response_delay_max_ms: max,
                      })}
                      min={0}
                      max={5000}
                      step={100}
                      minStepsBetweenThumbs={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0s</span>
                      <span>5s</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Response will appear after a random delay in this range
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Typing Indicator Duration</CardTitle>
                    <CardDescription>
                      How long the "typing" bubble shows before the AI response appears
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Duration Range</Label>
                      <span className="text-sm font-medium text-muted-foreground">
                        {(settings.typing_indicator_min_ms / 1000).toFixed(1)}s – {(settings.typing_indicator_max_ms / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <Slider
                      value={[settings.typing_indicator_min_ms, settings.typing_indicator_max_ms]}
                      onValueChange={([min, max]) => setSettings({
                        ...settings,
                        typing_indicator_min_ms: min,
                        typing_indicator_max_ms: max,
                      })}
                      min={500}
                      max={5000}
                      step={100}
                      minStepsBetweenThumbs={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.5s</span>
                      <span>5s</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Typing indicator will show for a random duration in this range
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI & Escalation Tab */}
              <TabsContent value="ai" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Auto-Escalation</CardTitle>
                    <CardDescription>
                      Automatically escalate conversations to human agents
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Auto-Escalation</Label>
                        <p className="text-sm text-muted-foreground">
                          Escalate after a certain number of AI messages
                        </p>
                      </div>
                      <Switch
                        checked={settings.auto_escalation_enabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          auto_escalation_enabled: checked,
                        })}
                      />
                    </div>

                    {settings.auto_escalation_enabled && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Messages Before Escalation</Label>
                          <span className="text-sm font-medium text-muted-foreground">
                            {settings.max_ai_messages_before_escalation} messages
                          </span>
                        </div>
                        <Slider
                          value={[settings.max_ai_messages_before_escalation]}
                          onValueChange={([val]) => setSettings({
                            ...settings,
                            max_ai_messages_before_escalation: val,
                          })}
                          min={2}
                          max={15}
                          step={1}
                        />
                        <p className="text-sm text-muted-foreground">
                          Conversation will escalate to a human after {settings.max_ai_messages_before_escalation} AI responses
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Escalation Keywords</CardTitle>
                    <CardDescription>
                      Keywords that trigger immediate escalation to a human agent
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add keyword..."
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                      />
                      <Button onClick={addKeyword} variant="secondary">
                        Add
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {settings.escalation_keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
                          {keyword}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 hover:bg-destructive/20"
                            onClick={() => removeKeyword(keyword)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      If a visitor message contains any of these keywords, the conversation will immediately escalate to a human agent
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Engagement Tab */}
              <TabsContent value="engagement" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Capture</CardTitle>
                    <CardDescription>
                      Require visitor information before starting a chat
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Require Name</Label>
                        <p className="text-sm text-muted-foreground">
                          Ask for visitor's name before they can chat
                        </p>
                      </div>
                      <Switch
                        checked={settings.require_name_before_chat}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          require_name_before_chat: checked,
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Require Email</Label>
                        <p className="text-sm text-muted-foreground">
                          Ask for visitor's email before they can chat
                        </p>
                      </div>
                      <Switch
                        checked={settings.require_email_before_chat}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          require_email_before_chat: checked,
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Proactive Message</CardTitle>
                    <CardDescription>
                      Automatically open the chat with a message after a delay
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Proactive Message</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically open widget and show a message
                        </p>
                      </div>
                      <Switch
                        checked={settings.proactive_message_enabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          proactive_message_enabled: checked,
                        })}
                      />
                    </div>

                    {settings.proactive_message_enabled && (
                      <>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea
                            placeholder="Hi! Need help finding the right treatment option?"
                            value={settings.proactive_message || ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              proactive_message: e.target.value,
                            })}
                            rows={3}
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Delay Before Showing</Label>
                            <span className="text-sm font-medium text-muted-foreground">
                              {settings.proactive_message_delay_seconds}s
                            </span>
                          </div>
                          <Slider
                            value={[settings.proactive_message_delay_seconds]}
                            onValueChange={([val]) => setSettings({
                              ...settings,
                              proactive_message_delay_seconds: val,
                            })}
                            min={5}
                            max={120}
                            step={5}
                          />
                          <p className="text-sm text-muted-foreground">
                            Message will appear {settings.proactive_message_delay_seconds} seconds after page load
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Salesforce Tab */}
              <TabsContent value="salesforce">
                <SalesforceSettings propertyId={selectedPropertyId} />
              </TabsContent>

            </Tabs>
          )}

          {!settings && selectedPropertyId && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}

          {properties.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Properties Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first property to configure widget behavior
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
