// import { getField } from './registry'

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
//         const FieldComponent = getField(field.ui || 'input')

//         return (
//           <FieldComponent
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
