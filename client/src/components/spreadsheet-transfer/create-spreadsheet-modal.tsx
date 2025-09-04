import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSpreadsheet } from "@/hooks/use-spreadsheet-api";
import { useToast } from "@/hooks/use-toast";

interface CreateSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSpreadsheetModal({ isOpen, onClose, onSuccess }: CreateSpreadsheetModalProps) {
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [sheetName, setSheetName] = useState("");
  
  const { toast } = useToast();
  const createSpreadsheetMutation = useCreateSpreadsheet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!spreadsheetName.trim() || !sheetName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both spreadsheet and sheet names.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createSpreadsheetMutation.mutateAsync({
        name: spreadsheetName.trim(),
        sheetName: sheetName.trim()
      });
      
      toast({
        title: "Spreadsheet Created",
        description: `Successfully created "${spreadsheetName}".`,
      });
      
      setSpreadsheetName("");
      setSheetName("");
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Failed to Create Spreadsheet",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setSpreadsheetName("");
    setSheetName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-modal max-w-md modal-enter">
        <DialogHeader>
          <DialogTitle>Create New Spreadsheet</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="spreadsheet-name" className="text-sm font-medium">
              Spreadsheet Name
            </Label>
            <Input
              id="spreadsheet-name"
              type="text"
              value={spreadsheetName}
              onChange={(e) => setSpreadsheetName(e.target.value)}
              placeholder="Enter spreadsheet name..."
              className="mt-2 bg-input border-border"
              data-testid="input-spreadsheet-name"
            />
          </div>
          
          <div>
            <Label htmlFor="sheet-name" className="text-sm font-medium">
              Initial Sheet Name
            </Label>
            <Input
              id="sheet-name"
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Enter sheet name..."
              className="mt-2 bg-input border-border"
              data-testid="input-initial-sheet-name"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleClose}
              data-testid="button-create-spreadsheet-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createSpreadsheetMutation.isPending}
              className="gradient-button"
              data-testid="button-create-spreadsheet-confirm"
            >
              {createSpreadsheetMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
