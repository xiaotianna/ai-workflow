import { CanActivate, Injectable } from '@nestjs/common'

@Injectable()
// CanActivate判断是否能进入controller，为true可以
export class JwtAuthGuard implements CanActivate {
  // constructor(private readonly ) {}
  canActivate() {
    return true
  }
}
