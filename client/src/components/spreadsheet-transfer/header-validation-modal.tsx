import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { HeaderMismatch } from "@/types/spreadsheet";

interface HeaderValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFixHeaders: () => void;
  mismatch: HeaderMismatch | null;
}

export function HeaderValidationModal({ 
  isOpen, 
  onClose, 
  onFixHeaders, 
  mismatch 
}: HeaderValidationModalProps) {
  if (!mismatch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-modal max-w-2xl modal-enter">
        <DialogHeader>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center mr-3">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <DialogTitle className="text-xl">Header Validation</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Header mismatches detected between source and destination
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-green-400 mb-2">Expected Headers:</h4>
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="flex flex-wrap gap-2">
                {mismatch.expected.map((header, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs"
                    data-testid={`expected-header-${index}`}
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {mismatch.missing.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-red-400 mb-2">Missing Headers:</h4>
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="flex flex-wrap gap-2">
                  {mismatch.missing.map((header, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs"
                      data-testid={`missing-header-${index}`}
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {mismatch.extra.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-amber-400 mb-2">Extra Headers:</h4>
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="flex flex-wrap gap-2">
                  {mismatch.extra.map((header, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs"
                      data-testid={`extra-header-${index}`}
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-header-validation-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={onFixHeaders}
            className="gradient-button"
            data-testid="button-fix-headers"
          >
            Fix Headers
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
