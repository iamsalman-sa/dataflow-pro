import { Info } from "lucide-react";
import type { TransferStats } from "@/types/spreadsheet";

interface StatusSectionProps {
  stats: TransferStats;
}

export function StatusSection({ stats }: StatusSectionProps) {
  return (
    <div className="glass-card rounded-lg p-6 mb-8">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mr-3">
          <Info className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-xl font-semibold">Transfer Status</h2>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-secondary/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-400" data-testid="stat-source-rows">
            {stats.sourceRows}
          </div>
          <div className="text-sm text-muted-foreground">Source Rows</div>
        </div>
        
        <div className="text-center p-4 bg-secondary/30 rounded-lg">
          <div className="text-2xl font-bold text-green-400" data-testid="stat-transferred-rows">
            {stats.transferredRows}
          </div>
          <div className="text-sm text-muted-foreground">Transferred</div>
        </div>
        
        <div className="text-center p-4 bg-secondary/30 rounded-lg">
          <div className="text-2xl font-bold text-amber-400" data-testid="stat-duplicates">
            {stats.duplicates}
          </div>
          <div className="text-sm text-muted-foreground">Duplicates</div>
        </div>
      </div>
    </div>
  );
}
