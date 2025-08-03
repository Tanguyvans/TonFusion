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

### Calling the API via CLI Script

You can call the monitoring API easily using the provided CLI script:

#### Usage

```sh
npx ts-node scripts/testTxMonitor.ts \
  --address <TON wallet address> \
  --queryId <queryId> \
  --amount <amount> \
  --sinceTimestamp <UNIX timestamp>
```

- `--address` (required): TON wallet address to monitor
- `--queryId` (optional, default: 0): Query ID for the transaction
- `--amount` (optional, default: 1): Amount to monitor
- `--sinceTimestamp` (optional, default: now): UNIX timestamp (seconds) for monitoring start

**Note:**
- The `txHashbyTonConnect` field is fixed as `"txHashPlaceholder"` in this script version.
- The script will print the monitoring result to the console.

#### Example

```sh
npx ts-node scripts/testTxMonitor.ts \
  --address 0QB-re93kxeCoDDQ66RUZuG382uIAg3bhiFCzrlaeBTN6psR \
  --queryId 123 \
  --amount 1 \
  --sinceTimestamp 1754025040
```
for this transaction: [View on Tonviewer](https://testnet.tonviewer.com/transaction/76e536fee3b79dda50c9a5054668a35f02fede8affaefbe4456bf3527e05cced)

---

## Configuration

- Edit `constants/config.ts` to adjust monitoring intervals, limits, and op_code.
