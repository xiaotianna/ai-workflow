# Go Executor 的 RabbitMQ 入门说明

如果你已经知道 NestJS 会给 Go 发送节点执行命令，Go 执行完再把结果返回给 NestJS，但打开 `internal/mq` 之后还是看不懂，那么真正卡住你的通常不是 Go 语法，而是 RabbitMQ 里的几个概念混在了一起。

这篇文档不打算把 RabbitMQ 的所有功能都讲一遍，只讲看懂当前项目需要知道的内容。

本文正文继续使用默认 `EXECUTOR_PROFILE=legacy` 的单队列作为入门示例。启用分类路由后，
`condition`、`llm/rag`、`http`、`code` 会分别使用 `node.execute.compute`、`node.execute.model`、
`node.execute.http`、`node.execute.sandbox` Routing Key 和独立队列；结果仍统一发布到
`node.result`，Ack、租约、Protocol 和 Result 处理语义不变。

## 1. NestJS 和 Go 其实没有直接通信

可以先把整个流程理解成：

```text
NestJS → RabbitMQ → Go Worker
Go Worker → RabbitMQ → NestJS
```

NestJS 不会直接调用 Go，Go 也不会直接请求 NestJS。它们都只和 RabbitMQ 打交道。

例如 NestJS 想执行一个 HTTP 节点时，会先把“执行 HTTP 节点”这条命令交给 RabbitMQ。RabbitMQ 把命令保存起来，Go Worker 再从 RabbitMQ 里取出来执行。

执行完成后，Go 也不是直接把结果发给 NestJS，而是先把结果交给 RabbitMQ，NestJS 再从 RabbitMQ 里取走结果。

这样做的一个直接好处是：两边不需要在同一时刻都在线。

- NestJS 把命令交给 RabbitMQ 后，可以先去做别的事情。
- Go 暂时没有空也没关系，命令会先保存在队列里。
- Go 执行完把结果放进结果队列，NestJS 稍后再来消费。

所以这里不是传统的“发送请求，然后一直等接口返回”，而是“先留一条消息，对方处理完后再留一条结果消息”。

## 2. RabbitMQ 里最需要理解的 5 个概念

### 2.1 Message：消息

Message 就是双方传递的一份数据。

比如 NestJS 发给 Go 的节点执行命令，大致是：

```json
{
  "commandId": "cmd-001",
  "nodeType": "http",
  "inputs": {},
  "config": {}
}
```

RabbitMQ 把这条消息交给 Go 后，Go 代码里拿到的是：

```go
delivery amqp.Delivery
```

消息的 JSON 内容在：

```go
delivery.Body
```

`delivery` 除了消息正文，还带着 `MessageId` 等消息属性，以及后面会用到的 `Ack`、`Nack`、`Reject` 方法。

### 2.2 Exchange：交换机

Exchange 可以先理解成一个消息分拣中心。

发送方通常不是直接把消息塞进某个 Queue，而是把消息发给 Exchange，再由 Exchange 决定这条消息应该进入哪个 Queue。

当前项目有两个主要 Exchange：

```go
CommandExchange = "ai-workflow.command.v1"
ResultExchange  = "ai-workflow.result.v1"
```

- `CommandExchange` 用来接收节点执行命令。
- `ResultExchange` 用来接收节点执行结果。

Exchange 本身主要负责分发消息，真正把消息保存下来的是 Queue。

### 2.3 RoutingKey：路由标识

RoutingKey 可以理解成消息上的分拣标签。

NestJS 发布节点执行命令时，会告诉 RabbitMQ：

```text
Exchange:   ai-workflow.command.v1
RoutingKey: node.execute
```

RabbitMQ 看到 `node.execute` 后，会查找哪个 Queue 绑定了这个 RoutingKey，然后把消息送进那个 Queue。

当前项目主要使用：

```go
CommandRoutingKey = "node.execute"
ResultRoutingKey  = "node.result"
```

- `node.execute` 表示这是一条节点执行命令。
- `node.result` 表示这是一条节点执行结果。

### 2.4 Queue：队列

Queue 是真正保存消息、等待消费者处理的地方。

项目中的命令队列是：

```go
CommandQueue = "ai-workflow.node.execute.v1"
```

NestJS 发布命令之后，命令会经历：

```text
NestJS
  ↓ 发布 node.execute 消息
CommandExchange
  ↓ 根据 RoutingKey 分发
CommandQueue
  ↓ 消费消息
Go Worker
```

Go 返回执行结果时则是：

```text
Go Worker
  ↓ 发布 node.result 消息
ResultExchange
  ↓ 根据 RoutingKey 分发
ResultQueue
  ↓ 消费消息
NestJS
```

刚开始学习时，可以先记住这三句话：

```text
Exchange 负责分发消息。
Queue 负责保存消息。
Consumer 负责处理消息。
```

### 2.5 Consumer：消费者

Consumer 就是从 Queue 里取出消息并处理的程序。

在当前项目中：

- Go Worker 是命令队列的消费者。
- NestJS Server 是结果队列的消费者。

