# TonTxMonitor

A simple TON blockchain transaction monitor utility for Node.js/TypeScript projects.

## Features
- Monitors TON transactions for specific op_code and query_id
- API endpoint for monitoring requests
- Simple configuration and extensibility

## Installation

```sh
npm install
```

## Usage

1. **Start the development server:**
   ```sh
   npx next dev
   ```
2. **To build for production:**
   ```sh
   npx next build
   npx next start
   ```

---

## Configuration

- Edit `constants/config.ts` to adjust monitoring intervals, limits, and op_code.
- Switch between Mainnet and Testnet by setting `NEXT_PUBLIC_TON_API_BASE_URL` in [.env]
  ```
  # Mainnet
  NEXT_PUBLIC_TON_API_BASE_URL=https://tonapi.io
  # Testnet
  # NEXT_PUBLIC_TON_API_BASE_URL=https://testnet.tonapi.io
  ```
  - Mainnet: `https://tonapi.io`
  - Testnet: `https://testnet.tonapi.io`
