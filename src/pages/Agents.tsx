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
import { Users, UserPlus, Mail, Loader2, Trash2, RefreshCw, Send } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  status: string;
  invitation_status: string;
  user_id: string;
  assigned_properties: string[];
}

const Agents = () => {
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

  useEffect(() => {
    fetchAgents();
  }, [user]);

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
      };
    });

    setAgents(agentsWithAssignments);
    setLoading(false);
  };

  const sendInvitationEmail = async (agentId: string, agentName: string, agentEmail: string) => {
    // Get inviter's name
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

    // Note: Self-invites are allowed for testing purposes (Resend test mode only sends to owner email)

    setIsInviting(true);

    try {
      // Check if email already exists as an agent for this client
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

      // Check if user already has an account
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      const isExistingUser = !!existingProfile;

      // Create agent record
      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          name,
          email,
          user_id: existingProfile?.user_id || user.id,
          invited_by: user.id,
          invitation_status: isExistingUser ? 'accepted' : 'pending',
          status: 'offline',
        })
        .select()
        .single();

      if (agentError) {
        toast.error('Failed to invite agent: ' + agentError.message);
        setIsInviting(false);
        return;
      }

      // Assign to selected properties
      if (selectedPropertyIds.length > 0 && newAgent) {
        const assignments = selectedPropertyIds.map((propertyId) => ({
          agent_id: newAgent.id,
          property_id: propertyId,
        }));

        await supabase.from('property_agents').insert(assignments);
      }

      // If existing user, update their role
      if (isExistingUser && existingProfile) {
        await supabase
          .from('user_roles')
          .upsert(
            {
              user_id: existingProfile.user_id,
              role: 'agent',
            },
            {
              onConflict: 'user_id',
            }
          );

        toast.success('Agent added (existing account). No invitation email was sent.');
      } else {
        // Send invitation email for new users
        try {
          await sendInvitationEmail(newAgent.id, name, email);
          toast.success('Invitation sent! They will receive an email to join.');
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          const message = emailError instanceof Error ? emailError.message : String(emailError);
          toast.error(`Email failed to send: ${message}`);
        }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getInvitationBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'accepted': return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
      case 'revoked': return <Badge variant="outline" className="text-red-600 border-red-600">Revoked</Badge>;
      default: return null;
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
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Agents</h1>
              <p className="text-sm text-muted-foreground">Manage your team members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchAgents}>
              <RefreshCw className="h-4 w-4" />
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
                    Add a team member who can respond to chat conversations. They'll receive an email to create their account.
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Agents can respond to conversations on assigned properties
              </CardDescription>
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
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {agent.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(agent.status)}`} />
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
                          <div className="flex flex-wrap gap-2">
                            {properties.map((prop) => {
                              const isAssigned = agent.assigned_properties.includes(prop.id);
                              return (
                                <Badge
                                  key={prop.id}
                                  variant={isAssigned ? 'default' : 'outline'}
                                  className="cursor-pointer"
                                  onClick={() => handleToggleProperty(agent.id, prop.id, isAssigned)}
                                >
                                  {prop.name}
                                </Badge>
                              );
                            })}
                            {properties.length === 0 && (
                              <span className="text-sm text-muted-foreground">No properties</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAgentId} onOpenChange={(open) => !open && setDeleteAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this agent? They will no longer be able to access conversations for your properties.
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

export default Agents;
