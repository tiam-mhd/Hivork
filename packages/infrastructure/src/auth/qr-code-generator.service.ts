import type { IQrCodeGeneratorPort } from '@hivork/application';
import QRCode from 'qrcode';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QrCodeGeneratorService implements IQrCodeGeneratorPort {
  async toDataUrl(content: string): Promise<string> {
    return QRCode.toDataURL(content, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
    });
  }
}
