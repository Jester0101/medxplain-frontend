'use client'

import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PATIENT_PRESETS } from '@/lib/presets'
import type { ModelInfo } from '@/lib/contract'

const RISK_DOT: Record<'low' | 'moderate' | 'high', string> = {
  low: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  high: 'bg-rose-500'
}

const RISK_LABEL: Record<'low' | 'moderate' | 'high', string> = {
  low: 'Low risk',
  moderate: 'Moderate risk',
  high: 'High risk'
}

type Props = {
  note: string
  onNoteChange: (note: string) => void
  model: string
  onModelChange: (model: string) => void
  models: ModelInfo[]
  onAssess: () => void
  isPending: boolean
}

export function PatientIntake({
  note,
  onNoteChange,
  model,
  onModelChange,
  models,
  onAssess,
  isPending
}: Props) {
  const canSubmit = note.trim().length > 0 && !isPending
  const families = Array.from(
    new Set(models.map(m => m.family ?? 'Models'))
  )

  const selectedPatientId = useMemo(() => {
    const match = PATIENT_PRESETS.find(p => p.note === note)
    return match ? String(match.id) : ''
  }, [note])

  return (
    <Card className='border-border/70 shadow-soft'>
      <CardHeader className='px-7 pb-2 pt-7 sm:px-8'>
        <CardTitle className='font-heading text-2xl font-semibold tracking-tight'>
          Patient intake
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6 px-7 pb-7 sm:space-y-7 sm:px-8 sm:pb-8'>
        <div className='space-y-2.5'>
          <label
            htmlFor='model-select'
            className='text-[13px] font-medium text-muted-foreground'>
            Model
          </label>
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger
              id='model-select'
              className='w-full rounded-xl transition-shadow focus-visible:border-[color-mix(in_srgb,var(--focus)_55%,transparent)] focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)]'>
              <SelectValue placeholder='Select a model' />
            </SelectTrigger>
            <SelectContent>
              {families.map(family => (
                <SelectGroup key={family}>
                  <SelectLabel className='text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90'>
                    {family}
                  </SelectLabel>
                  {models
                    .filter(m => (m.family ?? 'Models') === family)
                    .map(m => (
                      <SelectItem
                        key={m.id}
                        value={m.id}
                        disabled={m.available === false}
                        title={m.note}>
                        {m.label ?? m.id}
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2.5'>
          <label
            htmlFor='note-input'
            className='text-[13px] font-medium text-muted-foreground'>
            Input note
          </label>
          <Textarea
            id='note-input'
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSubmit)
                onAssess()
            }}
            placeholder='e.g. 62yo man with hypertension, LDL 160 mg/dL, HDL 40 mg/dL, current smoker…'
            className='min-h-[170px] resize-y rounded-xl border-border/60 bg-background/50 text-[15px] leading-7 transition-shadow focus-visible:border-[color-mix(in_srgb,var(--focus)_55%,transparent)] focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)] sm:min-h-[190px]'
          />
        </div>

        <div className='space-y-2.5'>
          <label
            htmlFor='patient-example'
            className='text-[13px] font-medium text-muted-foreground'>
            Example patients
          </label>
          <Select
            value={selectedPatientId}
            onValueChange={value => {
              const preset = PATIENT_PRESETS.find(
                p => String(p.id) === value
              )
              if (preset) onNoteChange(preset.note)
            }}>
            <SelectTrigger
              id='patient-example'
              className='w-full rounded-xl transition-shadow focus-visible:border-[color-mix(in_srgb,var(--focus)_55%,transparent)] focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)]'>
              <SelectValue placeholder='Load a real patient profile…' />
            </SelectTrigger>
            <SelectContent>
              {(['low', 'moderate', 'high'] as const).map(level => {
                const group = PATIENT_PRESETS.filter(p => p.risk === level)
                if (group.length === 0) return null
                return (
                  <SelectGroup key={level}>
                    <SelectLabel className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90'>
                      <span
                        aria-hidden
                        className={`size-2 rounded-full ${RISK_DOT[level]}`}
                      />
                      {RISK_LABEL[level]}
                    </SelectLabel>
                    {group.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <Button
          type='button'
          size='lg'
          className='h-12 w-full border border-white/10 bg-[#d6d3cd] text-[15px] font-medium text-[#171717] shadow-none transition-colors hover:bg-[#e7e5e4] active:bg-[#c7c4be] disabled:border-transparent disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400'
          disabled={!canSubmit}
          onClick={onAssess}>
          {isPending && <Loader2 className='animate-spin' />}
          {isPending ? 'Assessing…' : 'Assess risk'}
        </Button>
      </CardContent>
    </Card>
  )
}
