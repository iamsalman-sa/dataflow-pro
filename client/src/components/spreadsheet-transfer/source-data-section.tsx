import { useState } from "react";
import { Folder, Eye } from "lucide-react";
import { SearchableDropdown } from "./searchable-dropdown";
import { useSpreadsheets, useSheets, useFilteredData } from "@/hooks/use-spreadsheet-api";
import { useToast } from "@/hooks/use-toast";
import type { Spreadsheet, Sheet, PreviewData } from "@/types/spreadsheet";

interface SourceDataSectionProps {
  onPreviewData: (data: PreviewData) => void;
  onSourceChange: (spreadsheet: Spreadsheet, sheet: Sheet) => void;
}

export function SourceDataSection({ onPreviewData, onSourceChange }: SourceDataSectionProps) {
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<Spreadsheet | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const { toast } = useToast();
  
  const { data: spreadsheets = [], isLoading: spreadsheetsLoading } = useSpreadsheets();
  const { data: sheets = [], isLoading: sheetsLoading } = useSheets(selectedSpreadsheet?.id || null);
  const filteredDataMutation = useFilteredData();

  const handleSpreadsheetChange = (spreadsheet: Spreadsheet) => {
    setSelectedSpreadsheet(spreadsheet);
    setSelectedSheet(null);
  };

  const handleSheetChange = (sheet: Sheet) => {
    setSelectedSheet(sheet);
    if (selectedSpreadsheet) {
      onSourceChange(selectedSpreadsheet, sheet);
    }
  };

  const handleLoadAndPreview = async () => {
    if (!selectedSpreadsheet || !selectedSheet || !fromDate || !toDate) {
      toast({
        title: "Missing Information",
        description: "Please select spreadsheet, sheet, and date range.",
        variant: "destructive"
      });
      return;
    }

    try {
      const data = await filteredDataMutation.mutateAsync({
        spreadsheetId: selectedSpreadsheet.id,
        sheetName: selectedSheet.name,
        fromDate,
        toDate
      });
      
      onPreviewData(data);
      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${data.rowCount} rows.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Load Data",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="glass-card rounded-lg p-6">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mr-3">
          <Folder className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-xl font-semibold">Source Data</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Source Spreadsheet</label>
          <SearchableDropdown
            options={spreadsheets}
            value={selectedSpreadsheet}
            onChange={handleSpreadsheetChange}
            placeholder="Select spreadsheet..."
            isLoading={spreadsheetsLoading}
            data-testid="dropdown-source-spreadsheet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Source Sheet</label>
          <SearchableDropdown
            options={sheets}
            value={selectedSheet}
            onChange={handleSheetChange}
            placeholder="Select sheet..."
            isLoading={sheetsLoading}
            data-testid="dropdown-source-sheet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-input border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-from-date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-input border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-to-date"
            />
          </div>
        </div>

        <button
          onClick={handleLoadAndPreview}
          disabled={filteredDataMutation.isPending || !selectedSpreadsheet || !selectedSheet || !fromDate || !toDate}
          className="gradient-button w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
          data-testid="button-load-preview"
        >
          {filteredDataMutation.isPending ? (
            <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <span>Load & Preview</span>
              <Eye className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
