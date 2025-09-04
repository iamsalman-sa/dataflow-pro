import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Spreadsheet, Sheet, TransferData, PreviewData, TransferProgress, HeaderMismatch } from "@/types/spreadsheet";

export function useSpreadsheets() {
  return useQuery<Spreadsheet[]>({
    queryKey: ['/api/spreadsheets'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSheets(spreadsheetId: string | null) {
  return useQuery<Sheet[]>({
    queryKey: ['/api/spreadsheets', spreadsheetId, 'sheets'],
    enabled: !!spreadsheetId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFilteredData() {
  return useMutation<PreviewData, Error, { 
    spreadsheetId: string; 
    sheetName: string; 
    fromDate: string; 
    toDate: string; 
  }>({
    mutationFn: async (params) => {
      const res = await apiRequest('POST', '/api/spreadsheets/filtered-data', params);
      return res.json();
    },
  });
}

export function useCreateSpreadsheet() {
  const queryClient = useQueryClient();
  
  return useMutation<Spreadsheet, Error, { name: string; sheetName: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/spreadsheets', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });
    },
  });
}

export function useCreateSheet() {
  const queryClient = useQueryClient();
  
  return useMutation<Sheet, Error, { spreadsheetId: string; sheetName: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/spreadsheets/sheets', data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/spreadsheets', variables.spreadsheetId, 'sheets'] 
      });
    },
  });
}

export function useValidateHeaders() {
  return useMutation<HeaderMismatch | null, Error, {
    sourceSpreadsheetId: string;
    sourceSheetName: string;
    destSpreadsheetId: string;
    destSheetName: string;
  }>({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/spreadsheets/validate-headers', data);
      return res.json();
    },
  });
}

export function useTransferData() {
  return useMutation<{ success: boolean; message: string }, Error, TransferData>({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/spreadsheets/transfer', data);
      return res.json();
    },
  });
}

export function useTransferProgress(transferId: string | null) {
  return useQuery<TransferProgress>({
    queryKey: ['/api/transfers', transferId, 'progress'],
    enabled: !!transferId,
    refetchInterval: 1000, // Poll every second during transfer
    staleTime: 0,
  });
}
