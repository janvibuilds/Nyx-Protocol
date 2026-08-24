# Phase 6: Main Trading Page Implementation

## Files to Create/Modify

### 1. `frontend/src/components/Toast.tsx` (NEW)
- 'use client' directive
- Props: `message: string`, `type: 'success' | 'error' | 'info'`, `onClose: () => void`
- Auto-dismiss after 5 seconds via `useEffect` + `setTimeout`
- Fixed position bottom-right (`fixed bottom-4 right-4`)
- Color coded: green bg for success, red bg for error, blue bg for info
- Close button (X) in top-right
- Tailwind styling, rounded, shadow

### 2. `frontend/src/components/BalanceDisplay.tsx` (NEW)
- 'use client' directive
- Props: `ethBalance: string`, `usdcBalance: string`
- Two mini cards side by side showing ETH and USDC balances
- Styled with `glass` class and gray-900 background

### 3. `frontend/src/app/trade/layout.tsx` (NEW)
- Simple wrapper providing full-height container styling
- Dark background, min-h-screen

### 4. `frontend/src/app/trade/page.tsx` (NEW)
- 'use client' directive
- Wires all 4 hooks:
  - `useWallet()` → wallet state
  - `useWebSocket()` → sequencer connection (connect on mount to `SEQUENCER_URL`)
  - `useTrade({ isConnected, sequencerPubKey, sendMessage, onMessage })` → order execution
  - `useOrderBook()` → order book state
- Message routing via `useEffect` on `onMessage`:
  - `ORDER_BOOK_UPDATE` → `orderBook.updateFromMessage(msg)`
  - `MATCH` → `setTrades(prev => [matchToTrade(msg), ...prev])`
  - `PRE_CONFIRMATION` → already handled by useTrade
  - `ERROR` → `setToasts(prev => [...prev, { id, message: msg.error, type: 'error' }])`
- Local state: `trades: Match[]`, `toasts: ToastData[]`
- Layout (3-column responsive grid):
  - Left: `<OrderBook bids={bids} asks={asks} spread={spread} />`
  - Center: `<OrderForm onSubmit={submitOrder} ... />` + `<PreConfirmation receipt={lastReceipt} latencyMs={latencyMs} />`
  - Right: `<TradeHistory trades={trades} />`
- Top bar: Logo + `<ConnectionStatus />` + `<WalletConnect />`
- Toast rendering at bottom-right

### 5. `frontend/src/app/page.tsx` (MODIFY)
- Already has "Launch App" linking to `/trade` ✓
- Add Midnight Network branding to footer
- Add nav links (Docs, GitHub)

## Implementation Order
1. Toast.tsx (no dependencies)
2. BalanceDisplay.tsx (no dependencies)
3. trade/layout.tsx (no dependencies)
4. trade/page.tsx (depends on all above + all existing hooks/components)
5. page.tsx update (cosmetic only)
