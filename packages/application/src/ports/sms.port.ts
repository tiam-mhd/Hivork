export interface ISmsPort {
  send(to: string, message: string): Promise<void>;
}
