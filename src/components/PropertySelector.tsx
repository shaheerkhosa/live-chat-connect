import { useState } from 'react';
import { Building2, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DbProperty } from '@/hooks/useConversations';

interface PropertySelectorProps {
  properties: DbProperty[];
  selectedPropertyId?: string;
  onPropertyChange: (propertyId: string) => void;
  onDeleteProperty: (propertyId: string) => Promise<boolean>;
  showDomain?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const PropertySelector = ({
  properties,
  selectedPropertyId,
  onPropertyChange,
  onDeleteProperty,
  showDomain = false,
  showIcon = true,
  className = 'w-[220px]',
}: PropertySelectorProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<DbProperty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, property: DbProperty) => {
    e.preventDefault();
    e.stopPropagation();
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
    
    setIsDeleting(true);
    const success = await onDeleteProperty(propertyToDelete.id);
    setIsDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
      
      // If deleted property was selected, select the first available
      if (selectedPropertyId === propertyToDelete.id && properties.length > 1) {
        const remaining = properties.filter(p => p.id !== propertyToDelete.id);
        if (remaining.length > 0) {
          onPropertyChange(remaining[0].id);
        }
      }
    }
  };

  const getPropertyLabel = (property: DbProperty) => {
    return showDomain ? `${property.name} (${property.domain})` : property.name;
  };

  return (
    <>
      <Select value={selectedPropertyId} onValueChange={onPropertyChange}>
        <SelectTrigger className={className}>
          {showIcon && <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />}
          <SelectValue placeholder="Select property" />
        </SelectTrigger>
        <SelectContent>
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id} className="pr-2">
              <div className="flex items-center justify-between w-full gap-2">
                <span className="truncate">{getPropertyLabel(property)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => handleDeleteClick(e, property)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{propertyToDelete?.name}"? This will also delete all conversations, messages, and analytics data associated with this property. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
