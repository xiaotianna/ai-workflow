import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { useState } from 'react'

export function AuthForm() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const isFormValid = Boolean(phone.trim() && password)

  return (
    <Form onSubmit={(event) => event.preventDefault()}>
      <Form.Field required label="手机号">
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-label="手机号"
          placeholder="输入手机号"
          className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
        />
      </Form.Field>

      <Form.Field required label="密码">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-label="密码"
          placeholder="输入密码"
          className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
        />
      </Form.Field>

      <Button type="submit" variant="confirm" size="sm" disabled={!isFormValid} className="w-full">
        登录
      </Button>
    </Form>
  )
}