Go 监听命令队列的代码在 `internal/mq/worker.go`：

```go
deliveries, err := consumerChannel.Consume(
    CommandQueue,
    "executor-go",
    false,
    false,
    false,
    false,
    nil,
)
```

`Consume` 会返回一个 Go Channel，也就是这里的 `deliveries`。RabbitMQ 有新命令时，会把消息放进 `deliveries`，后面的循环再取出消息：

```go
case delivery, open := <-deliveries:
    worker.handleDelivery(ctx, publisherChannel, delivery)
```

你可以把这段代码理解成：Go Worker 一直守在命令队列旁边，有新消息就交给 `handleDelivery` 处理。

## 3. Ack、Nack、Reject 到底在做什么

RabbitMQ 把消息交给 Go，不代表这条消息已经处理成功。

因为 RabbitMQ 不知道 Go 后面会不会执行失败、进程崩溃或者结果发布失败，所以它需要 Go 明确告诉它：这条消息最后应该怎么办。

### 3.1 Ack：这条消息处理成功了

```go
delivery.Ack(false)
```

Ack 可以理解成 Go 告诉 RabbitMQ：

> 这条消息我已经处理完了，你可以把它从命令队列里删除了。

当前项目不会在收到命令后立刻 Ack，而是等节点执行结果成功发布，并且 RabbitMQ 确认收到结果后才 Ack 原始命令。

### 3.2 Nack：这次没有处理好

```go
delivery.Nack(false, true)
```

这里第二个参数是 `true`，表示把原消息重新放回队列。

可以理解成 Go 告诉 RabbitMQ：

> 这次没有处理完整，请把命令放回去，之后再交给消费者处理。

当前项目在结果发布失败时会这么做。因为 Go 虽然可能已经执行完节点了，但 NestJS 还没有机会收到执行结果，所以不能直接把原始命令删掉。

要注意的是：原命令重新入队以后，节点可能会被再次执行。因此 HTTP 请求、写数据库等有副作用的操作需要考虑幂等，不能默认每个命令只执行一次。

### 3.3 Reject：这条消息本身不能处理

```go
delivery.Reject(false)
```

这里的 `false` 表示不要把消息重新放回原队列。

当前项目在命令 JSON 无法解析，或者命令字段不符合协议时会 Reject。因为消息本身就是错的，再执行一遍也不会变正确，所以没有必要一直重试。

由于命令队列配置了死信交换机，被 Reject 的非法命令会进入死信队列，而不是直接消失。

简单区分就是：

```text
Ack：处理成功，删除消息。
Nack 并重新入队：这次没处理完整，之后再试。
Reject 且不重新入队：消息本身不合法，送去死信队列。
```

## 4. 死信队列是干什么的

死信队列就是专门保存异常消息的队列。

比如 NestJS 发来下面这条消息：

```json
{
  "nodeType": 123
}
```

协议要求 `nodeType` 是字符串，但这里传了数字。Go 无法把它当成合法命令执行。

如果每次校验失败都重新放回原队列，就会变成：

```text
取出消息
  ↓
校验失败
  ↓
重新入队
  ↓
再次取出
  ↓
再次失败
```

它会一直循环，还会占用 Worker。

所以 `handleDelivery` 会调用：

```go
delivery.Reject(false)
```

命令队列在 `internal/mq/topology.go` 中配置了死信交换机：

```go
"x-dead-letter-exchange":    DeadLetterExchange,
"x-dead-letter-routing-key": CommandDeadLetterRoutingKey,
```

于是 RabbitMQ 会按照下面的路线转移消息：

```text
CommandQueue
  ↓ Reject(false)
DeadLetterExchange
  ↓ 根据死信 RoutingKey 分发
CommandDeadLetterQueue
```

死信队列中的消息不会再被 Go 当成正常命令执行。它们通常留给开发者排查，例如检查是谁发送了错误数据、协议版本是否一致，或者决定要不要人工修复和补偿。

## 5. 一条正常消息从头到尾怎么运行

下面跟着一条 HTTP 节点命令走一遍完整流程。

### 第一步：NestJS 发布节点执行命令

NestJS 把命令发布到：

```text
Exchange:   CommandExchange
RoutingKey: node.execute
Body:       ExecuteNodeCommand JSON
```

RabbitMQ 根据绑定关系，把消息放进 `CommandQueue`。

### 第二步：Go 从命令队列收到消息

`runSession` 一直监听 `deliveries`：

```go
case delivery, open := <-deliveries:
    worker.handleDelivery(ctx, publisherChannel, delivery)
```

这里的 `delivery` 就是 RabbitMQ 交给 Go 的一条命令消息。

### 第三步：Go 解析并校验命令

`handleDelivery` 首先调用：

```go
command, err := protocol.DecodeExecuteNodeCommand(delivery.Body)
```

它会把消息 JSON 转成 `ExecuteNodeCommand`，同时检查 JSON 格式、协议必填字段和字段类型。

如果校验不通过，这条消息会被 Reject 并进入死信队列，不会执行节点。

### 第四步：Go 根据 nodeType 查找执行器

