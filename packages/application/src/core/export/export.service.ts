import ExcelJS from 'exceljs';
import { PassThrough } from 'node:stream';

export const EXPORT_BATCH_SIZE = 500;

export type ExportColumnDef<T> = {
  id: string;
  header: string;
  headerEn?: string;
  accessor: (row: T) => string | number | Date | null | undefined;
  width?: number;
  moneyRial?: boolean;
};

export type ExportToXlsxParams<T> = {
  sheetName: string;
  columns: ExportColumnDef<T>[];
  moneyHeaderNote?: string;
  fetchBatch: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>;
  maxRows: number;
};

export type ExportToXlsxResult = {
  stream: PassThrough;
};

export class ExportService {
  async exportToXlsx<T>(params: ExportToXlsxParams<T>): Promise<ExportToXlsxResult> {
    const stream = new PassThrough();
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet(params.sheetName);

    if (params.moneyHeaderNote) {
      const noteRow = worksheet.addRow([params.moneyHeaderNote]);
      noteRow.commit();
    }

    const headerRow = worksheet.addRow(params.columns.map((column) => column.header));
    headerRow.font = { bold: true };
    headerRow.commit();

    params.columns.forEach((column, index) => {
      if (column.width) {
        worksheet.getColumn(index + 1).width = column.width;
      }
    });

    void this.writeBatches(workbook, worksheet, params).catch((error) => {
      stream.destroy(error instanceof Error ? error : new Error(String(error)));
    });

    return { stream };
  }

  private async writeBatches<T>(
    workbook: ExcelJS.stream.xlsx.WorkbookWriter,
    worksheet: ExcelJS.Worksheet,
    params: ExportToXlsxParams<T>,
  ): Promise<number> {
    let rowCount = 0;
    let cursor: string | null = null;

    try {
      do {
        const batch = await params.fetchBatch(cursor);
        for (const item of batch.items) {
          if (rowCount >= params.maxRows) {
            break;
          }

          const values = params.columns.map((column) => {
            const value = column.accessor(item);
            if (value instanceof Date) {
              return value;
            }
            return value ?? '';
          });

          worksheet.addRow(values).commit();
          rowCount++;
        }

        cursor = batch.nextCursor;
      } while (cursor && rowCount < params.maxRows);

      await workbook.commit();
      return rowCount;
    } catch (error) {
      throw error;
    }
  }
}
