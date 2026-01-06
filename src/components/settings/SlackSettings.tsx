import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Eye, EyeOff, Link2, Unlink, ExternalLink } from 'lucide-react';

interface SlackSettingsProps {
  propertyId: string;
}

interface SlackConfig {
  id: string;
  enabled: boolean;
  client_id: string;
  client_secret: string;
  access_token: string | null;
  team_id: string | null;
  team_name: string | null;
  incoming_webhook_channel: string | null;
  channel_name: string;
  notify_on_new_conversation: boolean;
  notify_on_escalation: boolean;
}

export const SlackSettings = ({ propertyId }: SlackSettingsProps) => {
  const [config, setConfig] = useState<SlackConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'slack-oauth-success') {
        toast.success(`Connected to ${event.data.team || 'Slack'}!`);
        fetchSettings(); // Refresh settings
      } else if (event.data?.type === 'slack-oauth-error') {
        toast.error(`Slack connection failed: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('slack_notification_settings')
      .select('*')
      .eq('property_id', propertyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Slack settings:', error);
      toast.error('Failed to load Slack settings');
      setLoading(false);
      return;
    }

    if (data) {
      setConfig({
        id: data.id,
        enabled: data.enabled,
        client_id: data.client_id || '',
        client_secret: data.client_secret || '',
        access_token: data.access_token,
        team_id: data.team_id,
        team_name: data.team_name,
        incoming_webhook_channel: data.incoming_webhook_channel,
        channel_name: data.channel_name || '',
        notify_on_new_conversation: data.notify_on_new_conversation,
        notify_on_escalation: data.notify_on_escalation,
      });
    } else {
      setConfig(null);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const settingsData = {
      property_id: propertyId,
      enabled: config?.enabled ?? false,
      client_id: config?.client_id || null,
      client_secret: config?.client_secret || null,
      channel_name: config?.channel_name || null,
      notify_on_new_conversation: config?.notify_on_new_conversation ?? true,
      notify_on_escalation: config?.notify_on_escalation ?? true,
    };

    let result;
    if (config?.id) {
      result = await supabase
        .from('slack_notification_settings')
        .update(settingsData)
        .eq('id', config.id);
    } else {
      result = await supabase
        .from('slack_notification_settings')
        .insert(settingsData)
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      console.error('Error saving Slack settings:', result.error);
      toast.error('Failed to save Slack settings');
      return;
    }

    if (!config?.id && result.data) {
      setConfig({
        ...config!,
        id: result.data.id,
      });
    }

    toast.success('Slack settings saved');
  };

  const handleConnectSlack = async () => {
    if (!config?.client_id) {
      toast.error('Please enter your Slack Client ID first');
      return;
    }

    // Save settings first to ensure client_id and client_secret are stored
    await handleSave();

    // Build the Slack OAuth URL using the edge function as redirect
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-oauth-callback`;
    const scopes = 'incoming-webhook,chat:write,channels:read';
    const state = btoa(JSON.stringify({ propertyId }));

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(config.client_id)}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

    window.open(slackAuthUrl, '_blank', 'width=600,height=700');
  };

  const handleDisconnect = async () => {
    if (!config?.id) return;

    const { error } = await supabase
      .from('slack_notification_settings')
      .update({
        access_token: null,
        team_id: null,
        team_name: null,
        incoming_webhook_channel: null,
        incoming_webhook_url: null,
        bot_user_id: null,
      })
      .eq('id', config.id);

    if (error) {
      toast.error('Failed to disconnect Slack');
      return;
    }

    setConfig({
      ...config,
      access_token: null,
      team_id: null,
      team_name: null,
      incoming_webhook_channel: null,
    });

    toast.success('Slack disconnected');
  };

  const isConnected = !!config?.access_token;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slack Connection</CardTitle>
              <CardDescription>
                Connect your Slack workspace to receive notifications
              </CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OAuth Credentials */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slack_client_id">Client ID</Label>
              <Input
                id="slack_client_id"
                type="text"
                placeholder="Enter your Slack App Client ID"
                value={config?.client_id || ''}
                onChange={(e) => setConfig(prev => prev ? { ...prev, client_id: e.target.value } : {
                  id: '',
                  enabled: false,
                  client_id: e.target.value,
                  client_secret: '',
                  access_token: null,
                  team_id: null,
                  team_name: null,
                  incoming_webhook_channel: null,
                  channel_name: '',
                  notify_on_new_conversation: true,
                  notify_on_escalation: true,
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slack_client_secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="slack_client_secret"
                  type={showClientSecret ? 'text' : 'password'}
                  placeholder="Enter your Slack App Client Secret"
                  value={config?.client_secret || ''}
                  onChange={(e) => setConfig(prev => prev ? { ...prev, client_secret: e.target.value } : {
                    id: '',
                    enabled: false,
                    client_id: '',
                    client_secret: e.target.value,
                    access_token: null,
                    team_id: null,
                    team_name: null,
                    incoming_webhook_channel: null,
                    channel_name: '',
                    notify_on_new_conversation: true,
                    notify_on_escalation: true,
                  })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                >
                  {showClientSecret ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a Slack App at api.slack.com/apps to get these credentials
              </p>
            </div>
          </div>

          {/* Connection Status */}
          {isConnected ? (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Connected to {config?.team_name || 'Slack'}</p>
                {config?.incoming_webhook_channel && (
                  <p className="text-sm text-muted-foreground">
                    Channel: {config.incoming_webhook_channel}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" className="text-destructive" onClick={handleDisconnect}>
                <Unlink className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                Enter your OAuth credentials above, save, then connect your workspace.
              </p>
              <Button 
                disabled={!config?.client_id || !config?.client_secret}
                onClick={handleConnectSlack}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Connect Slack
              </Button>
            </div>
          )}

          {/* Help link */}
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground flex-1">
              Need help creating a Slack App?
            </p>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://api.slack.com/apps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                Create Slack App
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Triggers</CardTitle>
          <CardDescription>
            Choose when to receive Slack notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Slack Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off all Slack notifications
              </p>
            </div>
            <Switch
              checked={config?.enabled ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, enabled: checked } : {
                id: '',
                enabled: checked,
                client_id: '',
                client_secret: '',
                access_token: null,
                team_id: null,
                team_name: null,
                incoming_webhook_channel: null,
                channel_name: '',
                notify_on_new_conversation: true,
                notify_on_escalation: true,
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Conversation</Label>
              <p className="text-sm text-muted-foreground">
                Notify when a new chat conversation starts
              </p>
            </div>
            <Switch
              checked={config?.notify_on_new_conversation ?? true}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, notify_on_new_conversation: checked } : null)}
              disabled={!config?.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Escalation</Label>
              <p className="text-sm text-muted-foreground">
                Notify when a conversation is escalated to a human agent
              </p>
            </div>
            <Switch
              checked={config?.notify_on_escalation ?? true}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, notify_on_escalation: checked } : null)}
              disabled={!config?.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Slack Settings
        </Button>
      </div>
    </div>
  );
};
