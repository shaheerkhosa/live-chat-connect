import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Link2, Unlink, Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

interface SalesforceSettingsProps {
  propertyId: string;
}

interface FieldMapping {
  salesforceField: string;
  visitorField: string;
}

interface SalesforceConfig {
  id: string;
  enabled: boolean;
  instance_url: string | null;
  auto_export_on_escalation: boolean;
  auto_export_on_conversation_end: boolean;
  field_mappings: Record<string, string>;
  client_id: string;
  client_secret: string;
}

const SALESFORCE_LEAD_FIELDS = [
  'FirstName',
  'LastName',
  'Email',
  'Phone',
  'Company',
  'Title',
  'Description',
  'LeadSource',
  'Website',
  'Industry',
  'Street',
  'City',
  'State',
  'PostalCode',
  'Country',
];

const VISITOR_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'age', label: 'Age' },
  { value: 'occupation', label: 'Occupation' },
  { value: 'location', label: 'Location' },
  { value: 'current_page', label: 'Current Page' },
  { value: 'browser_info', label: 'Browser Info' },
  { value: 'drug_of_choice', label: 'Drug of Choice' },
  { value: 'addiction_history', label: 'Addiction History' },
  { value: 'treatment_interest', label: 'Treatment Interest' },
  { value: 'insurance_info', label: 'Insurance Info' },
  { value: 'urgency_level', label: 'Urgency Level' },
  { value: 'conversation_transcript', label: 'Conversation Transcript' },
];

