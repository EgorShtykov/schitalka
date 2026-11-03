import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { hasAdvancedNotation, mathToTex } from '../lib/math-format'

interface MathTextProps {
  text: string
  className?: string
  displayMode?: boolean
}

export function MathText({ text, className = '', displayMode = false }: MathTextProps) {
  const html = useMemo(() => {
    if (!hasAdvancedNotation(text)) return null
    try {
      return katex.renderToString(mathToTex(text), {
        displayMode,
        throwOnError: false,
        strict: false,
        output: 'html',
      })
    } catch {
      return null
    }
  }, [displayMode, text])

  if (!html) return <span className={className}>{text}</span>
  return (
    <span
      className={`math-text ${className}`}
      aria-label={text}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
