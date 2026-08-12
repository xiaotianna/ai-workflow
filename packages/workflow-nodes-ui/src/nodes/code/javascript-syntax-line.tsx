const JAVASCRIPT_KEYWORDS = new Set([
    'async',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'from',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'of',
    'return',
    'switch',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]),
  JAVASCRIPT_LITERALS = new Set(['false', 'Infinity', 'NaN', 'null', 'true', 'undefined']),
  JAVASCRIPT_GLOBALS = new Set([
    'Array',
    'Boolean',
    'Date',
    'Error',
    'JSON',
    'Map',
    'Math',
    'Number',
    'Object',
    'Promise',
    'RegExp',
    'Set',
    'String',
    'Symbol',
    'console',
  ]),
  JAVASCRIPT_TOKEN_PATTERN =
    /\/\/.*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:0[xX][\dA-Fa-f]+|\d+(?:\.\d+)?)\b|[A-Za-z_$][\w$]*|\s+|./g

interface JavaScriptToken {
  index: number
  value: string
}

function findSignificantToken(tokens: JavaScriptToken[], startIndex: number, direction: -1 | 1) {
  for (
    let tokenIndex = startIndex + direction;
    tokenIndex >= 0 && tokenIndex < tokens.length;
    tokenIndex += direction
  ) {
    const value = tokens[tokenIndex]?.value

    if (value && !/^\s+$/.test(value)) {
      return value
    }
  }

  return undefined
}

function getTokenClassName(
  token: string,
  previousToken: string | undefined,
  nextToken: string | undefined,
) {
  if (token.startsWith('//') || token.startsWith('/*')) {
    return 'text-muted-foreground italic'
  }

  if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
    return 'text-destructive'
  }

  if (/^(?:0[xX][\dA-Fa-f]+|\d+(?:\.\d+)?)$/.test(token)) {
    return 'text-warning'
  }

  if (JAVASCRIPT_KEYWORDS.has(token)) {
    return 'text-primary'
  }

  if (JAVASCRIPT_LITERALS.has(token)) {
    return 'text-warning'
  }

  if (JAVASCRIPT_GLOBALS.has(token)) {
    return 'text-success'
  }

  if (previousToken === 'function' || previousToken === '.' || nextToken === '(') {
    return 'text-warning'
  }

  if (token === '{' || token === '}') {
    return 'text-success'
  }

  if (token === '[' || token === ']') {
    return 'text-warning'
  }

  if (token === '(' || token === ')') {
    return 'text-info'
  }

  if (/^(?:=>|===?|!==?|[+\-*/%?:&|<>])$/.test(token)) {
    return 'text-muted-foreground'
  }

  return undefined
}

interface JavaScriptSyntaxLineProps {
  line: string
}

export function JavaScriptSyntaxLine({ line }: JavaScriptSyntaxLineProps) {
  const tokens = [...line.matchAll(JAVASCRIPT_TOKEN_PATTERN)].map<JavaScriptToken>((match) => ({
    index: match.index,
    value: match[0],
  }))

  if (tokens.length === 0) {
    return '\u00a0'
  }

  return tokens.map((token, tokenIndex) => {
    const previousToken = findSignificantToken(tokens, tokenIndex, -1),
      nextToken = findSignificantToken(tokens, tokenIndex, 1)

    return (
      <span key={token.index} className={getTokenClassName(token.value, previousToken, nextToken)}>
        {token.value}
      </span>
    )
  })
}
