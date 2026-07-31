import { MODEL_CONNECTION_PRIVATE_HOSTS } from '@/constant/env'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

@Injectable()
export class ModelEndpointPolicyService {
  private readonly privateHostAllowlist: ReadonlySet<string>

  constructor(configService: ConfigService) {
    const configuredHosts = configService.get<string>(MODEL_CONNECTION_PRIVATE_HOSTS) ?? ''
    this.privateHostAllowlist = new Set(
      configuredHosts
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean),
    )
  }

  async assertAllowed(url: URL): Promise<void> {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestException('模型服务地址只支持 HTTP 或 HTTPS')
    }

    if (url.username || url.password || url.search || url.hash) {
      throw new BadRequestException('模型服务地址不能包含凭证、查询参数或片段')
    }

    if (this.isAllowlisted(url)) return

    const hostname = url.hostname.toLowerCase()
    const literalAddress = isIP(hostname) ? hostname : undefined

    if (literalAddress) {
      if (isPrivateOrReservedAddress(literalAddress)) {
        throw new BadRequestException('当前模型服务地址属于受限网络，请先配置私有地址白名单')
      }
      return
    }

    let addresses: Array<{ address: string; family: number }>

    try {
      addresses = await lookup(hostname, { all: true, verbatim: true })
    } catch {
      // DNS 失败由实际探测请求转换为可读的连通性结果。
      return
    }

    if (addresses.some(({ address }) => isPrivateOrReservedAddress(address))) {
      throw new BadRequestException('当前模型服务地址解析到受限网络，请先配置私有地址白名单')
    }
  }

  private isAllowlisted(url: URL): boolean {
    return (
      this.privateHostAllowlist.has(url.host.toLowerCase()) ||
      this.privateHostAllowlist.has(url.hostname.toLowerCase())
    )
  }
}

function isPrivateOrReservedAddress(address: string): boolean {
  if (isIP(address) === 4) return isPrivateOrReservedIpv4(address)

  const normalizedAddress = address.toLowerCase()

  if (normalizedAddress.startsWith('::ffff:')) {
    return isPrivateOrReservedIpv4(normalizedAddress.slice('::ffff:'.length))
  }

  return (
    normalizedAddress === '::' ||
    normalizedAddress === '::1' ||
    normalizedAddress.startsWith('fc') ||
    normalizedAddress.startsWith('fd') ||
    /^fe[89ab]/.test(normalizedAddress) ||
    normalizedAddress.startsWith('2001:db8:')
  )
}

function isPrivateOrReservedIpv4(address: string): boolean {
  const octets = address.split('.').map(Number)

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true

  const [first, second, third] = octets

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  )
}
