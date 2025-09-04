import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SearchableDropdown } from "./searchable-dropdown";
import { useSpreadsheets, useSheets } from "@/hooks/use-spreadsheet-api";
import type { Spreadsheet, Sheet } from "@/types/spreadsheet";

interface DestinationSectionProps {
  onDestinationChange: (spreadsheet: Spreadsheet, sheet: Sheet) => void;
  onCreateSpreadsheet: () => void;
  onCreateSheet: () => void;
  onModeChange: (mode: 'copy' | 'move') => void;
  onExecuteTransfer: () => void;
  mode: 'copy' | 'move';
  canExecute: boolean;
}

export function DestinationSection({
  onDestinationChange,
  onCreateSpreadsheet,
  onCreateSheet,
  onModeChange,
  onExecuteTransfer,
  mode,
  canExecute
}: DestinationSectionProps) {
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<Spreadsheet | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);
  
  const { data: spreadsheets = [], isLoading: spreadsheetsLoading } = useSpreadsheets();
  const { data: sheets = [], isLoading: sheetsLoading } = useSheets(selectedSpreadsheet?.id || null);

  const handleSpreadsheetChange = (spreadsheet: Spreadsheet) => {
    setSelectedSpreadsheet(spreadsheet);
    setSelectedSheet(null);
  };

  const handleSheetChange = (sheet: Sheet) => {
    setSelectedSheet(sheet);
    if (selectedSpreadsheet) {
      onDestinationChange(selectedSpreadsheet, sheet);
    }
  };

  const handleModeToggle = (checked: boolean) => {
    onModeChange(checked ? 'move' : 'copy');
  };

  return (
    <div className="glass-card rounded-lg p-6">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3">
          <Download className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-xl font-semibold">Destination</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Destination Spreadsheet</label>
          <SearchableDropdown
            options={spreadsheets}
            value={selectedSpreadsheet}
            onChange={handleSpreadsheetChange}
            placeholder="Select spreadsheet..."
            isLoading={spreadsheetsLoading}
            data-testid="dropdown-dest-spreadsheet"
          />
          <button
            onClick={onCreateSpreadsheet}
            className="mt-2 text-sm text-accent hover:text-accent/80 flex items-center transition-colors"
            data-testid="button-create-spreadsheet"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create New Spreadsheet
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Destination Sheet</label>
          <SearchableDropdown
            options={sheets}
            value={selectedSheet}
            onChange={handleSheetChange}
            placeholder="Select sheet..."
            isLoading={sheetsLoading}
            data-testid="dropdown-dest-sheet"
          />
          <button
            onClick={onCreateSheet}
            disabled={!selectedSpreadsheet}
            className="mt-2 text-sm text-accent hover:text-accent/80 flex items-center transition-colors disabled:opacity-50"
            data-testid="button-create-sheet"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create New Sheet
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Transfer Mode</label>
          <div className="flex items-center space-x-3">
            <span className={`text-sm ${mode === 'copy' ? 'text-white' : 'text-muted-foreground'}`}>
              Copy
            </span>
            <Switch
              checked={mode === 'move'}
              onCheckedChange={handleModeToggle}
              data-testid="switch-transfer-mode"
            />
            <span className={`text-sm ${mode === 'move' ? 'text-white' : 'text-muted-foreground'}`}>
              Move
            </span>
          </div>
        </div>

        <button
          onClick={onExecuteTransfer}
          disabled={!canExecute}
          className="gradient-button-green w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
          data-testid="button-execute-transfer"
        >
          <span>Execute Transfer</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
