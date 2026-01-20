import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, 
  Plus,
  Loader2,
  Settings,
  Users,
} from 'lucide-react';
import { SalesforceSettings } from '@/components/settings/SalesforceSettings';
import { VisitorLeadsTable } from '@/components/settings/VisitorLeadsTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

const Salesforce = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { properties, createProperty, deleteProperty } = useConversations();
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  
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
      toast.success('Property created successfully');
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
    <div className="flex h-screen bg-sidebar">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PageHeader title="Salesforce" docsLink="/documentation/integrations/salesforce" />

        {/* Content */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto space-y-6">

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

              {selectedPropertyId && (
                <Tabs defaultValue="leads" className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="leads" className="gap-2">
                      <Users className="h-4 w-4" />
                      Visitor Leads
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="leads">
                    <VisitorLeadsTable propertyId={selectedPropertyId} />
                  </TabsContent>
                  
                  <TabsContent value="settings">
                    <SalesforceSettings propertyId={selectedPropertyId} />
                  </TabsContent>
                </Tabs>
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
      </div>
    </div>
  );
};

export default Salesforce;
