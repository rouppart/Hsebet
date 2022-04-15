/// <reference types="svelte" />
/// <reference types="vite/client" />

interface Group {
  name: string
  quantity: number
  ratio: 1
}

interface Payment {
  description: string
  amount: number
  quantityByGroupIndex: number[]
}