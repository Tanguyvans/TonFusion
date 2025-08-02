# TON Event Listener Service

This service monitors TON blockchain events from the `testDepositJetton` method and provides webhook notifications for FEVM chain integration.

## 🏗️ Architecture

The event listener service consists of three main components:

1. **EventListenerService**: Monitors TON blockchain for deposit events
2. **WebhookServer**: Receives events and forwards them to FEVM/external services
3. **Configuration**: Manages settings for both services

## 🚀 Quick Start

### 1. Start the Webhook Server (Optional)

If you want to receive events via webhook, start the server first:

```bash
# Option 1: Using Node.js directly
npm install express node-fetch
npx ts-node scripts/runWebhookServer.ts

# Option 2: With environment variables
WEBHOOK_PORT=3000 \
FEVM_RPC_URL=https://api.hyperspace.node.glif.io/rpc/v1 \
FEVM_CONTRACT_ADDRESS=0x1234... \
FEVM_PRIVATE_KEY=0xabcd... \
npx ts-node scripts/runWebhookServer.ts
```

### 2. Start the Event Listener

```bash
npx blueprint run
# Select: startEventListener
```

Follow the prompts to configure:

- Vault contract address to monitor
- Webhook URL (if using webhook server)
- Polling interval (default: 5000ms)
- Starting logical time (optional)

## 🔧 Configuration

### Event Listener Configuration

```typescript
interface EventListenerConfig {
  vaultAddress: string; // TON vault contract address
  network: "mainnet" | "testnet"; // TON network
  webhookUrl?: string; // Optional webhook endpoint
  pollingInterval: number; // Polling interval in milliseconds
  startFromLt?: string; // Optional starting logical time
}
```

### FEVM Configuration

```typescript
interface FEVMConfig {
  rpcUrl: string; // FEVM RPC endpoint
  contractAddress: string; // FEVM contract address
  privateKey: string; // Private key for transactions
}
```

## 📡 Events Monitored

The service monitors these TON operations:

### 1. `register_deposit` (Direct)

- **Opcode**: `0x3a8f7c12`
- **Triggered by**: Direct calls to vault contract
- **Contains**: Swap metadata without amount

### 2. `transfer_notification` (Jetton Transfer)

- **Opcode**: `0x7362d09c`
- **Triggered by**: Jetton transfers to vault contract
- **Contains**: Complete deposit information including amount

## 📋 Event Structure

```typescript
interface DepositEvent {
  transactionId: string; // TON transaction hash
  queryId: string; // Query ID from deposit
  swapId: string; // SHA256 hash of secret (hex)
  ethAddress: string; // Ethereum address (hex)
  tonAddress: string; // TON address
  amount: string; // Deposit amount in nano
  withdrawalDeadline: number; // UNIX timestamp
  publicWithdrawalDeadline: number; // UNIX timestamp
  cancellationDeadline: number; // UNIX timestamp
  publicCancellationDeadline: number; // UNIX timestamp
  timestamp: number; // Transaction timestamp
  blockNumber: number; // Logical time (LT)
}
```

## 🔗 Webhook Integration

### Webhook Payload

```json
{
  "eventType": "ton_deposit",
  "network": "testnet",
  "vaultAddress": "kQBBkjy_kUeB8um1BVChq1Uru4MXM8V-CixDZ1XPyLjaKR5v",
  "event": {
    "transactionId": "abc123...",
    "queryId": "12345",
    "swapId": "0x789abc...",
    "ethAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "tonAddress": "EQD...",
    "amount": "1000000",
    "withdrawalDeadline": 1700000000,
    "publicWithdrawalDeadline": 1700000180,
    "cancellationDeadline": 1700000360,
    "publicCancellationDeadline": 1700000540,
    "timestamp": 1699999999,
    "blockNumber": 47291837000003
  }
}
```

### Webhook Server Endpoints

- `POST /webhook` - Receive TON deposit events
- `GET /health` - Health check
- `GET /events/:transactionId` - Query specific events

## 🔧 FEVM Integration

The webhook server can automatically forward events to FEVM contracts:

```typescript
// Example FEVM contract interaction (pseudo-code)
const fevmPayload = {
  swapId: event.swapId,
  ethAddress: event.ethAddress,
  tonAddress: event.tonAddress,
  amount: event.amount,
  queryId: event.queryId,
  withdrawalDeadline: event.withdrawalDeadline,
  tonTransactionId: event.transactionId,
};

// Call FEVM contract
await contract.registerTonDeposit(
  event.swapId,
  event.ethAddress,
  event.amount,
  event.withdrawalDeadline,
  event.tonTransactionId
);
```

## 🛠️ Development

### Running with Custom Configuration

1. Copy example config:

```bash
cp config/eventListener.example.json config/eventListener.json
```

2. Update configuration:

```json
{
  "vaultAddress": "YOUR_VAULT_ADDRESS",
  "network": "testnet",
  "pollingInterval": 5000,
  "webhookUrl": "http://localhost:3000/webhook"
}
```

3. Run with config:

```bash
npx ts-node -e "
const config = require('./config/eventListener.json');
const { EventListenerService } = require('./services/EventListenerService');
const listener = new EventListenerService(config);
listener.startListening();
"
```

### Testing Events

Use the existing `testDepositJetton` script to generate test events:

```bash
npx blueprint run
# Select: testDepositJetton
```

## 📊 Monitoring

### Logs

The service provides detailed logging:

```
🚀 Starting event listener for vault: kQBBkjy_kUeB8um1BVChq1Uru4MXM8V-CixDZ1XPyLjaKR5v
🌐 Network: testnet
⏱️  Polling interval: 5000ms
🔗 Webhook URL: http://localhost:3000/webhook

🎉 Deposit event detected:
{
  transactionId: 'abc123...',
  queryId: '12345',
  swapId: '0x789abc...',
  ethAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  tonAddress: 'EQD...',
  amount: '1000000',
  timestamp: '2024-01-01T12:00:00.000Z'
}

✅ Webhook sent successfully
```

### Health Checks

Check webhook server health:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "fevmConfigured": true
}
```

## 🚨 Error Handling

The service includes comprehensive error handling:

- **Network Errors**: Automatic retry with backoff
- **Parse Errors**: Log and continue processing
- **Webhook Failures**: Log but don't stop monitoring
- **Invalid Transactions**: Skip and continue

## 🔒 Security Considerations

1. **Private Keys**: Store FEVM private keys securely (environment variables)
2. **Webhook Authentication**: Add authentication to webhook endpoints
3. **Rate Limiting**: Implement rate limiting on webhook server
4. **Input Validation**: Validate all incoming webhook data

## 📈 Performance

- **Memory Usage**: ~50MB for basic monitoring
- **Network Usage**: Minimal, polls every 5 seconds by default
- **Latency**: Events detected within 5-10 seconds of confirmation

## 🐛 Troubleshooting

### Common Issues

1. **No events detected**:

   - Check vault address is correct
   - Verify network (mainnet vs testnet)
   - Ensure transactions are confirmed

2. **Webhook timeouts**:

   - Check webhook server is running
   - Verify URL is accessible
   - Check firewall settings

3. **FEVM integration fails**:
   - Verify RPC URL is correct
   - Check private key has sufficient balance
   - Validate contract address and ABI

### Debug Mode

Enable verbose logging:

```bash
DEBUG=true npx ts-node scripts/startEventListener.ts
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## 📄 License

Same as parent project license.
