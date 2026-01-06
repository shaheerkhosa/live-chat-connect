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
import { 
  Globe, 
  Plus,
  Save,
  Loader2,
  Cloud,
  MessageCircle,
  Mail
} from 'lucide-react';
import { SalesforceSettings } from '@/components/settings/SalesforceSettings';
import { SlackSettings } from '@/components/settings/SlackSettings';
import { EmailSettings } from '@/components/settings/EmailSettings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface PropertyInfo {
  id: string;
  name: string;
  domain: string;
  greeting: string | null;
  offline_message: string | null;
}

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { properties, createProperty, deleteProperty } = useConversations();
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
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

  // Fetch property info
  useEffect(() => {
    const fetchPropertyInfo = async () => {
      if (!selectedPropertyId) return;

      const { data, error } = await supabase
        .from('properties')
        .select('id, name, domain, greeting, offline_message')
        .eq('id', selectedPropertyId)
        .single();

      if (error) {
        console.error('Error fetching property info:', error);
        return;
      }

      setPropertyInfo(data);
    };

    fetchPropertyInfo();
  }, [selectedPropertyId]);

  const handleSave = async () => {
    if (!propertyInfo) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({
        name: propertyInfo.name,
        domain: propertyInfo.domain,
        greeting: propertyInfo.greeting,
        offline_message: propertyInfo.offline_message,
      })
      .eq('id', propertyInfo.id);

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
              <p className="text-muted-foreground">Manage properties and integrations</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !propertyInfo}>
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

          {propertyInfo && (
            <Tabs defaultValue="property" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="property">
                  <Globe className="mr-2 h-4 w-4" />
                  Property
                </TabsTrigger>
                <TabsTrigger value="slack">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Slack
                </TabsTrigger>
                <TabsTrigger value="email">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="salesforce">
                  <Cloud className="mr-2 h-4 w-4" />
                  Salesforce
                </TabsTrigger>
              </TabsList>

              {/* Property Tab */}
              <TabsContent value="property" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                    <CardDescription>
                      Basic information about this property
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="property-name">Property Name</Label>
                        <Input
                          id="property-name"
                          value={propertyInfo.name}
                          onChange={(e) => setPropertyInfo({ ...propertyInfo, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="property-domain">Domain</Label>
                        <Input
                          id="property-domain"
                          value={propertyInfo.domain}
                          onChange={(e) => setPropertyInfo({ ...propertyInfo, domain: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Chat Messages</CardTitle>
                    <CardDescription>
                      Default messages shown in the chat widget
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="greeting">Greeting Message</Label>
                      <Input
                        id="greeting"
                        placeholder="Hi there! How can we help you today?"
                        value={propertyInfo.greeting || ''}
                        onChange={(e) => setPropertyInfo({ ...propertyInfo, greeting: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        First message visitors see when they open the chat
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="offline-message">Offline Message</Label>
                      <Input
                        id="offline-message"
                        placeholder="We're currently offline. Leave a message!"
                        value={propertyInfo.offline_message || ''}
                        onChange={(e) => setPropertyInfo({ ...propertyInfo, offline_message: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Shown when no agents are available
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Slack Tab */}
              <TabsContent value="slack">
                <SlackSettings propertyId={selectedPropertyId} />
              </TabsContent>

              {/* Email Tab */}
              <TabsContent value="email">
                <EmailSettings propertyId={selectedPropertyId} />
              </TabsContent>

              {/* Salesforce Tab */}
              <TabsContent value="salesforce">
                <SalesforceSettings propertyId={selectedPropertyId} />
              </TabsContent>

            </Tabs>
          )}

          {!propertyInfo && selectedPropertyId && (
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
                  Add your first property to get started
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
