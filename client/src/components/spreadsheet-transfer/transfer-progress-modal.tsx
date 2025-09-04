import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TransferProgress } from "@/types/spreadsheet";

interface TransferProgressModalProps {
  isOpen: boolean;
  progress: TransferProgress | null;
}

export function TransferProgressModal({ isOpen, progress }: TransferProgressModalProps) {
  if (!progress) return null;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="glass-modal max-w-md modal-enter">
        <DialogHeader>
          <DialogTitle>Transfer in Progress</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full loading-spinner" />
            <p className="text-lg font-medium" data-testid="progress-message">
              {progress.message}
            </p>
            <p className="text-sm text-muted-foreground mt-1" data-testid="progress-details">
              {progress.details}
            </p>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span data-testid="progress-percentage">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-secondary/30 rounded-full h-2">
              <div 
                className="progress-bar bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
                data-testid="progress-bar"
              />
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processed:</span>
              <span data-testid="progress-processed">{progress.processed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duplicates found:</span>
              <span data-testid="progress-duplicates">{progress.duplicates}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
