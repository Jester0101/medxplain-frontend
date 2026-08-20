'use client'

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
import { PRESETS } from '@/lib/presets'
import type { ModelInfo } from '@/lib/contract'

const PRESET_DOT: Record<'low' | 'moderate' | 'high', string> = {
  low: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  high: 'bg-rose-500'
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
  const hasUnavailable = models.some(m => m.available === false)

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
          {hasUnavailable && (
            <p className='text-[12px] leading-relaxed text-muted-foreground'>
              Greyed-out models become selectable once their backend is connected.
            </p>
          )}
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

        <div className='flex flex-wrap items-center gap-2.5 pt-1'>
          <span className='text-xs text-muted-foreground'>Examples:</span>
          {PRESETS.map(p => (
            <button
              key={p.label}
              type='button'
              onClick={() => onNoteChange(p.note)}
              className='inline-flex min-h-9 items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-normal transition-all hover:bg-muted/70 active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'>
              <span
                aria-hidden
                className={`size-2 rounded-full ${PRESET_DOT[p.risk]}`}
              />
              {p.label}
            </button>
          ))}
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
