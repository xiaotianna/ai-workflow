# Code Executor 执行流程

可以把 Code Executor 里的三个角色理解成：

- [`runtime.go`](./runtime.go) 是外面的总管
- [`runner.mjs`](./runner.mjs) 是进入 Node 世界之后的执行助手
- 用户写的代码是被真正执行的业务代码

Go 自己不会执行 JavaScript，也不负责解释怎么 `import` ESM、怎么 `await main()`，所以需要 `runner.mjs` 帮它完成这些事情

## 第一步：Go 收到代码节点任务

例如用户写了：

```js
async function main({ arg1, arg2 }) {
  const res = await fetch('https://example.com/data')

  return {
    result: Number(arg1) + Number(arg2),
    res: await res.json(),
  }
}
```

`runtime.go` 会拿到两份东西：

```text
用户代码 source
输入参数 inputs
```

例如：

```json
{
  "arg1": "1",
  "arg2": "2"
}
```

## 第二步：Go 准备一个临时工作间

`runtime.go` 为本次执行创建独立临时目录：

```text
ai-workflow-code-node-xxxx/
├── runner.mjs
├── user-code.mjs
├── inputs.json
└── result.json
```

其中：

- `runner.mjs` 是项目内置的 Node 执行助手
- `user-code.mjs` 是用户写的代码
- `inputs.json` 是用户输入
- `result.json` 是 Node 最终交还给 Go 的结果

`result.json` 此时还不存在，要等 Node 执行完成后生成

## 第三步：Go 把 runner 写进临时目录

项目编译时，`runtime.go` 通过：

```go
//go:embed runner.mjs
var nodeRunnerSource []byte
```

把 `runner.mjs` 直接放进 Go 二进制

所以运行时不需要到项目目录寻找 `runner.mjs`，Go 会从自己内部取出来，然后写进临时目录

## 第四步：Go 包装用户代码

用户只需要写：

```js
async function main() {
  return {
    result: 123,
  }
}
```

不需要主动 `export main`

`runtime.go` 会在代码末尾追加：

```js
export { main as __aiWorkflowMain_6f7dd58d }
```

最终的 `user-code.mjs` 大概是：

```js
async function main() {
  return {
    result: 123,
  }
}

export { main as __aiWorkflowMain_6f7dd58d }
```

这个很长的名字是 Go 和 runner 之间约定的内部名称，主要是为了让 `runner.mjs` 稳定找到用户的 `main`

## 第五步：Go 启动 Node

准备完文件以后，`runtime.go` 实际执行的命令可以理解为：

```bash
node runner.mjs user-code.mjs inputs.json result.json 4194304
```

这些参数分别表示：

```text
runner.mjs       Node 执行入口
user-code.mjs    用户代码
inputs.json      main 函数输入
result.json      执行结果写到哪里
4194304          最大输出字节数
```

到这里，`runtime.go` 暂时停下来等待 Node 执行结束

## 第六步：runner 加载用户代码

Node 启动后，真正开始工作的就是 `runner.mjs`

它先读取：

```js
const userModulePath = process.argv[2]
const inputsPath = process.argv[3]
const resultPath = process.argv[4]
```

然后读取输入：

```js
const inputs = JSON.parse(await readFile(inputsPath, 'utf8'))
```

再通过 ESM 动态导入用户代码：

```js
const userModule = await import(moduleUrl)
```

这一步相当于：

```js
import('./user-code.mjs')
```

所以用户代码可以使用完整 ESM：

```js
import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
```

## 第七步：runner 找到并调用 main

runner 通过前面约定的内部名称找到 `main`：

```js
const main = userModule[MAIN_EXPORT_NAME]
```

然后执行：

```js
const outputs = await main(inputs)
```

这里最关键的是 `await`

所以无论用户写同步函数：

```js
function main() {
  return { result: 1 }
}
```

还是异步函数：

```js
async function main() {
  const response = await fetch('https://example.com')
  return { result: await response.json() }
}
```

runner 都能统一处理

## 第八步：runner 检查返回值

runner 会检查 `main` 返回的是不是对象

允许：

```js
return {
  result: 123,
  res: {},
}
```

不允许：

```js
return 123
```

也不允许：

```js
return ['a', 'b']
```

接下来它会执行：

```js
JSON.stringify(outputs)
```

这样可以提前发现循环引用、`BigInt` 等无法转换成 JSON 的内容

## 第九步：runner 写入 result.json

如果执行成功，runner 写入：

```json
{
  "status": "SUCCEEDED",
  "outputs": {
    "result": 3,
    "res": {}
  }
}
```

如果用户代码报错，则写入：

```json
{
  "status": "FAILED",
  "error": {
    "code": "CODE_RUNTIME_ERROR",
    "message": "JavaScript main 函数执行失败",
    "stack": "..."
  }
}
```

也就是说，无论成功还是正常的用户代码错误，runner 都会尽量生成 `result.json`

## 第十步：Go 重新接手

Node 退出后，`runtime.go` 继续往下走，读取 `result.json`

如果是成功结果，Go 将 `outputs` 转换成：

```go
map[string]any
```

交给工作流运行时

如果是失败结果，Go 将 runner 返回的错误转换成：

```go
executor.ExecutionFailure
```

然后再交给工作流的异常处理逻辑

最后，`runtime.go` 删除本次执行创建的整个临时目录

## 完整流程

```text
runtime.go 收到代码和输入
    ↓
创建临时目录并准备文件
    ↓
启动 node runner.mjs
    ↓
runner.mjs 导入 user-code.mjs
    ↓
runner.mjs 执行 await main(inputs)
    ↓
runner.mjs 把成功或失败写入 result.json
    ↓
runtime.go 读取 result.json
    ↓
转换成工作流节点结果
    ↓
清理临时目录
```

## 职责边界

`runtime.go` 负责：

- 创建和清理临时目录
- 准备 runner、用户代码、输入和结果文件
- 启动 Node 子进程
- 设置内存和调用栈限制
- 控制超时和取消
- 控制传递给用户代码的环境变量
- 挂载第三方依赖目录
- 读取结果文件并转换工作流错误
- 终止用户代码创建的整个子进程组

`runner.mjs` 负责：

- 使用 ESM 动态加载用户代码
- 找到用户声明的 `main` 函数
- 调用并等待 `main(inputs)`
- 校验返回值必须是可序列化对象
- 检查输出字节大小
- 把运行错误转换成稳定错误码
- 将成功或失败结果写入 `result.json`

一句话总结：`runtime.go` 负责进程、文件、资源限制、超时、环境变量和错误协议，`runner.mjs` 负责 ESM、`import`、调用 `main`、等待 Promise、校验返回对象以及 JSON 序列化
