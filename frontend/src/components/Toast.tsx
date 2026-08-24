'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

const typeStyles = {
  success: 'bg-green-600 border-green-500',
  error: 'bg-red-600 border-red-500',
  info: 'bg-blue-600 border-blue-500',
}

const typeIcons = {
  success: (
    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg text-white text-sm animate-slide-in ${typeStyles[type]}`}
    >
      {typeIcons[type]}
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-white/70 hover:text-white transition-colors ml-2"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
