module node-executor-go

go 1.25.1

require (
	github.com/rabbitmq/amqp091-go v1.13.0
	workflow-protocol v0.0.0
)

require github.com/santhosh-tekuri/jsonschema/v5 v5.3.1 // indirect

replace workflow-protocol => ../../packages/workflow-protocol
