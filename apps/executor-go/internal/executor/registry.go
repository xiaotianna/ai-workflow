package executor

import "sync"

// Registry resolves a concrete executor by node type.
type Registry struct {
	mu        sync.RWMutex
	executors map[string]NodeExecutor
}

func NewRegistry() *Registry {
	return &Registry{
		executors: make(map[string]NodeExecutor),
	}
}

func (registry *Registry) Register(nodeType string, nodeExecutor NodeExecutor) {
	registry.mu.Lock()
	defer registry.mu.Unlock()
	registry.executors[nodeType] = nodeExecutor
}

func (registry *Registry) Resolve(nodeType string) (NodeExecutor, bool) {
	registry.mu.RLock()
	defer registry.mu.RUnlock()
	nodeExecutor, ok := registry.executors[nodeType]
	return nodeExecutor, ok
}
