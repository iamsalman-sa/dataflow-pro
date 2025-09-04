import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rowCount: number;
  mode: 'copy' | 'move';
}

export function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  rowCount, 
  mode 
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-modal max-w-md modal-enter">
        <DialogHeader>
          <DialogTitle>Confirm Transfer</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to proceed with this data transfer? This action will transfer{' '}
            <span className="text-white font-medium" data-testid="confirmation-row-count">
              {rowCount}
            </span>{' '}
            rows from the source to destination.
          </p>
          
          {mode === 'move' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-amber-300 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-300">
                  <strong>Note:</strong> Since Move mode is selected, data will be deleted from the source after transfer.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-transfer"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className="gradient-button-green"
            data-testid="button-confirm-transfer"
          >
            Confirm Transfer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
