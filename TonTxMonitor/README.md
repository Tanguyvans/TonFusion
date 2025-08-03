# TonTxMonitor

A simple TON blockchain transaction monitor utility for Node.js/TypeScript projects.

## Features
- Monitors TON transactions for specific op_code and query_id
- API endpoint for monitoring requests
- Simple configuration and extensibility

## Installation

```
npm install
```

## Usage

1. Start the development server:
   ```
   npx next dev
   ```
2. To build for production:
   ```
   npx next build
   npx next start
   ```
2. Send a POST request to `/api` endpoint with the following JSON body:
   ```json
   {
     "userAddress": "<TON wallet address>",
     "txHashbyTonConnect": "<transaction hash>",
     "queryId": "0",
     "sinceTimestamp": 1754093628,
     "totalAmount": "1"
   }
   ```
3. The server will respond with the monitoring result.

## Configuration

- Edit `constants/config.ts` to adjust monitoring intervals, limits, and op_code.
