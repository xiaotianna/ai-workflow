package executorprofile

import (
	"fmt"
	"strings"
)

type Profile string

const (
	Legacy  Profile = "legacy"
	Compute Profile = "compute"
	Model   Profile = "model"
	HTTP    Profile = "http"
	Sandbox Profile = "sandbox"
)

func Parse(raw string) (Profile, error) {
	value := Profile(strings.ToLower(strings.TrimSpace(raw)))
	if value == "" {
		// 默认保留现有全量 Registry 和单 Queue 行为，便于滚动升级。
		return Legacy, nil
	}

	switch value {
	case Legacy, Compute, Model, HTTP, Sandbox:
		return value, nil
	default:
		return "", fmt.Errorf("未知 EXECUTOR_PROFILE：%s", raw)
	}
}

func (profile Profile) String() string {
	return string(profile)
}
