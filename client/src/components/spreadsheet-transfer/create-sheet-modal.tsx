import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSheet } from "@/hooks/use-spreadsheet-api";
import { useToast } from "@/hooks/use-toast";

interface CreateSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  spreadsheetId: string | null;
}

export function CreateSheetModal({ isOpen, onClose, onSuccess, spreadsheetId }: CreateSheetModalProps) {
  const [sheetName, setSheetName] = useState("");
  
  const { toast } = useToast();
  const createSheetMutation = useCreateSheet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sheetName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a sheet name.",
        variant: "destructive"
      });
      return;
    }

    if (!spreadsheetId) {
      toast({
        title: "No Spreadsheet Selected",
        description: "Please select a spreadsheet first.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createSheetMutation.mutateAsync({
        spreadsheetId,
        sheetName: sheetName.trim()
      });
      
      toast({
        title: "Sheet Created",
        description: `Successfully created "${sheetName}".`,
      });
      
      setSheetName("");
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Failed to Create Sheet",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setSheetName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-modal max-w-md modal-enter">
        <DialogHeader>
          <DialogTitle>Create New Sheet</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sheet-name" className="text-sm font-medium">
              Sheet Name
            </Label>
            <Input
              id="sheet-name"
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Enter sheet name..."
              className="mt-2 bg-input border-border"
              data-testid="input-sheet-name"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleClose}
              data-testid="button-create-sheet-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createSheetMutation.isPending}
              className="gradient-button"
              data-testid="button-create-sheet-confirm"
            >
              {createSheetMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
