package executor

import "sync"

type Registry struct {
	mu        sync.RWMutex // 读写锁
	executors map[string]NodeExecutor
}

// 注册中心
func NewRegistry() *Registry {
	return &Registry{
		executors: make(map[string]NodeExecutor),
	}
}

// 注册具体node
func (registry *Registry) Register(nodeType string, nodeExecutor NodeExecutor) {
	// 对map读写需要上锁
	registry.mu.Lock()
	defer registry.mu.Unlock()
	registry.executors[nodeType] = nodeExecutor
}

// 获取对应的node executor
func (registry *Registry) Resolve(nodeType string) (NodeExecutor, bool) {
	registry.mu.RLock()
	defer registry.mu.RUnlock()
	nodeExecutor, ok := registry.executors[nodeType]
	return nodeExecutor, ok
}
