export const DATA_TYPE_KINDS = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  JSON: 'json',
} as const

export type DataType = (typeof DATA_TYPE_KINDS)[keyof typeof DATA_TYPE_KINDS]

export const DATA_TYPE_VALUES = [
  DATA_TYPE_KINDS.STRING,
  DATA_TYPE_KINDS.NUMBER,
  DATA_TYPE_KINDS.BOOLEAN,
  DATA_TYPE_KINDS.JSON,
] as const satisfies readonly DataType[]
