package executor

import (
	"bytes"
	"encoding/json"
	"fmt"
)

// DecodeConfig converts the protocol JSON object into a node-specific config
// and rejects fields the node does not understand.
func DecodeConfig(raw map[string]any, target any) error {
	data, err := json.Marshal(raw)
	if err != nil {
		return fmt.Errorf("serialize node config: %w", err)
	}

	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("decode node config: %w", err)
	}

	return nil
}
