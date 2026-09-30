import {
  ChevronDown,
  Languages,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { setLanguage, type Language } from '@/lib/i18n'
import { i18n } from '@/lib/i18n'
import { Button } from './ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './ui/DropdownMenu'

type PreferenceMenuProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  icon?: LucideIcon
}

function PreferenceMenu({ label, value, onChange, options, icon: Icon }: PreferenceMenuProps) {
  const selected = options.find((o) => o.value === value)?.label
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={Icon ? 'ghost' : 'outline'}
          size={Icon ? 'icon' : 'default'}
          aria-label={label}
          title={Icon ? label + ': ' + selected : undefined}
          className={
            Icon
              ? 'text-muted-foreground [@media(pointer:coarse)]:size-11'
              : 'justify-between gap-3 border-input font-normal shadow-none dark:bg-background dark:hover:bg-accent'
          }
        >
          {Icon ? (
            <Icon aria-hidden="true" />
          ) : (
            <>
              {selected}
              <ChevronDown aria-hidden="true" className="text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange} aria-label={label}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const [lang, setLang] = useState<string>(i18n.resolvedLanguage ?? 'zh')
  useEffect(() => {
    const handler = (l: string) => setLang(l)
    i18n.on('languageChanged', handler)
    return () => { i18n.off('languageChanged', handler) }
  }, [])
  return (
    <PreferenceMenu
      icon={compact ? Languages : undefined}
      label="语言"
      value={lang}
      onChange={(value) => setLanguage(value as Language)}
      options={[
        { value: 'zh', label: '简体中文' },
        { value: 'en', label: 'English' },
      ]}
    />
  )
}

export function ThemeSelect({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const selectedTheme = theme === 'light' || theme === 'dark' ? theme : 'system'
  const icon = selectedTheme === 'light' ? Sun : selectedTheme === 'dark' ? Moon : Monitor
  const themeLabels: Record<string, string> = { light: '浅色', dark: '深色', system: '跟随系统' }
  return (
    <PreferenceMenu
      icon={compact ? icon : undefined}
      label="主题"
      value={selectedTheme}
      onChange={setTheme}
      options={[
        { value: 'light', label: '浅色' },
        { value: 'dark', label: '深色' },
        { value: 'system', label: '跟随系统' },
      ]}
    />
  )
}