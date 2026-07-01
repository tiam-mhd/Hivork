export type { IPasswordHasher } from '@hivork/domain';

export interface IPasswordHasherPort {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
