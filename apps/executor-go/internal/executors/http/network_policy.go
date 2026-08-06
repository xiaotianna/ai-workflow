package http

import (
	"context"
	"errors"
	"fmt"
	"net"
	stdhttp "net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
)

const (
	httpNetworkPolicyLegacy = "legacy"
	httpNetworkPolicyPublic = "public"
	maxRedirects            = 5
)

var errHTTPTargetForbidden = errors.New("HTTP target is forbidden")

type forbiddenTargetError struct {
	reason string
}

func (failure *forbiddenTargetError) Error() string {
	return failure.reason
}

func (failure *forbiddenTargetError) Unwrap() error {
	return errHTTPTargetForbidden
}

type publicTargetTransport struct {
	policy *publicTargetPolicy
	base   stdhttp.RoundTripper
}

func (transport *publicTargetTransport) RoundTrip(
	request *stdhttp.Request,
) (*stdhttp.Response, error) {
	if err := transport.policy.Validate(request.Context(), request.URL); err != nil {
		return nil, err
	}
	return transport.base.RoundTrip(request)
}

type publicTargetPolicy struct {
	resolver *net.Resolver
	dialer   *net.Dialer
}

func newHTTPClientFromEnvironment() (HTTPClient, error) {
	policyName := strings.ToLower(strings.TrimSpace(os.Getenv("HTTP_NETWORK_POLICY")))
	if policyName == "" {
		policyName = httpNetworkPolicyLegacy
	}
	requirePublic, err := boolEnvironment("HTTP_REQUIRE_PUBLIC_POLICY")
	if err != nil {
		return nil, err
	}
	if requirePublic && policyName != httpNetworkPolicyPublic {
		return nil, fmt.Errorf("HTTP_REQUIRE_PUBLIC_POLICY 已启用，不能使用 %s 网络策略", policyName)
	}

	switch policyName {
	case httpNetworkPolicyLegacy:
		return &stdhttp.Client{}, nil
	case httpNetworkPolicyPublic:
		return newPublicHTTPClient()
	default:
		return nil, fmt.Errorf("未知 HTTP_NETWORK_POLICY：%s", policyName)
	}
}

func newPublicHTTPClient() (*stdhttp.Client, error) {
	policy := &publicTargetPolicy{resolver: net.DefaultResolver, dialer: &net.Dialer{}}
	transport := stdhttp.DefaultTransport.(*stdhttp.Transport).Clone()

	proxyValue := strings.TrimSpace(os.Getenv("HTTP_EGRESS_PROXY_URL"))
	if proxyValue == "" {
		transport.Proxy = nil
		transport.DialContext = policy.DialContext
	} else {
		proxyURL, err := url.Parse(proxyValue)
		if err != nil || proxyURL.Host == "" ||
			(proxyURL.Scheme != "http" && proxyURL.Scheme != "https") {
			return nil, fmt.Errorf("HTTP_EGRESS_PROXY_URL 必须是完整的 HTTP 或 HTTPS URL")
		}
		transport.Proxy = stdhttp.ProxyURL(proxyURL)
	}

	return &stdhttp.Client{
		Transport: &publicTargetTransport{policy: policy, base: transport},
		CheckRedirect: func(request *stdhttp.Request, via []*stdhttp.Request) error {
			if len(via) >= maxRedirects {
				return fmt.Errorf("HTTP 重定向次数超过 %d 次", maxRedirects)
			}
			return policy.Validate(request.Context(), request.URL)
		},
	}, nil
}

func (policy *publicTargetPolicy) Validate(ctx context.Context, target *url.URL) error {
	if target == nil || (target.Scheme != "http" && target.Scheme != "https") ||
		target.Hostname() == "" {
		return &forbiddenTargetError{reason: "HTTP 请求目标无效"}
	}
	if target.User != nil {
		return &forbiddenTargetError{reason: "HTTP 请求目标不能包含 URL 凭证"}
	}
	_, err := policy.resolveAllowed(ctx, target.Hostname())
	return err
}

func (policy *publicTargetPolicy) DialContext(
	ctx context.Context,
	network string,
	address string,
) (net.Conn, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, &forbiddenTargetError{reason: "HTTP 请求目标地址无效"}
	}
	addresses, err := policy.resolveAllowed(ctx, host)
	if err != nil {
		return nil, err
	}

	var lastError error
	for _, address := range addresses {
		connection, dialErr := policy.dialer.DialContext(
			ctx,
			network,
			net.JoinHostPort(address.String(), port),
		)
		if dialErr == nil {
			return connection, nil
		}
		lastError = dialErr
	}
	if lastError == nil {
		lastError = errors.New("HTTP 目标没有可连接地址")
	}
	return nil, lastError
}

func (policy *publicTargetPolicy) resolveAllowed(ctx context.Context, host string) ([]net.IP, error) {
	host = strings.TrimSuffix(strings.TrimSpace(host), ".")
	if host == "" {
		return nil, &forbiddenTargetError{reason: "HTTP 请求目标缺少 Host"}
	}

	if parsed := net.ParseIP(host); parsed != nil {
		if isForbiddenAddress(parsed) {
			return nil, &forbiddenTargetError{reason: "HTTP 请求目标属于受保护网络"}
		}
		return []net.IP{parsed}, nil
	}

	resolved, err := policy.resolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}
	if len(resolved) == 0 {
		return nil, errors.New("HTTP 请求目标没有 DNS 地址")
	}

	addresses := make([]net.IP, 0, len(resolved))
	for _, resolvedAddress := range resolved {
		if isForbiddenAddress(resolvedAddress.IP) {
			// 混合返回公网与私网地址时整体拒绝，避免 DNS Rebinding 选择私网地址。
			return nil, &forbiddenTargetError{reason: "HTTP 请求目标解析到受保护网络"}
		}
		addresses = append(addresses, resolvedAddress.IP)
	}
	return addresses, nil
}

func isForbiddenAddress(address net.IP) bool {
	if address == nil || !address.IsGlobalUnicast() || address.IsPrivate() ||
		address.IsLoopback() || address.IsLinkLocalUnicast() || address.IsLinkLocalMulticast() ||
		address.IsMulticast() || address.IsUnspecified() {
		return true
	}

	for _, network := range forbiddenNetworks {
		if network.Contains(address) {
			return true
		}
	}
	return false
}

var forbiddenNetworks = mustParseNetworks([]string{
	"0.0.0.0/8",
	"100.64.0.0/10",
	"192.0.0.0/24",
	"192.0.2.0/24",
	"198.18.0.0/15",
	"198.51.100.0/24",
	"203.0.113.0/24",
	"240.0.0.0/4",
	"2001:db8::/32",
})

func mustParseNetworks(values []string) []*net.IPNet {
	networks := make([]*net.IPNet, 0, len(values))
	for _, value := range values {
		_, network, err := net.ParseCIDR(value)
		if err != nil {
			panic(err)
		}
		networks = append(networks, network)
	}
	return networks
}

func boolEnvironment(key string) (bool, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return false, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("%s 必须是布尔值", key)
	}
	return parsed, nil
}