export const SalesforceSettings = ({ propertyId }: SalesforceSettingsProps) => {
  const [config, setConfig] = useState<SalesforceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [propertyId]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('salesforce_settings')
      .select('*')
      .eq('property_id', propertyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Salesforce settings:', error);
      toast.error('Failed to load Salesforce settings');
      setLoading(false);
      return;
    }

    if (data) {
      setConfig({
        id: data.id,
        enabled: data.enabled,
        instance_url: data.instance_url,
        auto_export_on_escalation: data.auto_export_on_escalation,
        auto_export_on_conversation_end: data.auto_export_on_conversation_end,
        field_mappings: data.field_mappings as Record<string, string>,
        client_id: (data as any).client_id || '',
        client_secret: (data as any).client_secret || '',
      });
      
      // Convert field_mappings object to array
      const mappings = Object.entries(data.field_mappings as Record<string, string>).map(
        ([salesforceField, visitorField]) => ({
          salesforceField,
          visitorField,
        })
      );
      setFieldMappings(mappings);
    } else {
      // No settings exist, create default
      setConfig(null);
      setFieldMappings([
        { salesforceField: 'FirstName', visitorField: 'name' },
        { salesforceField: 'Email', visitorField: 'email' },
        { salesforceField: 'Phone', visitorField: 'phone' },
        { salesforceField: 'Description', visitorField: 'conversation_transcript' },
      ]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    // Convert field mappings array to object
    const mappingsObject = fieldMappings.reduce((acc, mapping) => {
      if (mapping.salesforceField && mapping.visitorField) {
        acc[mapping.salesforceField] = mapping.visitorField;
      }
      return acc;
    }, {} as Record<string, string>);

    const settingsData = {
      property_id: propertyId,
      enabled: config?.enabled ?? false,
      auto_export_on_escalation: config?.auto_export_on_escalation ?? false,
      auto_export_on_conversation_end: config?.auto_export_on_conversation_end ?? false,
      field_mappings: mappingsObject,
      client_id: config?.client_id || null,
      client_secret: config?.client_secret || null,
    };

    let result;
    if (config?.id) {
      result = await supabase
        .from('salesforce_settings')
        .update(settingsData)
        .eq('id', config.id);
    } else {
      result = await supabase
        .from('salesforce_settings')
        .insert(settingsData)
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      console.error('Error saving Salesforce settings:', result.error);
      toast.error('Failed to save Salesforce settings');
      return;
    }

    if (!config?.id && result.data) {
      setConfig({
        ...settingsData,
        id: result.data.id,
        instance_url: null,
        client_id: config?.client_id || '',
        client_secret: config?.client_secret || '',
      });
    }

    toast.success('Salesforce settings saved');
  };

  // Generate PKCE code verifier and challenge
  const generatePKCE = async () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const codeChallenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    return { codeVerifier, codeChallenge };
  };

  const handleConnect = async () => {
    if (!config?.client_id || !config?.client_secret) {
      toast.error('Please enter your Client ID and Client Secret first');
      return;
    }

    // Save credentials first
    await handleSave();

    setConnecting(true);

    try {
      // Generate PKCE parameters
      const { codeVerifier, codeChallenge } = await generatePKCE();
      
      // Store code verifier in sessionStorage for the callback
      sessionStorage.setItem(`sf_code_verifier_${propertyId}`, codeVerifier);

      // Salesforce OAuth authorization URL
      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salesforce-oauth-callback`;
      const authUrl = new URL('https://login.salesforce.com/services/oauth2/authorize');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', config.client_id);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'api refresh_token openid');
      authUrl.searchParams.set('state', `${propertyId}:${codeVerifier}`);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl.toString(),
        'salesforce-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      // Listen for popup close and refetch settings
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setConnecting(false);
          fetchSettings();
          // Clean up stored verifier
          sessionStorage.removeItem(`sf_code_verifier_${propertyId}`);
        }
      }, 500);
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast.error('Failed to start OAuth flow');
      setConnecting(false);
    }
  };

  const addMapping = () => {
    const usedFields = new Set(fieldMappings.map(m => m.salesforceField));
    const availableField = SALESFORCE_LEAD_FIELDS.find(f => !usedFields.has(f));
    if (availableField) {
      setFieldMappings([...fieldMappings, { salesforceField: availableField, visitorField: '' }]);
    }
  };

  const removeMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: 'salesforceField' | 'visitorField', value: string) => {
    const updated = [...fieldMappings];
    updated[index] = { ...updated[index], [field]: value };
    setFieldMappings(updated);
  };

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
              <CardTitle>Salesforce Connection</CardTitle>
              <CardDescription>
                Connect your Salesforce account to export leads
              </CardDescription>
            </div>
            <Badge variant={config?.instance_url ? 'default' : 'secondary'}>
              {config?.instance_url ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OAuth Credentials */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                type="text"
                placeholder="Enter your Salesforce Connected App Client ID"
                value={config?.client_id || ''}
                onChange={(e) => setConfig(prev => prev ? { ...prev, client_id: e.target.value } : {
                  id: '',
                  enabled: false,
                  instance_url: null,
                  auto_export_on_escalation: false,
                  auto_export_on_conversation_end: false,
                  field_mappings: {},
                  client_id: e.target.value,
                  client_secret: '',
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="client_secret"
                  type={showClientSecret ? 'text' : 'password'}
                  placeholder="Enter your Salesforce Connected App Client Secret"
                  value={config?.client_secret || ''}
                  onChange={(e) => setConfig(prev => prev ? { ...prev, client_secret: e.target.value } : {
                    id: '',
                    enabled: false,
                    instance_url: null,
                    auto_export_on_escalation: false,
                    auto_export_on_conversation_end: false,
                    field_mappings: {},
                    client_id: '',
                    client_secret: e.target.value,
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
                You can find these in your Salesforce Connected App settings
              </p>
            </div>
          </div>

          {/* Connection Status */}
          {config?.instance_url ? (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Connected to Salesforce</p>
                <p className="text-sm text-muted-foreground">{config.instance_url}</p>
              </div>
              <Button variant="outline" size="sm" className="text-destructive">
                <Unlink className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                Enter your OAuth credentials above, save, then connect your account.
              </p>
              <Button 
                disabled={!config?.client_id || !config?.client_secret || connecting}
                onClick={handleConnect}
              >
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                {connecting ? 'Connecting...' : 'Connect Salesforce'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Auto Export</CardTitle>
          <CardDescription>
            Automatically export leads to Salesforce when certain events occur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export on Escalation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a lead when a conversation is escalated to a human
              </p>
            </div>
            <Switch
              checked={config?.auto_export_on_escalation ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, auto_export_on_escalation: checked } : null)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export on Conversation End</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a lead when a conversation is closed
              </p>
            </div>
            <Switch
              checked={config?.auto_export_on_conversation_end ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, auto_export_on_conversation_end: checked } : null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Field Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Mappings</CardTitle>
              <CardDescription>
                Map visitor data to Salesforce Lead fields
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addMapping}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-4 items-center font-medium text-sm text-muted-foreground">
              <span>Salesforce Field</span>
              <span></span>
              <span>Visitor Data</span>
              <span></span>
            </div>
            
            {fieldMappings.map((mapping, index) => (
              <div key={index} className="grid grid-cols-[1fr,auto,1fr,auto] gap-4 items-center">
                <Select
                  value={mapping.salesforceField}
                  onValueChange={(value) => updateMapping(index, 'salesforceField', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALESFORCE_LEAD_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">→</span>

                <Select
                  value={mapping.visitorField}
                  onValueChange={(value) => updateMapping(index, 'visitorField', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISITOR_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMapping(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {fieldMappings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No field mappings configured. Click "Add Field" to create one.
              </p>
            )}
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
          Save Salesforce Settings
        </Button>
      </div>
    </div>
  );
};
