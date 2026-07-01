import * as argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import type { IPasswordHasherPort } from '@hivork/application';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class Argon2PasswordHasher implements IPasswordHasherPort {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
