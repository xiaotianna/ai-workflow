# @ai-workflow/protocol

@ai-workflow/protocol是nestjs和go executor之间的通信协议，保证两端发送、接收的数据结构完全一致。

## 主要作用

它定义两类消息：1、server发送给go executor的，2、go executor返回给server的

### 1. ExecuteNodeCommand

Server 发给 Go Executor，表示“执行这一个节点”。

包含：

- 运行、节点和 Execution 身份
- commandId：当前这条 mq 命令消息的id
- idempotencyKey：业务幂等键，即使命令被 RabbitMQ 重复投递，也不能重复执行
- attempt：尝试运行次数
- leaseToken：本次派发的临时执行凭证。Server 只接受当前有效 leaseToken 对应的结果
- deadline：最晚执行时间，超过这个时间后 Go 应停止或拒绝继续执行
- Runtime 已经解析完成的 inputs
- Runtime 已经投影完成的 config

### 2. ExecuteNodeResult

Go Executor 返回给 Server，表示节点最终执行结果：

- SUCCEEDED：返回 outputs 和 activatedHandles
- FAILED：返回稳定错误码、错误信息、是否可重试和 details

## 执行顺序

```text
Runtime
   │ 产生 DISPATCH_NODE Effect
   ▼
NestJS Server
   │ 使用 Protocol 组装并校验 Command
   ▼
RabbitMQ
   ▼
Go Executor
   │ 使用 Protocol 解码 Command、校验 Result
   ▼
RabbitMQ
   ▼
NestJS Server
   │ 使用 Protocol 校验 Result
   ▼
Runtime.applyNodeResult()
```

职责：

- Runtime：决定“下一步执行哪个节点”，维护 DAG 和 RuntimeState。
- Protocol：规定“节点执行消息长什么样”，并校验消息是否合法。
- Server：把 Runtime Effect 转换成 Protocol Command，负责 MQ、数据库、租约和幂等。
- Go Executor：真正执行 LLM、HTTP、Code 等业务节点。

## json schema的作用

ts使用有自己的类型约束，go也是，但是要保证两者的消息类型一致，就使用json schema来约定。

相当于这个包就是server来了，调用校验方法（例如是parse），parse(data)，go来了也是调用对应的parse(data)

### 调用关系

```text
Server 发送 Command
调用parseExecuteNodeCommand(command)
          ↓
      RabbitMQ
          ↓
Go 接收 Command
调用DecodeExecuteNodeCommand(data)
          ↓
      执行节点
          ↓
Go 发送 Result
ValidateExecuteNodeResult(result)
          ↓
      RabbitMQ
          ↓
Server 接收 Result
parseExecuteNodeResult(data)
```

server和go executor都需要校验两次数据合法性，分别是在推入消息到mq和从mq拿消息到时候

```text
1. Server 组装 Command
2. Server 调用 parseExecuteNodeCommand()
3. 校验通过后发送到 MQ

4. Go 从 MQ 收到 JSON
5. Go 调用 DecodeExecuteNodeCommand()
6. 校验并解码成功后执行节点

7. Go 构造 Result
8. Go 调用 ValidateExecuteNodeResult()
9. 校验通过后发送到 MQ

10. Server 从 MQ 收到 Result
11. Server 调用 parseExecuteNodeResult()
12. 校验通过后交给 Runtime
```