合法命令会进入 `executeCommand`，然后通过：

```go
nodeExecutor, ok := worker.registry.Resolve(command.NodeType)
```

查找具体节点执行器。

例如：

```text
nodeType = http      → HTTP Executor
nodeType = llm       → LLM Executor
nodeType = rag       → RAG Executor
nodeType = condition → Condition Executor
```

如果节点类型没有注册，命令本身仍然是合法的，所以不会进入死信队列。Go 会生成一个 `NODE_EXECUTOR_NOT_REGISTERED` 失败结果返回给 NestJS。

### 第五步：Go 执行节点

找到执行器后会调用：

```go
result, err := nodeExecutor.Execute(executionContext, command)
```

具体执行器可能会调用 HTTP 接口、大模型、RAG，或者执行条件判断。

执行成功就返回成功结果；执行器返回错误时，Worker 会把错误包装成标准的 `NODE_EXECUTOR_FAILED` 失败结果。

### 第六步：Go 把执行结果发布给 RabbitMQ

Worker 将结果发布到：

```text
Exchange:   ResultExchange
RoutingKey: node.result
Body:       ExecuteNodeResult JSON
```

RabbitMQ 再根据绑定关系把结果放进 `ResultQueue`，等待 NestJS 消费。

### 第七步：Go 等待 RabbitMQ 确认结果

发布结果后，Go 还会等待 Publisher Confirm：

```go
confirmed, err := confirmation.WaitContext(publishContext)
```

这不是在等待 NestJS 处理完成，而是在等待 RabbitMQ 确认它已经收到结果消息。

### 第八步：Go Ack 原始命令

只有结果得到 RabbitMQ 确认后，Go 才会执行：

```go
delivery.Ack(false)
```

完整顺序是：

```text
收到命令
  ↓
解析并校验
  ↓
执行节点
  ↓
发布执行结果
  ↓
RabbitMQ 确认收到结果
  ↓
Ack 原始命令
```

之所以不提前 Ack，是因为如果先删除原命令，结果发布时又失败了，那么 NestJS 收不到结果，RabbitMQ 里也已经没有原命令可以重新处理了。

## 6. 不同异常最后会怎么处理

异常消息不能全部用同一种方式处理。判断时先问两个问题：

1. 这条命令本身是否合法？
2. 如果命令合法，执行结果有没有成功发布？

当前 Worker 的处理方式如下：

| 情况                         | 最后的处理方式                       |
| ---------------------------- | ------------------------------------ |
| 命令不是合法 JSON            | `Reject(false)`，进入命令死信队列    |
| 命令字段不符合协议           | `Reject(false)`，进入命令死信队列    |
| `deadlineAt` 格式错误        | 生成失败结果并发布给 NestJS          |
| 命令已经超过 deadline        | 生成失败结果并发布给 NestJS          |
| Command 租约已经失效         | 不执行节点，直接 `Ack` 丢弃原命令    |
| 首次租约检查暂时失败         | `Nack(false, true)`，原命令重新入队  |
| 执行期间租约失效             | 取消 Command context 后 `Ack` 原命令 |
| 找不到对应节点执行器         | 生成失败结果并发布给 NestJS          |
| 节点执行器返回错误           | 生成失败结果并发布给 NestJS          |
| 执行器返回的结果格式不合法   | 替换成标准失败结果并发布给 NestJS    |
| 结果序列化或发布失败         | `Nack(false, true)`，原命令重新入队  |
| RabbitMQ 连接或 Channel 断开 | 当前会话结束，Worker 等待 2 秒后重连 |
| 结果发布并得到 RabbitMQ 确认 | `Ack` 原始命令                       |

可以把这些处理归纳成三类。

### 命令消息本身不合法

```text
Go 不知道应该执行什么
  ↓
Reject
  ↓
进入死信队列
```

这种情况不能靠重试解决，因为同一条错误数据再解析一次还是错误。

### 命令合法，但是业务执行失败

```text
Go 知道执行了什么，也知道为什么失败
  ↓
生成 FAILED 结果
  ↓
通过结果队列告诉 NestJS
  ↓
Ack 原始命令
```

例如 deadline 已过、没有注册执行器、HTTP Executor 返回错误，都属于这一类。它们是一次有明确结果的执行，不属于 MQ 消息格式异常。

### 节点可能已经执行，但是结果没有发布成功

```text
NestJS 还收不到执行结果
  ↓
Nack 原始命令并重新入队
  ↓
之后再次处理
```

这是最需要留意的一种情况，因为节点可能执行了不止一次。RabbitMQ 在这里提供的是“至少处理一次”的可靠性，而不是保证“永远只执行一次”。具体节点仍然需要结合 `commandId`、`idempotencyKey` 或 `executionKey` 做幂等保护。

理解到这里以后，再看 `internal/mq/worker.go` 时可以先抓住它的主线：

```text
消费命令 → 校验命令 → 执行节点 → 发布结果 → 确认结果 → Ack 命令
```

剩下的连接、Channel、超时和重连代码，都是在保护这条主线能稳定运行。
