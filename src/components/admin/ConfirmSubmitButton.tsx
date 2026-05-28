'use client'

import type { MouseEvent, ReactNode } from 'react'

interface ConfirmSubmitButtonProps {
  children: ReactNode
  className?: string
  message: string
}

export function ConfirmSubmitButton({
  children,
  className,
  message,
}: ConfirmSubmitButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(message)) {
      event.preventDefault()
    }
  }

  return (
    <button type="submit" className={className} onClick={handleClick}>
      {children}
    </button>
  )
}
