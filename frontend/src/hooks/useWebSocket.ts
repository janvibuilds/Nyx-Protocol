'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Message, parseMessage, serializeMessage, MessageType } from '@/lib/protocol'

const MAX_BACKOFF_MS = 30000
const BASE_BACKOFF_MS = 1000

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [sequencerPubKey, setSequencerPubKey] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoffRef = useRef(BASE_BACKOFF_MS)
  const urlRef = useRef<string>('')
  const messageHandlerRef = useRef<((msg: Message) => void) | null>(null)
  const isManualDisconnectRef = useRef(false)

  const connect = useCallback((url: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    urlRef.current = url
    isManualDisconnectRef.current = false
    setLastError(null)

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setReconnecting(false)
      backoffRef.current = BASE_BACKOFF_MS

      const getPubKeyMsg: Message = { type: MessageType.GET_PUB_KEY }
      ws.send(serializeMessage(getPubKeyMsg))
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = parseMessage(event.data)

        if (message.type === MessageType.PUB_KEY) {
          setSequencerPubKey((message as any).publicKey)
        }

        if (messageHandlerRef.current) {
          messageHandlerRef.current(message)
        }
      } catch (err) {
        console.error('[useWebSocket] Failed to parse message:', err)
      }
    }

    ws.onerror = () => {
      console.error('[useWebSocket] WebSocket error')
      setLastError('WebSocket connection error')
    }

    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null

      if (!isManualDisconnectRef.current) {
        setReconnecting(true)
        scheduleReconnect()
      }
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }

    const delay = backoffRef.current
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)

    reconnectTimerRef.current = setTimeout(() => {
      if (urlRef.current && !isManualDisconnectRef.current) {
        connect(urlRef.current)
      }
    }, delay)
  }, [connect])

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true
    setReconnecting(false)

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: Message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(serializeMessage(message))
    } else {
      console.warn('[useWebSocket] Cannot send message: not connected')
    }
  }, [])

  const onMessage = useCallback((handler: (msg: Message) => void) => {
    messageHandlerRef.current = handler
  }, [])

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return {
    isConnected,
    reconnecting,
    sequencerPubKey,
    lastError,
    connect,
    disconnect,
    sendMessage,
    onMessage,
  }
}
