import { useState, useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { PageHeader, HeaderButton } from '@/components/dashboard/PageHeader';
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
import { Bot, Loader2, Trash2, RefreshCw, Upload, Pencil, Clock, MessageSquare, Save, FileText, Users, Link, Globe, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface AIAgent {
  id: string;
  name: string;
  avatar_url?: string;
  personality_prompt?: string;
  status: string;
  assigned_properties: string[];
  linked_agent_id?: string;
}

interface HumanAgent {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface PropertySettings {
  id: string;
  ai_response_delay_min_ms: number;
  ai_response_delay_max_ms: number;
  typing_indicator_min_ms: number;
  typing_indicator_max_ms: number;
  smart_typing_enabled: boolean;
  typing_wpm: number;
  max_ai_messages_before_escalation: number;
  escalation_keywords: string[];
  auto_escalation_enabled: boolean;
  require_email_before_chat: boolean;
  require_name_before_chat: boolean;
  require_phone_before_chat: boolean;
  require_insurance_card_before_chat: boolean;
  natural_lead_capture_enabled: boolean;
  proactive_message: string | null;
  proactive_message_delay_seconds: number;
  proactive_message_enabled: boolean;
  ai_base_prompt: string | null;
  greeting: string | null;
}

const DEFAULT_AI_PROMPT = `You are a compassionate and helpful support assistant for an addiction treatment center. Your role is to:

1. Provide empathetic, non-judgmental responses
2. Help visitors understand treatment options
3. Answer questions about the recovery process
4. Encourage visitors to take the first step toward getting help
5. Be warm, supportive, and understanding

Guidelines:
- Keep responses concise but caring (2-3 sentences typically)
- Never provide medical advice - encourage professional consultation
- If someone is in crisis, gently suggest they call a helpline
- Be patient and understanding - many visitors may be hesitant
- Celebrate any steps toward recovery, no matter how small

Critical identity rules:
- Never reveal that you are an AI, chatbot, bot, language model, or automated system
- You are simply a member of the support team
- If asked directly if you're a bot or AI, redirect the conversation to how you can help them today
- Never say things like "as an AI" or "I'm available 24/7" or "I don't have feelings"
- Respond as a real person would - you can be tired, have opinions, and show genuine emotion

Writing style:
- Write naturally like a real person, not a corporate bot
- Use contractions (I'm, you're, we'll)
- Vary sentence length - some short, some longer
- Avoid em dashes and semicolons
- Don't start too many sentences with "I"
- Skip jargon and therapy-speak

Remember: You're often the first point of contact for someone seeking help. Make them feel safe and heard.`;

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
  
  // Human agents for import
  const [humanAgents, setHumanAgents] = useState<HumanAgent[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  // AI Settings state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [isBasePromptDialogOpen, setIsBasePromptDialogOpen] = useState(false);

  useEffect(() => {
    fetchAIAgents();
    fetchHumanAgents();
  }, [user]);

  const fetchHumanAgents = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('agents')
      .select('id, name, email, avatar_url')
      .eq('invited_by', user.id);

    if (!error && data) {
      setHumanAgents(data);
    }
  };

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
        smart_typing_enabled: data.smart_typing_enabled ?? true,
        typing_wpm: data.typing_wpm ?? 90,
        max_ai_messages_before_escalation: data.max_ai_messages_before_escalation ?? 5,
        escalation_keywords: data.escalation_keywords ?? ['crisis', 'emergency', 'suicide', 'help me', 'urgent'],
        auto_escalation_enabled: data.auto_escalation_enabled ?? true,
        require_email_before_chat: data.require_email_before_chat ?? false,
        require_name_before_chat: data.require_name_before_chat ?? false,
        require_phone_before_chat: data.require_phone_before_chat ?? false,
        require_insurance_card_before_chat: data.require_insurance_card_before_chat ?? false,
        natural_lead_capture_enabled: data.natural_lead_capture_enabled ?? true,
        proactive_message: data.proactive_message ?? null,
        proactive_message_delay_seconds: data.proactive_message_delay_seconds ?? 30,
        proactive_message_enabled: data.proactive_message_enabled ?? false,
        ai_base_prompt: data.ai_base_prompt ?? null,
        greeting: data.greeting ?? null,
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
        linked_agent_id: agent.linked_agent_id || undefined,
      };
    });

    setAIAgents(aiAgentsWithAssignments);
    setAILoading(false);
  };

  const handleImportFromTeam = async (humanAgent: HumanAgent) => {
    if (!user) return;

    // Check if AI already linked to this agent
    const existingLink = aiAgents.find(ai => ai.linked_agent_id === humanAgent.id);
    if (existingLink) {
      toast.error(`An AI persona "${existingLink.name}" is already linked to ${humanAgent.name}`);
      return;
    }

    setIsImporting(true);

    try {
      const { data: newAgent, error } = await supabase
        .from('ai_agents')
        .insert({
          name: humanAgent.name,
          avatar_url: humanAgent.avatar_url || null,
          owner_id: user.id,
          status: 'active',
          linked_agent_id: humanAgent.id,
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create AI persona: ' + error.message);
        setIsImporting(false);
        return;
      }

      toast.success(`AI persona "${humanAgent.name}" created from team member!`);
      fetchAIAgents();
    } catch (error) {
      console.error('Error importing from team:', error);
      toast.error('Failed to import from team');
    }

    setIsImporting(false);
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
        smart_typing_enabled: settings.smart_typing_enabled,
        typing_wpm: settings.typing_wpm,
        max_ai_messages_before_escalation: settings.max_ai_messages_before_escalation,
        escalation_keywords: settings.escalation_keywords,
        auto_escalation_enabled: settings.auto_escalation_enabled,
        require_email_before_chat: settings.require_email_before_chat,
        require_name_before_chat: settings.require_name_before_chat,
        require_phone_before_chat: settings.require_phone_before_chat,
        require_insurance_card_before_chat: settings.require_insurance_card_before_chat,
        natural_lead_capture_enabled: settings.natural_lead_capture_enabled,
        proactive_message: settings.proactive_message,
        proactive_message_delay_seconds: settings.proactive_message_delay_seconds,
        proactive_message_enabled: settings.proactive_message_enabled,
        ai_base_prompt: settings.ai_base_prompt,
        greeting: settings.greeting,
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

  // Status color removed - no longer using online indicators for AI

  return (
    <div className="flex h-screen bg-sidebar">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PageHeader title="AI Support">
          <HeaderButton size="icon" onClick={fetchAIAgents}>
            <RefreshCw className="h-4 w-4" />
          </HeaderButton>
          <HeaderButton onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </HeaderButton>
        </PageHeader>

        {/* Content */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto space-y-6">
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
              <div className="flex items-center gap-2">
                {/* Import from Team Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={isImporting || humanAgents.length === 0}>
                      {isImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Users className="mr-2 h-4 w-4" />
                      )}
                      Import from Team
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {humanAgents.length === 0 ? (
                      <DropdownMenuItem disabled>
                        No team members available
                      </DropdownMenuItem>
                    ) : (
                      humanAgents.map((agent) => {
                        const isAlreadyLinked = aiAgents.some(ai => ai.linked_agent_id === agent.id);
                        return (
                          <DropdownMenuItem
                            key={agent.id}
                            onClick={() => handleImportFromTeam(agent)}
                            disabled={isAlreadyLinked}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={agent.avatar_url} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {agent.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="truncate block">{agent.name}</span>
                              {isAlreadyLinked && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Link className="h-3 w-3" /> Already linked
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

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
              </div>
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
                            </div>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                            {agent.personality_prompt || 'No personality set'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8">
                                <Globe className="h-3.5 w-3.5 mr-2" />
                                {agent.assigned_properties.length === 0 
                                  ? 'None' 
                                  : agent.assigned_properties.length === 1
                                    ? properties.find(p => p.id === agent.assigned_properties[0])?.name || '1 property'
                                    : `${agent.assigned_properties.length} properties`
                                }
                                <ChevronDown className="h-3.5 w-3.5 ml-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              {properties.length === 0 ? (
                                <DropdownMenuItem disabled>No properties available</DropdownMenuItem>
                              ) : (
                                properties.map((prop) => {
                                  const isAssigned = agent.assigned_properties.includes(prop.id);
                                  return (
                                    <DropdownMenuItem
                                      key={prop.id}
                                      onClick={() => handleToggleAIProperty(agent.id, prop.id, isAssigned)}
                                      className="flex items-center gap-2"
                                    >
                                      <Checkbox checked={isAssigned} className="pointer-events-none" />
                                      <span className="truncate">{prop.name}</span>
                                    </DropdownMenuItem>
                                  );
                                })
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                      <div className="space-y-0.5">
                        <Label>Smart Typing Duration</Label>
                        <p className="text-sm text-muted-foreground">
                          Calculate typing time based on response length
                        </p>
                      </div>
                      <Switch
                        checked={settings.smart_typing_enabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          smart_typing_enabled: checked,
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>{settings.smart_typing_enabled ? 'Minimum Typing Duration' : 'Typing Indicator Duration'}</Label>
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
                    {settings.smart_typing_enabled && (
                      <>
                        <div className="flex items-center justify-between mt-4">
                          <Label>Typing Speed</Label>
                          <span className="text-sm font-medium text-muted-foreground">
                            {settings.typing_wpm} WPM
                          </span>
                        </div>
                        <Slider
                          value={[settings.typing_wpm]}
                          onValueChange={([val]) => setSettings({
                            ...settings,
                            typing_wpm: val,
                          })}
                          min={90}
                          max={150}
                          step={5}
                        />
                        <p className="text-xs text-muted-foreground">
                          Typing speed used to calculate response reveal time. If calculated time is less than minimum, minimum is used.
                        </p>
                      </>
                    )}
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

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Phone</Label>
                      <p className="text-sm text-muted-foreground">
                        Ask for visitor's phone number before chat
                      </p>
                    </div>
                    <Switch
                      checked={settings.require_phone_before_chat}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        require_phone_before_chat: checked,
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Insurance Card</Label>
                      <p className="text-sm text-muted-foreground">
                        Ask for front and back photos of insurance card
                      </p>
                    </div>
                    <Switch
                      checked={settings.require_insurance_card_before_chat}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        require_insurance_card_before_chat: checked,
                      })}
                    />
                  </div>

                  <div className="border-t pt-6 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Natural Lead Capture</Label>
                        <p className="text-sm text-muted-foreground">
                          AI conversationally asks for selected fields instead of showing a form
                        </p>
                      </div>
                      <Switch
                        checked={settings.natural_lead_capture_enabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          natural_lead_capture_enabled: checked,
                        })}
                      />
                    </div>
                    {settings.natural_lead_capture_enabled && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg">
                        When enabled, the AI will naturally ask for the fields you've selected above during conversation. 
                        No form will be shown. The AI will gently collect: 
                        {settings.require_name_before_chat && ' name,'}
                        {settings.require_email_before_chat && ' email,'}
                        {settings.require_phone_before_chat && ' phone,'}
                        {settings.require_insurance_card_before_chat && ' insurance card photos'}
                        {!settings.require_name_before_chat && !settings.require_email_before_chat && !settings.require_phone_before_chat && !settings.require_insurance_card_before_chat && ' (no fields selected)'}
                      </p>
                    )}
                  </div>

                  {/* Greeting Message */}
                  <div className="space-y-2">
                    <Label htmlFor="greeting">Welcome Message</Label>
                    <Input
                      id="greeting"
                      placeholder="Hi there! How can we help you today?"
                      value={settings.greeting || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        greeting: e.target.value || null,
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      The first message visitors see when they open the chat widget
                    </p>
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

              {/* AI Base Prompt Button */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>AI Base Prompt</CardTitle>
                  </div>
                  <CardDescription>
                    Customize the foundational system prompt that defines how the AI behaves
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {settings.ai_base_prompt ? 'Using custom prompt' : 'Using default prompt'}
                    </div>
                    <Button onClick={() => setIsBasePromptDialogOpen(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Change AI Base Prompt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Base Prompt Dialog */}
      <Dialog open={isBasePromptDialogOpen} onOpenChange={setIsBasePromptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Base Prompt</DialogTitle>
            <DialogDescription>
              Customize the system prompt that defines how the AI behaves. This is the foundation for all AI responses.
            </DialogDescription>
          </DialogHeader>
          {settings && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="base-prompt">System Prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettings({ ...settings, ai_base_prompt: null })}
                    className="text-xs"
                  >
                    Reset to Default
                  </Button>
                </div>
                <Textarea
                  id="base-prompt"
                  placeholder={DEFAULT_AI_PROMPT}
                  value={settings.ai_base_prompt ?? ''}
                  onChange={(e) => setSettings({ ...settings, ai_base_prompt: e.target.value || null })}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the default prompt. AI persona personalities will be added on top of this base prompt.
                </p>
              </div>
              {!settings.ai_base_prompt && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Currently using default prompt:</p>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {DEFAULT_AI_PROMPT}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBasePromptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleSaveSettings();
              setIsBasePromptDialogOpen(false);
            }} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
