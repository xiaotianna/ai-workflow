// import type { NodeDefinition } from '@my/workflow-core'

// import { InputField } from './fields/InputField'
// import { TextareaField } from './fields/TextareaField'
// import { SelectField } from './fields/SelectField'
// import { SliderField } from './fields/SliderField'

// const fieldMap = {
//   input: InputField,
//   textarea: TextareaField,
//   select: SelectField,
//   slider: SliderField
// }

// export function FormRenderer({ definition, value, onChange }) {
//   function update(key: string, v: any) {
//     onChange({
//       ...value,
//       [key]: v
//     })
//   }

//   return (
//     <>
//       {Object.entries(definition.inputs).map(([key, field]) => {
//         const Component = fieldMap[field.ui || 'input']

//         return (
//           <Component
//             key={key}
//             field={field}
//             value={value[key]}
//             onChange={(v) => update(key, v)}
//           />
//         )
//       })}
//     </>
//   )
// }
