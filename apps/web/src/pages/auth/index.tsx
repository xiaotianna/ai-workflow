import { Separator } from '@ai-workflow/ui/components/separator'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { login } from '@/api/auth'
import { AuthForm, hasAuthSession, saveAuthSession, type AuthFormValues } from '@/features/auth'

export default function AuthPage() {
  const navigate = useNavigate(),
    [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLogin(values: AuthFormValues) {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const session = await login(values)
      saveAuthSession(session)
      showToast('success', '登录成功')
      navigate('/', { replace: true })
    } catch {
      return
    } finally {
      setIsSubmitting(false)
    }
  }

  if (hasAuthSession()) {
    return <Navigate to="/" replace />
  }

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

          <AuthForm isSubmitting={isSubmitting} onSubmit={handleLogin} />
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
