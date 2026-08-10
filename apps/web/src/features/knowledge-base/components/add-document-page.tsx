import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Form } from '@ai-workflow/ui/components/form'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useState, type FormEvent } from 'react'

import {
  ADD_DOCUMENT_INITIAL_VALUES,
  addDocumentFilesSchema,
  addDocumentSchema,
  type AddDocumentFormInput,
  type AddDocumentInput,
} from '../schema'
import type { DocumentPreview } from '../types'
import { AddDocumentProcessingStep } from './add-document-processing-step'
import { AddDocumentSegmentationStep } from './add-document-segmentation-step'
import { AddDocumentSourceStep } from './add-document-source-step'

interface AddDocumentPageProps {
  knowledgeBaseName?: string
  initialSettings?: Pick<
    AddDocumentFormInput,
    'segmentationMode' | 'maxSegmentLength' | 'overlapLength' | 'replaceWhitespace'
  >
  onAdd: (input: AddDocumentInput) => Promise<void>
  onPreview: (input: AddDocumentInput) => Promise<DocumentPreview>
  onClose: () => void
}

type AddDocumentStep = 1 | 2 | 3

const stepVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 80 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -80 }),
}

function getFilesError(errors: Record<string, string>) {
  return Object.entries(errors).find(([key]) => key === 'files' || key.startsWith('files.'))?.[1]
}

export function AddDocumentPage({
  knowledgeBaseName,
  initialSettings,
  onAdd,
  onPreview,
  onClose,
}: AddDocumentPageProps) {
  const { form, updateForm, updateFormField } = useFormData<AddDocumentFormInput>({
    ...ADD_DOCUMENT_INITIAL_VALUES,
    ...initialSettings,
  })
  const [step, setStep] = useState<AddDocumentStep>(1)
  const [direction, setDirection] = useState(1)
  const [filesSubmitted, setFilesSubmitted] = useState(false)
  const [settingsSubmitted, setSettingsSubmitted] = useState(false)
  const [submittedInput, setSubmittedInput] = useState<AddDocumentInput>()
  const [submitting, setSubmitting] = useState(false)
  const filesValidation = validateFormByZod(addDocumentFilesSchema, {
    files: form.files,
  })
  const formValidation = validateFormByZod(addDocumentSchema, form)
  const filesError =
    filesSubmitted && !filesValidation.success ? getFilesError(filesValidation.errors) : undefined
  const settingsErrors = settingsSubmitted && !formValidation.success ? formValidation.errors : {}

  function moveToStep(nextStep: AddDocumentStep) {
    setDirection(nextStep > step ? 1 : -1)
    setStep(nextStep)
  }

  function handleFilesChange(files: File[]) {
    setFilesSubmitted(false)
    updateFormField('files', files)
  }

  function handleNext() {
    setFilesSubmitted(true)
    if (!filesValidation.success) return
    moveToStep(2)
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setSettingsSubmitted(true)

    const result = validateFormByZod(addDocumentSchema, form)
    if (!result.success) return

    setSubmitting(true)
    try {
      await onAdd(result.data)
      setSubmittedInput(result.data)
      moveToStep(3)
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePreview() {
    setSettingsSubmitted(true)
    const result = validateFormByZod(addDocumentSchema, form)
    if (!result.success) throw new Error('请先修正分段设置')
    return onPreview(result.data)
  }

  function handleResetSettings() {
    setSettingsSubmitted(false)
    updateForm({
      segmentationMode: ADD_DOCUMENT_INITIAL_VALUES.segmentationMode,
      maxSegmentLength: ADD_DOCUMENT_INITIAL_VALUES.maxSegmentLength,
      overlapLength: ADD_DOCUMENT_INITIAL_VALUES.overlapLength,
      replaceWhitespace: ADD_DOCUMENT_INITIAL_VALUES.replaceWhitespace,
    })
  }

  return (
    <Form onSubmit={handleSubmit} className="h-full min-h-0 space-y-0 overflow-hidden">
      <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="h-full min-h-0"
          >
            {step === 1 ? (
              <AddDocumentSourceStep
                error={filesError}
                files={form.files}
                onBack={onClose}
                onFilesChange={handleFilesChange}
                onNext={handleNext}
              />
            ) : null}

            {step === 2 ? (
              <AddDocumentSegmentationStep
                errors={settingsErrors}
                files={form.files}
                maxSegmentLength={form.maxSegmentLength}
                overlapLength={form.overlapLength}
                replaceWhitespace={form.replaceWhitespace}
                segmentationMode={form.segmentationMode}
                submitting={submitting}
                onBack={() => moveToStep(1)}
                onClose={onClose}
                onMaxSegmentLengthChange={(value) => updateFormField('maxSegmentLength', value)}
                onOverlapLengthChange={(value) => updateFormField('overlapLength', value)}
                onReplaceWhitespaceChange={(checked) =>
                  updateFormField('replaceWhitespace', checked)
                }
                onReset={handleResetSettings}
                onPreview={handlePreview}
                onSegmentationModeChange={(value) => updateFormField('segmentationMode', value)}
                onSubmit={() => void handleSubmit()}
              />
            ) : null}

            {step === 3 && submittedInput ? (
              <AddDocumentProcessingStep
                input={submittedInput}
                knowledgeBaseName={knowledgeBaseName}
                onClose={onClose}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </MotionConfig>
    </Form>
  )
}
