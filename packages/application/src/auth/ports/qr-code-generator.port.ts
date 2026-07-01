export interface IQrCodeGeneratorPort {
  toDataUrl(content: string): Promise<string>;
}
