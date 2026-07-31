import { FIELD_UI_TYPES, type FieldUIType } from '@ai-workflow/core'
import type { AnyFieldRenderer } from '../contracts/field-renderer'
import { CodeField } from './code-field'
import { ConditionBranchesField } from './condition-branches-field'
import { KeyValueTableField } from './key-value-table-field'
import { NumberField } from './number-field'
import { RequestBodyField } from './request-body-field'
import { SelectField } from './select-field'
import { SliderField } from './slider-field'
import { SwitchField } from './switch-field'
import { TextField } from './text-field'
import { TextareaField } from './textarea-field'

export { FIELD_UI_TYPES }

export const builtinFields = {
  [FIELD_UI_TYPES.TEXT]: TextField,
  [FIELD_UI_TYPES.NUMBER]: NumberField,
  [FIELD_UI_TYPES.TEXTAREA]: TextareaField,
  [FIELD_UI_TYPES.SELECT]: SelectField,
  [FIELD_UI_TYPES.SWITCH]: SwitchField,
  [FIELD_UI_TYPES.SLIDER]: SliderField,
  [FIELD_UI_TYPES.CODE_EDITOR]: CodeField,
  [FIELD_UI_TYPES.KEY_VALUE_TABLE]: KeyValueTableField,
  [FIELD_UI_TYPES.REQUEST_BODY]: RequestBodyField,
  [FIELD_UI_TYPES.CONDITION_BRANCHES]: ConditionBranchesField,
} satisfies Record<FieldUIType, AnyFieldRenderer>
