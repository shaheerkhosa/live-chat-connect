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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, Mail, Loader2, Trash2, RefreshCw, Send, Upload, Bot, Globe, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Agent {
  id: string;
  name: string;
  email: string;
  status: string;
  invitation_status: string;
  user_id: string;
  assigned_properties: string[];
  avatar_url?: string;
}

const TeamMembers = () => {
  const { user } = useAuth();
  const { properties } = useConversations();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [uploadingAvatarFor, setUploadingAvatarFor] = useState<string | null>(null);
  const [creatingAIForId, setCreatingAIForId] = useState<string | null>(null);
  const [linkedAIAgents, setLinkedAIAgents] = useState<Record<string, string>>({}); // agent_id -> ai_name

  useEffect(() => {
    fetchAgents();
    fetchLinkedAIAgents();
  }, [user]);

  const fetchLinkedAIAgents = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_agents')
      .select('id, name, linked_agent_id')
      .eq('owner_id', user.id)
      .not('linked_agent_id', 'is', null);

    if (!error && data) {
      const map: Record<string, string> = {};
      data.forEach(ai => {
        if (ai.linked_agent_id) {
          map[ai.linked_agent_id] = ai.name;
        }
      });
      setLinkedAIAgents(map);
    }
  };

  const fetchAgents = async () => {
    if (!user) return;

    setLoading(true);
    
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('invited_by', user.id);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      setLoading(false);
      return;
    }

    const agentIds = agentsData?.map(a => a.id) || [];
    const { data: assignmentsData } = await supabase
      .from('property_agents')
      .select('agent_id, property_id')
      .in('agent_id', agentIds.length > 0 ? agentIds : ['none']);

    const agentsWithAssignments: Agent[] = (agentsData || []).map(agent => {
      const assignments = assignmentsData?.filter(a => a.agent_id === agent.id) || [];
      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        status: agent.status,
        invitation_status: agent.invitation_status || 'accepted',
        user_id: agent.user_id,
        assigned_properties: assignments.map(a => a.property_id),
        avatar_url: agent.avatar_url,
      };
    });

    setAgents(agentsWithAssignments);
    setLoading(false);
  };

  const sendInvitationEmail = async (agentId: string, agentName: string, agentEmail: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user?.id)
      .maybeSingle();

    const { data, error } = await supabase.functions.invoke('send-agent-invitation', {
      body: {
        agentId,
        agentName,
        agentEmail,
        inviterName: profile?.full_name || 'A team member',
        appUrl: window.location.origin,
      },
    });

    if (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }

    return data;
  };

  const handleInviteAgent = async () => {
    if (!inviteEmail.trim() || !inviteName.trim() || !user) return;

    const email = inviteEmail.trim().toLowerCase();
    const name = inviteName.trim();

    setIsInviting(true);

    try {
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('email', email)
        .eq('invited_by', user.id)
        .maybeSingle();

      if (existingAgent) {
        toast.error('This email has already been invited');
        setIsInviting(false);
        return;
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          name,
          email,
          user_id: existingProfile?.user_id || user.id,
          invited_by: user.id,
          invitation_status: 'pending',
          status: 'offline',
        })
        .select()
        .single();

      if (agentError) {
        toast.error('Failed to invite agent: ' + agentError.message);
        setIsInviting(false);
        return;
      }

      if (selectedPropertyIds.length > 0 && newAgent) {
        const assignments = selectedPropertyIds.map((propertyId) => ({
          agent_id: newAgent.id,
          property_id: propertyId,
        }));

        await supabase.from('property_agents').insert(assignments);
      }

      try {
        await sendInvitationEmail(newAgent.id, name, email);
        toast.success('Invitation sent! They will receive an email to join.');
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        const message = emailError instanceof Error ? emailError.message : String(emailError);
        toast.error(`Email failed to send: ${message}`);
      }

      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteName('');
      setSelectedPropertyIds([]);
      fetchAgents();
    } catch (error) {
      console.error('Error inviting agent:', error);
      toast.error('Failed to invite agent');
    }

    setIsInviting(false);
  };

  const handleResendInvitation = async (agent: Agent) => {
    setResendingId(agent.id);
    
    try {
      await sendInvitationEmail(agent.id, agent.name, agent.email);
      toast.success('Invitation resent successfully!');
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      toast.error('Failed to resend invitation');
    }

    setResendingId(null);
  };

  const handleRemoveAgent = async () => {
    if (!deleteAgentId) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', deleteAgentId);

    if (error) {
      toast.error('Failed to remove agent');
      setIsDeleting(false);
      return;
    }

    toast.success('Agent removed');
    setDeleteAgentId(null);
    setIsDeleting(false);
    fetchAgents();
  };

  const handleToggleProperty = async (agentId: string, propertyId: string, isAssigned: boolean) => {
    if (isAssigned) {
      await supabase
        .from('property_agents')
        .delete()
        .eq('agent_id', agentId)
        .eq('property_id', propertyId);
    } else {
      await supabase
        .from('property_agents')
        .insert({ agent_id: agentId, property_id: propertyId });
    }
    
    fetchAgents();
  };

  const handleAvatarUpload = async (agentId: string, file: File) => {
    if (!user) return;

    setUploadingAvatarFor(agentId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `human-${agentId}-${Date.now()}.${fileExt}`;
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
        .from('agents')
        .update({ avatar_url: publicUrl })
        .eq('id', agentId);
      fetchAgents();

      toast.success('Avatar uploaded!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    }

    setUploadingAvatarFor(null);
  };

  const handleCreateTestAgent = async () => {
    if (!user) return;

    const testEmail = `test-agent-${Date.now()}@test.local`;
    const testName = `Test Agent ${Math.floor(Math.random() * 1000)}`;

    try {
      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          name: testName,
          email: testEmail,
          user_id: user.id,
          invited_by: user.id,
          invitation_status: 'accepted',
          status: 'online',
        })
        .select()
        .single();

      if (agentError) {
        toast.error('Failed to create test agent: ' + agentError.message);
        return;
      }

      if (properties.length > 0 && newAgent) {
        const assignments = properties.map((prop) => ({
          agent_id: newAgent.id,
          property_id: prop.id,
        }));
        await supabase.from('property_agents').insert(assignments);
      }

      toast.success(`Test agent "${testName}" created and assigned to all properties!`);
      fetchAgents();
    } catch (error) {
      console.error('Error creating test agent:', error);
      toast.error('Failed to create test agent');
    }
  };

  const handleCreateAIFromAgent = async (agent: Agent) => {
    if (!user) return;

    // Check if AI already linked to this agent
    if (linkedAIAgents[agent.id]) {
      toast.error(`AI persona "${linkedAIAgents[agent.id]}" is already linked to this agent`);
      return;
    }

    setCreatingAIForId(agent.id);

    try {
      const { data: newAI, error } = await supabase
        .from('ai_agents')
        .insert({
          name: agent.name,
          avatar_url: agent.avatar_url || null,
          owner_id: user.id,
          status: 'active',
          linked_agent_id: agent.id,
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create AI persona: ' + error.message);
        setCreatingAIForId(null);
        return;
      }

      toast.success(`AI persona "${agent.name}" created!`);
      fetchLinkedAIAgents();
    } catch (error) {
      console.error('Error creating AI from agent:', error);
      toast.error('Failed to create AI persona');
    }

    setCreatingAIForId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-primary';
      case 'away': return 'bg-primary/60';
      default: return 'bg-muted-foreground/40';
    }
  };

  const getInvitationBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-primary border-primary">Pending</Badge>;
      case 'accepted': return <Badge variant="outline" className="text-primary border-primary">Active</Badge>;
      case 'revoked': return <Badge variant="outline" className="text-destructive border-destructive">Revoked</Badge>;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-sidebar">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PageHeader title="Team Members">
          <HeaderButton variant="outline" size="icon" onClick={fetchAgents}>
            <RefreshCw className="h-4 w-4" />
          </HeaderButton>
        </PageHeader>

        {/* Content */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Agents can respond to conversations on assigned properties
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCreateTestAgent} className="text-xs">
                  + Test Agent
                </Button>
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Agent</DialogTitle>
                      <DialogDescription>
                        Add a team member who can respond to chat conversations.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="agent-name">Name</Label>
                        <Input
                          id="agent-name"
                          placeholder="John Smith"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agent-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="agent-email"
                            type="email"
                            placeholder="agent@company.com"
                            className="pl-10"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
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
                                  checked={selectedPropertyIds.includes(prop.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPropertyIds([...selectedPropertyIds, prop.id]);
                                    } else {
                                      setSelectedPropertyIds(selectedPropertyIds.filter(id => id !== prop.id));
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
                      <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleInviteAgent} disabled={isInviting || !inviteEmail.trim() || !inviteName.trim()}>
                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Invitation
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading agents...
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium text-lg">No agents yet</p>
                  <p className="text-sm mb-4">Invite agents to help respond to conversations</p>
                  <Button onClick={() => setIsInviteDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Your First Agent
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Properties</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative group">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={agent.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {agent.name.charAt(0).toUpperCase()}
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
                              <p className="text-sm text-muted-foreground">{agent.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getInvitationBadge(agent.invitation_status)}
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
                                      onClick={() => handleToggleProperty(agent.id, prop.id, isAssigned)}
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
                          <div className="flex items-center justify-end gap-2">
                            {/* Create AI button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCreateAIFromAgent(agent)}
                                  disabled={creatingAIForId === agent.id || !!linkedAIAgents[agent.id]}
                                  className={linkedAIAgents[agent.id] 
                                    ? "text-primary/50" 
                                    : "text-muted-foreground hover:text-primary"
                                  }
                                >
                                  {creatingAIForId === agent.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Bot className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {linkedAIAgents[agent.id] 
                                  ? `AI "${linkedAIAgents[agent.id]}" linked` 
                                  : "Create AI Persona"
                                }
                              </TooltipContent>
                            </Tooltip>

                            {agent.invitation_status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleResendInvitation(agent)}
                                disabled={resendingId === agent.id}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {resendingId === agent.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteAgentId(agent.id)}
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
            </div>
          </div>
        </div>
      </div>

      {/* Delete Agent Confirmation */}
      <AlertDialog open={!!deleteAgentId} onOpenChange={(open) => !open && setDeleteAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this agent? They will no longer be able to access conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAgent}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Removing...' : 'Remove Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamMembers;
