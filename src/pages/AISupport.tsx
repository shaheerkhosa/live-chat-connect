import { useState, useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { PropertySelector } from '@/components/PropertySelector';
import { Bot, Loader2, Trash2, RefreshCw, Upload, Pencil, Clock, MessageSquare, Save } from 'lucide-react';

interface AIAgent {
  id: string;
  name: string;
  avatar_url?: string;
  personality_prompt?: string;
  status: string;
  assigned_properties: string[];
}

interface PropertySettings {
  id: string;
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

const AISupport = () => {
  const { user } = useAuth();
  const { properties } = useConversations();
  
  // AI agents state
  const [aiAgents, setAIAgents] = useState<AIAgent[]>([]);
  const [aiLoading, setAILoading] = useState(true);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiAgentName, setAIAgentName] = useState('');
  const [aiAgentPersonality, setAIAgentPersonality] = useState('');
  const [aiSelectedPropertyIds, setAISelectedPropertyIds] = useState<string[]>([]);
  const [isCreatingAI, setIsCreatingAI] = useState(false);
  const [deleteAIAgentId, setDeleteAIAgentId] = useState<string | null>(null);
  const [isDeletingAI, setIsDeletingAI] = useState(false);
  const [editingAIAgent, setEditingAIAgent] = useState<AIAgent | null>(null);
  const [uploadingAvatarFor, setUploadingAvatarFor] = useState<string | null>(null);

  // AI Settings state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchAIAgents();
  }, [user]);

  // Set first property as default for AI settings
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Fetch property settings for AI tab
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

  const fetchAIAgents = async () => {
    if (!user) return;

    setAILoading(true);

    const { data: aiAgentsData, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error fetching AI agents:', error);
      setAILoading(false);
      return;
    }

    const aiAgentIds = aiAgentsData?.map(a => a.id) || [];
    const { data: assignmentsData } = await supabase
      .from('ai_agent_properties')
      .select('ai_agent_id, property_id')
      .in('ai_agent_id', aiAgentIds.length > 0 ? aiAgentIds : ['none']);

    const aiAgentsWithAssignments: AIAgent[] = (aiAgentsData || []).map(agent => {
      const assignments = assignmentsData?.filter(a => a.ai_agent_id === agent.id) || [];
      return {
        id: agent.id,
        name: agent.name,
        avatar_url: agent.avatar_url,
        personality_prompt: agent.personality_prompt,
        status: agent.status,
        assigned_properties: assignments.map(a => a.property_id),
      };
    });

    setAIAgents(aiAgentsWithAssignments);
    setAILoading(false);
  };

  const handleCreateAIAgent = async () => {
    if (!aiAgentName.trim() || !user) return;

    setIsCreatingAI(true);

    try {
      const { data: newAgent, error } = await supabase
        .from('ai_agents')
        .insert({
          name: aiAgentName.trim(),
          personality_prompt: aiAgentPersonality.trim() || null,
          owner_id: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create AI agent: ' + error.message);
        setIsCreatingAI(false);
        return;
      }

      if (aiSelectedPropertyIds.length > 0 && newAgent) {
        const assignments = aiSelectedPropertyIds.map((propertyId) => ({
          ai_agent_id: newAgent.id,
          property_id: propertyId,
        }));

        await supabase.from('ai_agent_properties').insert(assignments);
      }

      toast.success('AI Agent created!');
      setIsAIDialogOpen(false);
      setAIAgentName('');
      setAIAgentPersonality('');
      setAISelectedPropertyIds([]);
      fetchAIAgents();
    } catch (error) {
      console.error('Error creating AI agent:', error);
      toast.error('Failed to create AI agent');
    }

    setIsCreatingAI(false);
  };

  const handleUpdateAIAgent = async () => {
    if (!editingAIAgent || !aiAgentName.trim()) return;

    setIsCreatingAI(true);

    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({
          name: aiAgentName.trim(),
          personality_prompt: aiAgentPersonality.trim() || null,
        })
        .eq('id', editingAIAgent.id);

      if (error) {
        toast.error('Failed to update AI agent: ' + error.message);
        setIsCreatingAI(false);
        return;
      }

      await supabase
        .from('ai_agent_properties')
        .delete()
        .eq('ai_agent_id', editingAIAgent.id);

      if (aiSelectedPropertyIds.length > 0) {
        const assignments = aiSelectedPropertyIds.map((propertyId) => ({
          ai_agent_id: editingAIAgent.id,
          property_id: propertyId,
        }));
        await supabase.from('ai_agent_properties').insert(assignments);
      }

      toast.success('AI Agent updated!');
      setIsAIDialogOpen(false);
      setEditingAIAgent(null);
      setAIAgentName('');
      setAIAgentPersonality('');
      setAISelectedPropertyIds([]);
      fetchAIAgents();
    } catch (error) {
      console.error('Error updating AI agent:', error);
      toast.error('Failed to update AI agent');
    }

    setIsCreatingAI(false);
  };

  const handleRemoveAIAgent = async () => {
    if (!deleteAIAgentId) return;
    
    setIsDeletingAI(true);
    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', deleteAIAgentId);

    if (error) {
      toast.error('Failed to remove AI agent');
      setIsDeletingAI(false);
      return;
    }

    toast.success('AI Agent removed');
    setDeleteAIAgentId(null);
    setIsDeletingAI(false);
    fetchAIAgents();
  };

  const handleToggleAIProperty = async (aiAgentId: string, propertyId: string, isAssigned: boolean) => {
    if (isAssigned) {
      await supabase
        .from('ai_agent_properties')
        .delete()
        .eq('ai_agent_id', aiAgentId)
        .eq('property_id', propertyId);
    } else {
      await supabase
        .from('ai_agent_properties')
        .insert({ ai_agent_id: aiAgentId, property_id: propertyId });
    }
    
    fetchAIAgents();
  };

  const openEditAIAgent = (agent: AIAgent) => {
    setEditingAIAgent(agent);
    setAIAgentName(agent.name);
    setAIAgentPersonality(agent.personality_prompt || '');
    setAISelectedPropertyIds(agent.assigned_properties);
    setIsAIDialogOpen(true);
  };

  const handleAvatarUpload = async (agentId: string, file: File) => {
    if (!user) return;

    setUploadingAvatarFor(agentId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ai-${agentId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
          toast.error('Avatar storage not configured. Please contact support.');
          setUploadingAvatarFor(null);
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('agent-avatars')
        .getPublicUrl(filePath);

      await supabase
        .from('ai_agents')
        .update({ avatar_url: publicUrl })
        .eq('id', agentId);
      fetchAIAgents();

      toast.success('Avatar uploaded!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    }

    setUploadingAvatarFor(null);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex h-screen bg-gradient-subtle">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">AI Support</h1>
              <p className="text-sm text-muted-foreground">Configure AI agents and behavior</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchAIAgents}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Property Selector for AI Settings */}
          <PropertySelector
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
            onDeleteProperty={async () => false}
          />

          {/* AI Personas Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI Personas</CardTitle>
                <CardDescription>
                  Create virtual agents with unique personalities
                </CardDescription>
              </div>
              <Dialog open={isAIDialogOpen} onOpenChange={(open) => {
                setIsAIDialogOpen(open);
                if (!open) {
                  setEditingAIAgent(null);
                  setAIAgentName('');
                  setAIAgentPersonality('');
                  setAISelectedPropertyIds([]);
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Bot className="mr-2 h-4 w-4" />
                    Create Persona
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingAIAgent ? 'Edit AI Persona' : 'Create AI Persona'}</DialogTitle>
                    <DialogDescription>
                      {editingAIAgent ? 'Update this AI persona\'s details.' : 'Create a virtual agent with a unique personality.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="ai-name">Name</Label>
                      <Input
                        id="ai-name"
                        placeholder="Luna"
                        value={aiAgentName}
                        onChange={(e) => setAIAgentName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-personality">Personality Prompt</Label>
                      <Textarea
                        id="ai-personality"
                        placeholder="You are a warm and empathetic support specialist. You speak in a calm, reassuring tone and always make visitors feel heard and understood..."
                        value={aiAgentPersonality}
                        onChange={(e) => setAIAgentPersonality(e.target.value)}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Describe how this AI persona should communicate and behave. This becomes the system prompt for the AI.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to Properties</Label>
                      <div className="space-y-2 max-h-40 overflow-auto border rounded-lg p-3">
                        {properties.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No properties available</p>
                        ) : (
                          properties.map((prop) => (
                            <label key={prop.id} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={aiSelectedPropertyIds.includes(prop.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setAISelectedPropertyIds([...aiSelectedPropertyIds, prop.id]);
                                  } else {
                                    setAISelectedPropertyIds(aiSelectedPropertyIds.filter(id => id !== prop.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{prop.name}</span>
                              <span className="text-xs text-muted-foreground">({prop.domain})</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={editingAIAgent ? handleUpdateAIAgent : handleCreateAIAgent} 
                      disabled={isCreatingAI || !aiAgentName.trim()}
                    >
                      {isCreatingAI && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingAIAgent ? 'Save Changes' : 'Create Persona'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading AI personas...
                </div>
              ) : aiAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No AI personas yet</p>
                  <p className="text-sm mb-3">Create personas with unique personalities</p>
                  <Button size="sm" onClick={() => setIsAIDialogOpen(true)}>
                    <Bot className="mr-2 h-4 w-4" />
                    Create Your First Persona
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Personality</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative group">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={agent.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  <Bot className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                {uploadingAvatarFor === agent.id ? (
                                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 text-white" />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAvatarUpload(agent.id, file);
                                  }}
                                />
                              </label>
                              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(agent.status)}`} />
                            </div>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <Badge variant="secondary" className="text-xs">AI</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                            {agent.personality_prompt || 'No personality set'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {properties.map((prop) => {
                              const isAssigned = agent.assigned_properties.includes(prop.id);
                              return (
                                <Badge
                                  key={prop.id}
                                  variant={isAssigned ? 'default' : 'outline'}
                                  className="cursor-pointer text-xs"
                                  onClick={() => handleToggleAIProperty(agent.id, prop.id, isAssigned)}
                                >
                                  {prop.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditAIAgent(agent)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteAIAgentId(agent.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* AI Behavior Settings */}
          {settings && (
            <>
              {/* Timing Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Response Timing</CardTitle>
                  </div>
                  <CardDescription>
                    Add delays to AI responses for a more human-like experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>AI Response Delay</Label>
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
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Typing Indicator Duration</Label>
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
                  </div>
                </CardContent>
              </Card>

              {/* Escalation Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Escalation Rules</CardTitle>
                  </div>
                  <CardDescription>
                    Configure when conversations should escalate to human agents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Escalation</Label>
                      <p className="text-sm text-muted-foreground">
                        Escalate after a set number of AI messages
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
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Escalation Keywords</Label>
                    <p className="text-sm text-muted-foreground">
                      Trigger immediate escalation when these words are detected
                    </p>
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
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Engagement</CardTitle>
                  </div>
                  <CardDescription>
                    Configure lead capture and proactive messaging
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Name</Label>
                      <p className="text-sm text-muted-foreground">
                        Ask for visitor's name before chat
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
                        Ask for visitor's email before chat
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

                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-0.5">
                        <Label>Proactive Message</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically open widget with a message
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
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Hi! Need help finding the right treatment option?"
                          value={settings.proactive_message || ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            proactive_message: e.target.value,
                          })}
                          rows={3}
                        />
                        <div className="space-y-2">
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
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Delete AI Agent Confirmation */}
      <AlertDialog open={!!deleteAIAgentId} onOpenChange={(open) => !open && setDeleteAIAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove AI Persona</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this AI persona? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAI}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAIAgent}
              disabled={isDeletingAI}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAI ? 'Removing...' : 'Remove Persona'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AISupport;
