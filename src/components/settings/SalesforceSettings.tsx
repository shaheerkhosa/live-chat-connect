import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { Loader2, Save, Plus, Trash2, Unlink } from 'lucide-react';

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
  { value: 'conversation_transcript', label: 'Conversation Transcript' },
];

export const SalesforceSettings = ({ propertyId }: SalesforceSettingsProps) => {
  const [config, setConfig] = useState<SalesforceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'salesforce-oauth-success') {
        toast.success(`Connected to Salesforce!`);
        fetchSettings(); // Refresh settings
        setConnecting(false);
      } else if (event.data?.type === 'salesforce-oauth-error') {
        toast.error(`Salesforce connection failed: ${event.data.error}`);
        setConnecting(false);
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
      // No settings exist, set defaults
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
      });
    }

    toast.success('Salesforce settings saved');
  };

  const handleConnectSalesforce = async () => {
    setConnecting(true);

    try {
      // Call edge function to get OAuth URL
      const { data, error } = await supabase.functions.invoke('salesforce-oauth-start', {
        body: { propertyId },
      });

      if (error || !data?.url) {
        console.error('Failed to get Salesforce OAuth URL:', error);
        toast.error('Failed to start Salesforce connection');
        setConnecting(false);
        return;
      }

      // Open OAuth popup
      window.open(data.url, '_blank', 'width=600,height=700');
    } catch (err) {
      console.error('Error connecting to Salesforce:', err);
      toast.error('Failed to connect to Salesforce');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!config?.id) return;

    const { error } = await supabase
      .from('salesforce_settings')
      .update({
        access_token: null,
        refresh_token: null,
        instance_url: null,
        token_expires_at: null,
      })
      .eq('id', config.id);

    if (error) {
      toast.error('Failed to disconnect Salesforce');
      return;
    }

    setConfig({
      ...config,
      instance_url: null,
    });

    toast.success('Salesforce disconnected');
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

  const isConnected = !!config?.instance_url;

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
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          {isConnected ? (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Connected to Salesforce</p>
                <p className="text-sm text-muted-foreground">{config?.instance_url}</p>
              </div>
              <Button variant="outline" size="sm" className="text-destructive" onClick={handleDisconnect}>
                <Unlink className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 border rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="font-medium mb-1">Connect to Salesforce</p>
                <p className="text-sm text-muted-foreground">
                  Click the button below to connect your Salesforce account
                </p>
              </div>
              <Button onClick={handleConnectSalesforce} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.16 5.22h-.54c-.18 1.17-.54 2.19-1.08 3.06a4.74 4.74 0 0 1-4.02 2.16 4.86 4.86 0 0 1-4.8-4.02c-.21.03-.42.045-.63.045a4.47 4.47 0 0 1-4.47-4.5c0-1.65.9-3.09 2.22-3.87a6.12 6.12 0 0 1-.12-1.17c0-3.24 2.58-5.88 5.76-5.88 1.53 0 2.91.6 3.93 1.59l-.12-.27z"/>
                  </svg>
                )}
                Connect Salesforce
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
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, auto_export_on_escalation: checked } : {
                id: '',
                enabled: false,
                instance_url: null,
                auto_export_on_escalation: checked,
                auto_export_on_conversation_end: false,
                field_mappings: {},
              })}
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
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, auto_export_on_conversation_end: checked } : {
                id: '',
                enabled: false,
                instance_url: null,
                auto_export_on_escalation: false,
                auto_export_on_conversation_end: checked,
                field_mappings: {},
              })}
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
