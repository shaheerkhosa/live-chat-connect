import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Upload, Users, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VisitorLeadsTableProps {
  propertyId: string;
}

interface Visitor {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  gclid: string | null;
  drug_of_choice: string | null;
  treatment_interest: string | null;
  insurance_info: string | null;
  urgency_level: string | null;
  created_at: string;
  exported?: boolean;
}

export const VisitorLeadsTable = ({ propertyId }: VisitorLeadsTableProps) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchVisitors();
    fetchExportedVisitors();
  }, [propertyId]);

  const fetchVisitors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching visitors:', error);
      toast.error('Failed to load visitors');
    } else {
      setVisitors(data || []);
    }
    setLoading(false);
  };

  const fetchExportedVisitors = async () => {
    // Get all conversations for this property to check which visitors have been exported
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, visitor_id')
      .eq('property_id', propertyId);

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      const { data: exports } = await supabase
        .from('salesforce_exports')
        .select('conversation_id')
        .in('conversation_id', conversationIds);

      if (exports) {
        const exportedConvIds = new Set(exports.map(e => e.conversation_id));
        const exportedVisitorIds = new Set(
          conversations
            .filter(c => exportedConvIds.has(c.id))
            .map(c => c.visitor_id)
        );
        setExportedIds(exportedVisitorIds);
      }
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visitors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visitors.map(v => v.id)));
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one visitor to export');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('salesforce-export-leads', {
        body: { 
          propertyId,
          visitorIds: Array.from(selectedIds)
        },
      });

      if (error) {
        console.error('Export error:', error);
        toast.error('Failed to export leads to Salesforce');
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Successfully exported ${data?.exported || selectedIds.size} leads to Salesforce`);
        setSelectedIds(new Set());
        fetchExportedVisitors();
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export leads');
    }
    setExporting(false);
  };

  const getUrgencyBadge = (level: string | null) => {
    if (!level) return null;
    const variant = level.toLowerCase().includes('high') || level.toLowerCase().includes('urgent')
      ? 'destructive'
      : level.toLowerCase().includes('medium')
      ? 'default'
      : 'secondary';
    return <Badge variant={variant}>{level}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Visitor Leads
            </CardTitle>
            <CardDescription>
              View and export visitor data to Salesforce
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchVisitors}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={selectedIds.size === 0 || exporting}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Export Selected ({selectedIds.size})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visitors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No visitors yet</p>
            <p className="text-sm">Visitors will appear here when they chat on your site</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === visitors.length && visitors.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Treatment Interest</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(visitor.id)}
                        onCheckedChange={() => toggleSelect(visitor.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {visitor.name || <span className="text-muted-foreground">Unknown</span>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {visitor.email && <div className="text-sm">{visitor.email}</div>}
                        {visitor.phone && <div className="text-sm text-muted-foreground">{visitor.phone}</div>}
                        {!visitor.email && !visitor.phone && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {visitor.location || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {visitor.treatment_interest && (
                          <div className="text-sm">{visitor.treatment_interest}</div>
                        )}
                        {visitor.drug_of_choice && (
                          <div className="text-xs text-muted-foreground">{visitor.drug_of_choice}</div>
                        )}
                        {!visitor.treatment_interest && !visitor.drug_of_choice && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getUrgencyBadge(visitor.urgency_level) || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {exportedIds.has(visitor.id) ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Exported
                        </Badge>
                      ) : (
                        <Badge variant="secondary">New</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(visitor.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
