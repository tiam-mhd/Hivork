export type PdfOrientation = 'portrait' | 'landscape';

export interface IPdfExportPort {
  htmlToPdf(html: string, options: { orientation: PdfOrientation }): Promise<Buffer>;
}

export const PDF_EXPORT_PORT = Symbol('PDF_EXPORT_PORT');
