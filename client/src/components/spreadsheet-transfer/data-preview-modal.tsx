import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PreviewData } from "@/types/spreadsheet";

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: PreviewData | null;
}

export function DataPreviewModal({ isOpen, onClose, onConfirm, data }: DataPreviewModalProps) {
  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-modal max-w-5xl max-h-[80vh] modal-enter">
        <DialogHeader>
          <DialogTitle className="text-xl">Data Preview</DialogTitle>
          <p className="text-sm text-muted-foreground">
            <span data-testid="preview-row-count">{data.rowCount}</span> rows found for selected date range
          </p>
        </DialogHeader>
        
        <ScrollArea className="max-h-96 w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {data.headers.map((header, index) => (
                    <th key={index} className="text-left p-3 font-medium whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border/50 hover:bg-secondary/20">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-3 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.rows.length > 10 && (
                  <tr>
                    <td colSpan={data.headers.length} className="p-3 text-center text-muted-foreground">
                      ... and {data.rows.length - 10} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-preview-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className="gradient-button"
            data-testid="button-preview-confirm"
          >
            Use This Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
