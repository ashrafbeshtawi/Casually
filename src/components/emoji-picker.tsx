'use client'

import { useState, useMemo } from 'react'
import { SmileIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface EmojiPickerProps {
  value?: string | null
  onChange: (emoji: string | null) => void
}

interface EmojiEntry {
  emoji: string
  keywords: string[]
}

const EMOJI_CATEGORIES: { label: string; emojis: EmojiEntry[] }[] = [
  {
    label: 'Frequently Used',
    emojis: [
      { emoji: '\u{1F600}', keywords: ['grinning', 'happy', 'smile'] },
      { emoji: '\u{1F60A}', keywords: ['blush', 'happy', 'smile'] },
      { emoji: '\u{1F389}', keywords: ['party', 'celebrate', 'tada'] },
      { emoji: '\u{2705}', keywords: ['check', 'done', 'complete', 'yes'] },
      { emoji: '\u{274C}', keywords: ['cross', 'no', 'wrong', 'cancel'] },
      { emoji: '\u{2B50}', keywords: ['star', 'favorite', 'important'] },
      { emoji: '\u{1F525}', keywords: ['fire', 'hot', 'trending'] },
      { emoji: '\u{1F4A1}', keywords: ['idea', 'lightbulb', 'thought'] },
      { emoji: '\u{1F4DD}', keywords: ['memo', 'note', 'write'] },
      { emoji: '\u{1F4CC}', keywords: ['pin', 'pushpin', 'important'] },
    ],
  },
  {
    label: 'Objects',
    emojis: [
      { emoji: '\u{1F4E6}', keywords: ['package', 'box', 'delivery'] },
      { emoji: '\u{1F4CB}', keywords: ['clipboard', 'list', 'tasks'] },
      { emoji: '\u{1F4CA}', keywords: ['chart', 'graph', 'analytics'] },
      { emoji: '\u{1F4BC}', keywords: ['briefcase', 'work', 'business'] },
      { emoji: '\u{1F527}', keywords: ['wrench', 'tool', 'fix'] },
      { emoji: '\u{1F6E0}\u{FE0F}', keywords: ['tools', 'build', 'hammer'] },
      { emoji: '\u{1F4BB}', keywords: ['laptop', 'computer', 'code'] },
      { emoji: '\u{1F4F1}', keywords: ['phone', 'mobile', 'device'] },
      { emoji: '\u{1F3AF}', keywords: ['target', 'goal', 'bullseye'] },
      { emoji: '\u{1F3E0}', keywords: ['house', 'home'] },
    ],
  },
  {
    label: 'Nature',
    emojis: [
      { emoji: '\u{1F31F}', keywords: ['glowing star', 'sparkle', 'shine'] },
      { emoji: '\u{1F308}', keywords: ['rainbow', 'colorful'] },
      { emoji: '\u{1F338}', keywords: ['cherry blossom', 'flower', 'spring'] },
      { emoji: '\u{1F33F}', keywords: ['herb', 'plant', 'green'] },
      { emoji: '\u{1F30D}', keywords: ['globe', 'earth', 'world'] },
      { emoji: '\u{1F319}', keywords: ['moon', 'night', 'crescent'] },
      { emoji: '\u{2600}\u{FE0F}', keywords: ['sun', 'sunny', 'bright'] },
      { emoji: '\u{1F30A}', keywords: ['wave', 'ocean', 'water'] },
      { emoji: '\u{1F3D4}\u{FE0F}', keywords: ['mountain', 'snow', 'peak'] },
      { emoji: '\u{1F340}', keywords: ['clover', 'luck', 'four leaf'] },
    ],
  },
  {
    label: 'Activities',
    emojis: [
      { emoji: '\u{1F3CB}\u{FE0F}', keywords: ['weightlifting', 'gym', 'exercise'] },
      { emoji: '\u{1F3C3}', keywords: ['running', 'jog', 'sprint'] },
      { emoji: '\u{1F9D8}', keywords: ['yoga', 'meditate', 'zen'] },
      { emoji: '\u{1F4D6}', keywords: ['book', 'read', 'study'] },
      { emoji: '\u{1F3B5}', keywords: ['music', 'note', 'song'] },
      { emoji: '\u{1F3A8}', keywords: ['art', 'paint', 'palette'] },
      { emoji: '\u{1F9F9}', keywords: ['broom', 'clean', 'sweep'] },
      { emoji: '\u{1F4AA}', keywords: ['strong', 'muscle', 'flex'] },
      { emoji: '\u{1F3AE}', keywords: ['game', 'controller', 'play'] },
      { emoji: '\u{26BD}', keywords: ['soccer', 'football', 'sports'] },
    ],
  },
  {
    label: 'Food',
    emojis: [
      { emoji: '\u{1F34E}', keywords: ['apple', 'fruit', 'red'] },
      { emoji: '\u{1F957}', keywords: ['salad', 'healthy', 'green'] },
      { emoji: '\u{2615}', keywords: ['coffee', 'tea', 'hot', 'drink'] },
      { emoji: '\u{1F355}', keywords: ['pizza', 'food', 'slice'] },
      { emoji: '\u{1F9C1}', keywords: ['cupcake', 'dessert', 'sweet'] },
      { emoji: '\u{1F964}', keywords: ['drink', 'cup', 'beverage'] },
      { emoji: '\u{1F373}', keywords: ['cooking', 'egg', 'frying'] },
      { emoji: '\u{1F32E}', keywords: ['taco', 'mexican', 'food'] },
      { emoji: '\u{1F354}', keywords: ['burger', 'hamburger', 'food'] },
      { emoji: '\u{1F35C}', keywords: ['noodles', 'ramen', 'soup'] },
    ],
  },
  {
    label: 'Symbols',
    emojis: [
      { emoji: '\u{2764}\u{FE0F}', keywords: ['heart', 'love', 'red'] },
      { emoji: '\u{1F49A}', keywords: ['green heart', 'love'] },
      { emoji: '\u{1F499}', keywords: ['blue heart', 'love'] },
      { emoji: '\u{1F49C}', keywords: ['purple heart', 'love'] },
      { emoji: '\u{1F9E1}', keywords: ['orange heart', 'love'] },
      { emoji: '\u{1F49B}', keywords: ['yellow heart', 'love'] },
      { emoji: '\u{26A1}', keywords: ['lightning', 'bolt', 'zap', 'energy'] },
      { emoji: '\u{1F512}', keywords: ['lock', 'secure', 'private'] },
      { emoji: '\u{1F511}', keywords: ['key', 'unlock', 'access'] },
      { emoji: '\u{1F381}', keywords: ['gift', 'present', 'wrapped'] },
    ],
  },
]

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return EMOJI_CATEGORIES

    const query = search.toLowerCase().trim()
    return EMOJI_CATEGORIES.map((category) => ({
      ...category,
      emojis: category.emojis.filter((entry) =>
        entry.keywords.some((keyword) => keyword.includes(query))
      ),
    })).filter((category) => category.emojis.length > 0)
  }, [search])

  const handleSelect = (emoji: string) => {
    onChange(emoji)
    setOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange(null)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-20 text-lg"
        >
          {value ? (
            <span className="text-xl">{value}</span>
          ) : (
            <SmileIcon className="size-5 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          {/* Search */}
          <Input
            placeholder="Search emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />

          {/* Emoji grid */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No emojis found
              </p>
            )}
            {filteredCategories.map((category) => (
              <div key={category.label}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {category.label}
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {category.emojis.map((entry) => (
                    <button
                      key={entry.emoji}
                      type="button"
                      className="flex items-center justify-center h-9 w-full rounded-md text-xl hover:bg-accent transition-colors"
                      onClick={() => handleSelect(entry.emoji)}
                    >
                      {entry.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Clear button */}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground"
              onClick={handleClear}
            >
              <XIcon className="size-3 mr-1" />
              Clear emoji
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
