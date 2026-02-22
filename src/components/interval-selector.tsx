'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface IntervalSelectorProps {
  value?: string | null
  customValue?: string | null
  onChange: (interval: string | null, customInterval: string | null) => void
}

const INTERVAL_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'CUSTOM', label: 'Custom' },
]

export function IntervalSelector({
  value,
  customValue,
  onChange,
}: IntervalSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Interval</Label>
      <Select
        value={value ?? 'NONE'}
        onValueChange={(v) => {
          if (v === 'NONE') {
            onChange(null, null)
          } else {
            onChange(v, v === 'CUSTOM' ? (customValue ?? '') : null)
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select interval" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">None</SelectItem>
          {INTERVAL_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value === 'CUSTOM' && (
        <div className="space-y-1">
          <Label htmlFor="customInterval" className="text-xs">
            Custom Interval
          </Label>
          <Input
            id="customInterval"
            placeholder='e.g. "Every 3 days"'
            value={customValue ?? ''}
            onChange={(e) => onChange('CUSTOM', e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
