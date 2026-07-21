import { useState } from 'react'

import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Separator } from '@ai-workflow/ui/components/separator'

export default function AuthPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  return (
    <main className="h-svh w-svw bg-[#edeef2] p-3 sm:p-6">
      <div className="border-border/50 bg-background relative flex h-full w-full shrink-0 items-center justify-center rounded-2xl border px-5">
        <img
          src="/logo.svg"
          alt="AI Workflow"
          className="absolute top-5 left-5 size-12 object-contain"
        />

        <section className="w-full max-w-100 translate-y-[-1vh]" aria-labelledby="auth-title">
          <header className="mb-4">
            <h1
              id="auth-title"
              className="text-foreground text-2xl leading-tight font-semibold tracking-[-0.03em]"
            >
              登录
            </h1>
            <p className="text-muted-foreground mt-3 text-sm leading-5">
              👋 欢迎！请登录以开始使用。
            </p>
          </header>

          <form className="space-y-2" onSubmit={(event) => event.preventDefault()}>
            <div className="flex flex-col space-y-1">
              <label htmlFor="phone" className="text-foreground text-sm font-medium">
                手机号
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="输入手机号"
                className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label htmlFor="password" className="text-foreground text-sm font-medium">
                密码
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="输入密码"
                className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
              />
            </div>

            <Button
              type="submit"
              disabled={!phone.trim() || !password}
              className="h-8 w-full rounded-lg text-sm font-medium disabled:bg-[#dce3ff] disabled:opacity-100"
            >
              登录
            </Button>
          </form>
          <Separator
            className="mx-auto mt-4 w-[20%]"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, var(--border) 30%, var(--border) 70%, transparent 100%)',
            }}
          />

          <p className="text-muted-foreground mt-2 text-center text-xs">
            未注册用户将自动注册并登录
          </p>
        </section>
      </div>
    </main>
  )
}
