import { useState } from "react";
import { SourceDataSection } from "@/components/spreadsheet-transfer/source-data-section";
import { DestinationSection } from "@/components/spreadsheet-transfer/destination-section";
import { StatusSection } from "@/components/spreadsheet-transfer/status-section";
import { DataPreviewModal } from "@/components/spreadsheet-transfer/data-preview-modal";
import { CreateSpreadsheetModal } from "@/components/spreadsheet-transfer/create-spreadsheet-modal";
import { CreateSheetModal } from "@/components/spreadsheet-transfer/create-sheet-modal";
import { HeaderValidationModal } from "@/components/spreadsheet-transfer/header-validation-modal";
import { TransferProgressModal } from "@/components/spreadsheet-transfer/transfer-progress-modal";
import { ConfirmationDialog } from "@/components/spreadsheet-transfer/confirmation-dialog";
import { NotificationContainer, useNotifications } from "@/components/spreadsheet-transfer/notification-container";
import { useValidateHeaders, useTransferData, useTransferProgress } from "@/hooks/use-spreadsheet-api";
import type { Spreadsheet, Sheet, PreviewData, TransferStats, HeaderMismatch } from "@/types/spreadsheet";

export default function Dashboard() {
  // State management
  const [sourceSpreadsheet, setSourceSpreadsheet] = useState<Spreadsheet | null>(null);
  const [sourceSheet, setSourceSheet] = useState<Sheet | null>(null);
  const [destSpreadsheet, setDestSpreadsheet] = useState<Spreadsheet | null>(null);
  const [destSheet, setDestSheet] = useState<Sheet | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [transferMode, setTransferMode] = useState<'copy' | 'move'>('move');
  const [transferId, setTransferId] = useState<string | null>(null);
  
  // Modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCreateSpreadsheetModal, setShowCreateSpreadsheetModal] = useState(false);
  const [showCreateSheetModal, setShowCreateSheetModal] = useState(false);
  const [showHeaderValidationModal, setShowHeaderValidationModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
  // Data states
  const [headerMismatch, setHeaderMismatch] = useState<HeaderMismatch | null>(null);
  const [stats, setStats] = useState<TransferStats>({
    sourceRows: 0,
    transferredRows: 0,
    duplicates: 0
  });

  // Hooks
  const { notifications, addNotification, removeNotification } = useNotifications();
  const validateHeadersMutation = useValidateHeaders();
  const transferDataMutation = useTransferData();
  const { data: progressData } = useTransferProgress(transferId);

  // Handlers
  const handleSourceChange = (spreadsheet: Spreadsheet, sheet: Sheet) => {
    setSourceSpreadsheet(spreadsheet);
    setSourceSheet(sheet);
  };

  const handleDestinationChange = (spreadsheet: Spreadsheet, sheet: Sheet) => {
    setDestSpreadsheet(spreadsheet);
    setDestSheet(sheet);
  };

  const handlePreviewData = (data: PreviewData) => {
    setPreviewData(data);
    setShowPreviewModal(true);
    setStats(prev => ({ ...prev, sourceRows: data.rowCount }));
  };

  const handleConfirmPreview = () => {
    setShowPreviewModal(false);
    addNotification({
      type: 'success',
      title: 'Data Preview Confirmed',
      message: `Ready to transfer ${previewData?.rowCount || 0} rows.`
    });
  };

  const handleExecuteTransfer = async () => {
    if (!sourceSpreadsheet || !sourceSheet || !destSpreadsheet || !destSheet || !previewData) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please complete all required fields before transferring.'
      });
      return;
    }

    try {
      // Validate headers first
      const headerValidation = await validateHeadersMutation.mutateAsync({
        sourceSpreadsheetId: sourceSpreadsheet.id,
        sourceSheetName: sourceSheet.name,
        destSpreadsheetId: destSpreadsheet.id,
        destSheetName: destSheet.name
      });

      if (headerValidation) {
        setHeaderMismatch(headerValidation);
        setShowHeaderValidationModal(true);
        return;
      }

      // Show confirmation dialog
      setShowConfirmationDialog(true);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Header Validation Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleConfirmTransfer = async () => {
    setShowConfirmationDialog(false);
    
    if (!sourceSpreadsheet || !sourceSheet || !destSpreadsheet || !destSheet || !previewData) {
      return;
    }

    try {
      setShowProgressModal(true);
      
      const result = await transferDataMutation.mutateAsync({
        sourceSpreadsheetId: sourceSpreadsheet.id,
        sourceSheetName: sourceSheet.name,
        destinationSpreadsheetId: destSpreadsheet.id,
        destinationSheetName: destSheet.name,
        fromDate: '',
        toDate: '',
        mode: transferMode
      });

      setShowProgressModal(false);
      
      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Transfer Complete',
          message: result.message || 'Data transferred successfully.'
        });
        
        setStats(prev => ({ 
          ...prev, 
          transferredRows: previewData.rowCount,
          duplicates: 0 // This would come from the actual transfer result
        }));
      } else {
        addNotification({
          type: 'error',
          title: 'Transfer Failed',
          message: result.message || 'Transfer failed.'
        });
      }
    } catch (error) {
      setShowProgressModal(false);
      addNotification({
        type: 'error',
        title: 'Transfer Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleFixHeaders = () => {
    setShowHeaderValidationModal(false);
    addNotification({
      type: 'info',
      title: 'Header Fix Required',
      message: 'Please ensure both sheets have matching headers before proceeding.'
    });
  };

  const canExecuteTransfer = !!(
    sourceSpreadsheet && 
    sourceSheet && 
    destSpreadsheet && 
    destSheet && 
    previewData
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Spreadsheet Data Transfer Tool
          </h1>
          <p className="text-muted-foreground text-lg">
            Efficiently transfer and manage your spreadsheet data
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <SourceDataSection
            onPreviewData={handlePreviewData}
            onSourceChange={handleSourceChange}
          />
          
          <DestinationSection
            onDestinationChange={handleDestinationChange}
            onCreateSpreadsheet={() => setShowCreateSpreadsheetModal(true)}
            onCreateSheet={() => setShowCreateSheetModal(true)}
            onModeChange={setTransferMode}
            onExecuteTransfer={handleExecuteTransfer}
            mode={transferMode}
            canExecute={canExecuteTransfer}
          />
        </div>

        {/* Status Section */}
        <StatusSection stats={stats} />

        {/* Modals */}
        <DataPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          onConfirm={handleConfirmPreview}
          data={previewData}
        />

        <CreateSpreadsheetModal
          isOpen={showCreateSpreadsheetModal}
          onClose={() => setShowCreateSpreadsheetModal(false)}
          onSuccess={() => {}}
        />

        <CreateSheetModal
          isOpen={showCreateSheetModal}
          onClose={() => setShowCreateSheetModal(false)}
          onSuccess={() => {}}
          spreadsheetId={destSpreadsheet?.id || null}
        />

        <HeaderValidationModal
          isOpen={showHeaderValidationModal}
          onClose={() => setShowHeaderValidationModal(false)}
          onFixHeaders={handleFixHeaders}
          mismatch={headerMismatch}
        />

        <TransferProgressModal
          isOpen={showProgressModal}
          progress={progressData || null}
        />

        <ConfirmationDialog
          isOpen={showConfirmationDialog}
          onClose={() => setShowConfirmationDialog(false)}
          onConfirm={handleConfirmTransfer}
          rowCount={previewData?.rowCount || 0}
          mode={transferMode}
        />

        {/* Notifications */}
        <NotificationContainer
          notifications={notifications}
          onRemove={removeNotification}
        />
      </div>
    </div>
  );
}
