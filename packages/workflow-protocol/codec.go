package protocol

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"

	"github.com/santhosh-tekuri/jsonschema/v5"
)

const (
	jsonValueSchemaID          = "https://ai-workflow.dev/schemas/json-value.schema.json"
	executeNodeCommandSchemaID = "https://ai-workflow.dev/schemas/execute-node-command.schema.json"
	executeNodeResultSchemaID  = "https://ai-workflow.dev/schemas/execute-node-result.schema.json"
)

//go:embed schemas/*.schema.json
var protocolSchemas embed.FS

var (
	executeNodeCommandSchema = mustCompileSchema(executeNodeCommandSchemaID)
	executeNodeResultSchema  = mustCompileSchema(executeNodeResultSchemaID)
)

func mustCompileSchema(schemaID string) *jsonschema.Schema {
	compiler := jsonschema.NewCompiler()

	resources := []struct {
		id   string
		path string
	}{
		{jsonValueSchemaID, "schemas/json-value.schema.json"},
		{executeNodeCommandSchemaID, "schemas/execute-node-command.schema.json"},
		{executeNodeResultSchemaID, "schemas/execute-node-result.schema.json"},
	}

	for _, resource := range resources {
		content, err := protocolSchemas.ReadFile(resource.path)
		if err != nil {
			panic(fmt.Errorf("read protocol schema %s: %w", resource.path, err))
		}

		if err := compiler.AddResource(resource.id, bytes.NewReader(content)); err != nil {
			panic(fmt.Errorf("register protocol schema %s: %w", resource.id, err))
		}
	}

	compiled, err := compiler.Compile(schemaID)
	if err != nil {
		panic(fmt.Errorf("compile protocol schema %s: %w", schemaID, err))
	}

	return compiled
}

func decodeAndValidate(data []byte, schema *jsonschema.Schema, target any) error {
	var raw any
	if err := json.Unmarshal(data, &raw); err != nil {
		return fmt.Errorf("decode protocol JSON: %w", err)
	}

	if err := schema.Validate(raw); err != nil {
		return fmt.Errorf("validate protocol JSON: %w", err)
	}

	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("decode typed protocol message: %w", err)
	}

	if err := ensureJSONEOF(decoder); err != nil {
		return err
	}

	return nil
}

func ensureJSONEOF(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); err == io.EOF {
		return nil
	} else if err != nil {
		return fmt.Errorf("decode trailing protocol data: %w", err)
	}

	return fmt.Errorf("protocol message contains multiple JSON values")
}

func validateTypedMessage(value any, schema *jsonschema.Schema) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("encode typed protocol message: %w", err)
	}

	var raw any
	if err := json.Unmarshal(data, &raw); err != nil {
		return fmt.Errorf("decode encoded protocol message: %w", err)
	}

	if err := schema.Validate(raw); err != nil {
		return fmt.Errorf("validate typed protocol message: %w", err)
	}

	return nil
}

func DecodeExecuteNodeCommand(data []byte) (ExecuteNodeCommand, error) {
	var command ExecuteNodeCommand
	if err := decodeAndValidate(data, executeNodeCommandSchema, &command); err != nil {
		return ExecuteNodeCommand{}, err
	}

	return command, nil
}

func DecodeExecuteNodeResult(data []byte) (ExecuteNodeResult, error) {
	var result ExecuteNodeResult
	if err := decodeAndValidate(data, executeNodeResultSchema, &result); err != nil {
		return ExecuteNodeResult{}, err
	}

	return result, nil
}

func ValidateExecuteNodeCommand(command ExecuteNodeCommand) error {
	return validateTypedMessage(command, executeNodeCommandSchema)
}

func ValidateExecuteNodeResult(result ExecuteNodeResult) error {
	return validateTypedMessage(result, executeNodeResultSchema)
}
