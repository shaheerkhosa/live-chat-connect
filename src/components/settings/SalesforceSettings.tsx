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
import { Loader2, Link2, Unlink, Save, Plus, Trash2 } from 'lucide-react';

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
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

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
        <CardContent className="space-y-4">
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
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-muted-foreground text-center">
                Connect your Salesforce account to start exporting conversation leads.
              </p>
              <Button>
                <Link2 className="mr-2 h-4 w-4" />
                Connect Salesforce
              </Button>
              <p className="text-xs text-muted-foreground">
                OAuth credentials need to be configured in the backend
              </p>
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
