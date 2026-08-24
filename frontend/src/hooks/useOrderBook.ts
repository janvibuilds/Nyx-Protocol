'use client'

import { useState, useCallback } from 'react'
import { Order } from '@/types'
import { OrderBookUpdateMessage, MessageType } from '@/lib/protocol'

export interface OrderBookEntry {
  price: string
  quantity: string
  id: string
}

export function useOrderBook() {
  const [bids, setBids] = useState<OrderBookEntry[]>([])
  const [asks, setAsks] = useState<OrderBookEntry[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const sortBids = useCallback((entries: OrderBookEntry[]): OrderBookEntry[] => {
    return [...entries].sort((a, b) => Number(b.price) - Number(a.price))
  }, [])

  const sortAsks = useCallback((entries: OrderBookEntry[]): OrderBookEntry[] => {
    return [...entries].sort((a, b) => Number(a.price) - Number(b.price))
  }, [])

  const updateFromMessage = useCallback((message: OrderBookUpdateMessage) => {
    if (message.type !== MessageType.ORDER_BOOK_UPDATE) return

    const newBids = message.bids.map((b, i) => ({
      price: b.price,
      quantity: b.quantity,
      id: `bid-${message.timestamp}-${i}`,
    }))

    const newAsks = message.asks.map((a, i) => ({
      price: a.price,
      quantity: a.quantity,
      id: `ask-${message.timestamp}-${i}`,
    }))

    setBids(sortBids(newBids))
    setAsks(sortAsks(newAsks))
    setLastUpdate(new Date(message.timestamp))
  }, [sortBids, sortAsks])

  const addOrder = useCallback((order: Order) => {
    const entry: OrderBookEntry = {
      price: order.price,
      quantity: order.quantity,
      id: order.id,
    }

    if (order.side === 'buy') {
      setBids(prev => sortBids([...prev, entry]))
    } else {
      setAsks(prev => sortAsks([...prev, entry]))
    }
    setLastUpdate(new Date())
  }, [sortBids, sortAsks])

  const removeOrder = useCallback((orderId: string) => {
    setBids(prev => prev.filter(b => b.id !== orderId))
    setAsks(prev => prev.filter(a => a.id !== orderId))
    setLastUpdate(new Date())
  }, [])

  const clear = useCallback(() => {
    setBids([])
    setAsks([])
    setLastUpdate(null)
  }, [])

  const getSpread = useCallback((): number | null => {
    if (bids.length === 0 || asks.length === 0) return null
    const bestBid = Number(bids[0].price)
    const bestAsk = Number(asks[0].price)
    return bestAsk - bestBid
  }, [bids, asks])

  const getMidPrice = useCallback((): number | null => {
    if (bids.length === 0 || asks.length === 0) return null
    const bestBid = Number(bids[0].price)
    const bestAsk = Number(asks[0].price)
    return (bestBid + bestAsk) / 2
  }, [bids, asks])

  return {
    bids,
    asks,
    lastUpdate,
    updateFromMessage,
    addOrder,
    removeOrder,
    clear,
    getSpread,
    getMidPrice,
  }
}
