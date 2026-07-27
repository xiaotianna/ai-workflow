import { FIELD_UI_TYPES, type FieldUIType } from '@ai-workflow/core'
import type { AnyFieldRenderer } from '../contracts/field-renderer'
import { CodeField } from './code-field'
import { NumberField } from './number-field'
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
} satisfies Record<FieldUIType, AnyFieldRenderer>
