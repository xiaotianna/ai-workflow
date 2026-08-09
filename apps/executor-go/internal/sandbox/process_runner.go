package sandbox

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

//go:embed task-runner.mjs
var taskRunnerSource []byte

type Runner interface {
	Execute(context.Context, Request) (Response, error)
}

type ProcessRunner struct{ nodeBinary string }

func NewProcessRunner() (*ProcessRunner, error) {
	binary := strings.TrimSpace(os.Getenv("CODE_NODE_BINARY"))
	if binary == "" {
		binary = "node"
	}
	if _, err := exec.LookPath(binary); err != nil {
		return nil, err
	}
	return &ProcessRunner{nodeBinary: binary}, nil
}

func (runner *ProcessRunner) Execute(ctx context.Context, request Request) (Response, error) {
	directory, err := os.MkdirTemp("", "ai-workflow-plugin-sandbox-")
	if err != nil {
		return Response{}, err
	}
	defer func() { _ = os.RemoveAll(directory) }()
	requestPath := filepath.Join(directory, "request.json")
	sourcePath := filepath.Join(directory, "executor.mjs")
	resultPath := filepath.Join(directory, "result.json")
	runnerPath := filepath.Join(directory, "task-runner.mjs")
	metadata, err := json.Marshal(guestRequestFromSandbox(request))
	if err != nil {
		return Response{}, err
	}
	files := []struct {
		path string
		data []byte
	}{
		{requestPath, metadata}, {sourcePath, []byte(request.Source)}, {runnerPath, taskRunnerSource},
	}
	for _, file := range files {
		if err := os.WriteFile(file.path, file.data, 0o400); err != nil {
			return Response{}, err
		}
	}
	command := exec.Command(runner.nodeBinary,
		"--no-warnings", "--max-old-space-size=64", "--stack_size=1024",
		runnerPath, requestPath, sourcePath, resultPath,
	)
	command.Dir = directory
	command.Env = []string{"HOME=" + directory, "TMPDIR=" + directory, "PATH=/usr/local/bin:/usr/bin:/bin"}
	command.Stdout = io.Discard
	command.Stderr = &cappedBuffer{limit: 64 * 1024}
	command.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if err := runProcessGroup(ctx, command); err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) || errors.Is(ctx.Err(), context.Canceled) {
			return Response{}, ctx.Err()
		}
		return Response{}, err
	}
	data, err := os.ReadFile(resultPath)
	if err != nil || len(data) > request.MaxOutputBytes+64*1024 {
		return Response{}, errors.New("local sandbox result invalid")
	}
	var response Response
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&response); err != nil {
		return Response{}, err
	}
	if err := ensureEOF(decoder); err != nil {
		return Response{}, err
	}
	return response, ValidateResponse(response)
}

func runProcessGroup(ctx context.Context, command *exec.Cmd) error {
	if err := command.Start(); err != nil {
		return err
	}
	done := make(chan error, 1)
	go func() { done <- command.Wait() }()
	select {
	case err := <-done:
		if command.Process != nil {
			_ = syscall.Kill(-command.Process.Pid, syscall.SIGKILL)
		}
		return err
	case <-ctx.Done():
		if command.Process != nil {
			_ = syscall.Kill(-command.Process.Pid, syscall.SIGKILL)
		}
		<-done
		return ctx.Err()
	}
}

func guestRequestFromSandbox(request Request) map[string]any {
	return map[string]any{
		"inputs": request.Inputs, "config": request.Config,
		"context": request.Context, "maxOutputBytes": request.MaxOutputBytes,
	}
}

func ensureEOF(decoder *json.Decoder) error {
	var trailing any
	err := decoder.Decode(&trailing)
	if errors.Is(err, io.EOF) {
		return nil
	}
	if err == nil {
		return errors.New("plugin response contains trailing JSON")
	}
	return err
}

type cappedBuffer struct {
	buffer bytes.Buffer
	limit  int
}

func (buffer *cappedBuffer) Write(data []byte) (int, error) {
	written := len(data)
	remaining := buffer.limit - buffer.buffer.Len()
	if remaining > 0 {
		if len(data) > remaining {
			data = data[:remaining]
		}
		_, _ = buffer.buffer.Write(data)
	}
	return written, nil
}
