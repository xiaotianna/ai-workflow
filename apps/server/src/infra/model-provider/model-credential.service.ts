import { MODEL_CREDENTIAL_ENCRYPTION_KEY, JWT_SECRET } from '@/constant/env'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

const CREDENTIAL_KEY_VERSION = 1,
  CREDENTIAL_ALGORITHM = 'aes-256-gcm'

export interface EncryptedModelCredential {
  ciphertext: Uint8Array<ArrayBuffer>
  iv: Uint8Array<ArrayBuffer>
  authTag: Uint8Array<ArrayBuffer>
  keyVersion: number
}

export interface StoredModelCredential {
  apiKeyCiphertext: Uint8Array<ArrayBuffer> | null
  apiKeyIv: Uint8Array<ArrayBuffer> | null
  apiKeyAuthTag: Uint8Array<ArrayBuffer> | null
  credentialKeyVersion: number | null
}

@Injectable()
export class ModelCredentialService {
  private readonly key: Buffer

  constructor(configService: ConfigService) {
    const configuredKey = configService.get<string>(MODEL_CREDENTIAL_ENCRYPTION_KEY)

    this.key = configuredKey
      ? Buffer.from(configuredKey, 'base64')
      : Buffer.from(
          hkdfSync(
            'sha256',
            configService.getOrThrow<string>(JWT_SECRET),
            'ai-workflow:model-credentials',
            'aes-256-gcm:v1',
            32,
          ),
        )
  }

  encrypt(apiKey: string, groupId: string): EncryptedModelCredential {
    const iv = randomBytes(12),
      cipher = createCipheriv(CREDENTIAL_ALGORITHM, this.key, iv)
    cipher.setAAD(Buffer.from(groupId))
    const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])

    return {
      ciphertext: Uint8Array.from(ciphertext),
      iv: Uint8Array.from(iv),
      authTag: Uint8Array.from(cipher.getAuthTag()),
      keyVersion: CREDENTIAL_KEY_VERSION,
    }
  }

  decrypt(credential: StoredModelCredential, groupId: string): string | undefined {
    if (
      !credential.apiKeyCiphertext ||
      !credential.apiKeyIv ||
      !credential.apiKeyAuthTag ||
      credential.credentialKeyVersion === null
    ) {
      return undefined
    }

    if (credential.credentialKeyVersion !== CREDENTIAL_KEY_VERSION) {
      throw new Error('不支持当前模型凭证密钥版本')
    }

    const decipher = createDecipheriv(
      CREDENTIAL_ALGORITHM,
      this.key,
      Buffer.from(credential.apiKeyIv),
    )
    decipher.setAAD(Buffer.from(groupId))
    decipher.setAuthTag(Buffer.from(credential.apiKeyAuthTag))

    return Buffer.concat([
      decipher.update(Buffer.from(credential.apiKeyCiphertext)),
      decipher.final(),
    ]).toString('utf8')
  }
}
