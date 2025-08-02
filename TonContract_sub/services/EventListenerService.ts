import { TonClient } from "@ton/ton";
import { Address, Cell, Transaction, loadTransaction } from "@ton/core";
import { getTonClient } from "../utils/TonClient";
import { Op } from "../utils/Constants";
import fetch from "node-fetch";

// Define the structure for deposit events
interface DepositEvent {
  transactionId: string;
  queryId: string;
  swapId: string;
  ethAddress: string;
  tonAddress: string;
  amount: string;
  withdrawalDeadline: number;
  publicWithdrawalDeadline: number;
  cancellationDeadline: number;
  publicCancellationDeadline: number;
  timestamp: number;
  blockNumber: number;
}

// Configuration interface
interface EventListenerConfig {
  vaultAddress: string;
  network: "mainnet" | "testnet";
  webhookUrl?: string;
  pollingInterval: number; // in milliseconds
  startFromLt?: string; // logical time to start monitoring from
}

export class EventListenerService {
  private tonClient: TonClient;
  private config: EventListenerConfig;
  private isRunning: boolean = false;
  private lastProcessedLt: string | null = null;

  constructor(config: EventListenerConfig) {
    this.config = config;
    this.tonClient = getTonClient(config.network);
    this.lastProcessedLt = config.startFromLt || null;
  }

  /**
   * Start monitoring events from the vault contract
   */
  public async startListening(): Promise<void> {
    if (this.isRunning) {
      console.log("Event listener is already running");
      return;
    }

    this.isRunning = true;
    console.log(
      `🚀 Starting event listener for vault: ${this.config.vaultAddress}`
    );
    console.log(`🌐 Network: ${this.config.network}`);
    console.log(`⏱️  Polling interval: ${this.config.pollingInterval}ms`);

    if (this.config.webhookUrl) {
      console.log(`🔗 Webhook URL: ${this.config.webhookUrl}`);
    }

    await this.pollForEvents();
  }

  /**
   * Stop the event listener
   */
  public stopListening(): void {
    this.isRunning = false;
    console.log("🛑 Event listener stopped");
  }

  /**
   * Main polling loop for events
   */
  private async pollForEvents(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.checkForNewTransactions();
        await this.sleep(this.config.pollingInterval);
      } catch (error) {
        console.error("❌ Error while polling for events:", error);
        await this.sleep(this.config.pollingInterval * 2); // Back off on error
      }
    }
  }

  /**
   * Check for new transactions on the vault contract
   */
  private async checkForNewTransactions(): Promise<void> {
    try {
      const vaultAddress = Address.parse(this.config.vaultAddress);

      // Get transactions from the vault contract
      const result = await this.tonClient.getTransactions(vaultAddress, {
        limit: 20,
        lt: this.lastProcessedLt || undefined,
        inclusive: false,
      });

      if (result.length === 0) {
        return;
      }

      // Process transactions in chronological order (oldest first)
      const transactions = result.reverse();

      for (const tx of transactions) {
        await this.processTransaction(tx);
        this.lastProcessedLt = tx.lt.toString();
      }
    } catch (error) {
      console.error("❌ Error checking for new transactions:", error);
      throw error;
    }
  }

  /**
   * Process a single transaction to extract deposit events
   */
  private async processTransaction(tx: Transaction): Promise<void> {
    try {
      // Check if this is an internal message
      if (!tx.inMessage || !tx.inMessage.body || !tx.inMessage.info) {
        return;
      }

      const body = tx.inMessage.body;
      if (!body) return;

      const slice = body.beginParse();
      if (slice.remainingBits < 32) return;

      const op = slice.loadUint(32);

      // Check for register_deposit operation
      if (op === Op.register_deposit) {
        const depositEvent = await this.parseRegisterDepositEvent(tx, slice);
        if (depositEvent) {
          await this.handleDepositEvent(depositEvent);
        }
      }
      // Check for transfer_notification operation (jetton deposits)
      else if (op === 0x7362d09c) {
        // transfer_notification opcode
        const depositEvent = await this.parseTransferNotificationEvent(tx);
        if (depositEvent) {
          await this.handleDepositEvent(depositEvent);
        }
      }
    } catch (error) {
      console.error("❌ Error processing transaction:", error);
    }
  }

  /**
   * Parse register_deposit event from transaction
   */
  private async parseRegisterDepositEvent(
    tx: Transaction,
    slice: any
  ): Promise<DepositEvent | null> {
    try {
      const queryId = slice.loadUint(64);
      const swapId = slice.loadUint(256);
      const ethAddr = slice.loadUint(160);
      const tonAddr = slice.loadAddress();
      const withdrawalDeadline = slice.loadUint(32);
      const publicWithdrawalDeadline = slice.loadUint(32);
      const cancellationDeadline = slice.loadUint(32);
      const publicCancellationDeadline = slice.loadUint(32);

      return {
        transactionId: tx.hash().toString("hex"),
        queryId: queryId.toString(),
        swapId: "0x" + swapId.toString(16).padStart(64, "0"),
        ethAddress: "0x" + ethAddr.toString(16).padStart(40, "0"),
        tonAddress: tonAddr?.toString() || "",
        amount: "0", // Will be filled by transfer_notification
        withdrawalDeadline,
        publicWithdrawalDeadline,
        cancellationDeadline,
        publicCancellationDeadline,
        timestamp: tx.now,
        blockNumber: Number(tx.lt),
      };
    } catch (error) {
      console.error("❌ Error parsing register_deposit event:", error);
      return null;
    }
  }

  /**
   * Parse transfer_notification event to get deposit amount
   */
  private async parseTransferNotificationEvent(
    tx: Transaction
  ): Promise<DepositEvent | null> {
    try {
      if (!tx.inMessage?.body) return null;

      const slice = tx.inMessage.body.beginParse();
      slice.loadUint(32); // skip op
      const queryId = slice.loadUint(64);
      const amount = slice.loadCoins();
      const senderAddress = slice.loadAddress();

      // Try to load forward payload
      const forwardPayload = slice.loadMaybeRef();
      if (!forwardPayload) return null;

      const payloadSlice = forwardPayload.beginParse();
      const forwardOp = payloadSlice.loadUint(32);

      if (forwardOp !== Op.register_deposit) return null;

      const swapId = payloadSlice.loadUint(256);
      const ethAddr = payloadSlice.loadUint(160);
      const tonAddr = payloadSlice.loadAddress();
      const withdrawalDeadline = payloadSlice.loadUint(32);
      const publicWithdrawalDeadline = payloadSlice.loadUint(32);
      const cancellationDeadline = payloadSlice.loadUint(32);
      const publicCancellationDeadline = payloadSlice.loadUint(32);

      return {
        transactionId: tx.hash().toString("hex"),
        queryId: queryId.toString(),
        swapId: "0x" + swapId.toString(16).padStart(64, "0"),
        ethAddress: "0x" + ethAddr.toString(16).padStart(40, "0"),
        tonAddress: tonAddr?.toString() || "",
        amount: amount.toString(),
        withdrawalDeadline,
        publicWithdrawalDeadline,
        cancellationDeadline,
        publicCancellationDeadline,
        timestamp: tx.now,
        blockNumber: Number(tx.lt),
      };
    } catch (error) {
      console.error("❌ Error parsing transfer_notification event:", error);
      return null;
    }
  }

  /**
   * Handle a detected deposit event
   */
  private async handleDepositEvent(event: DepositEvent): Promise<void> {
    console.log("🎉 Deposit event detected:");
    console.log({
      transactionId: event.transactionId,
      queryId: event.queryId,
      swapId: event.swapId,
      ethAddress: event.ethAddress,
      tonAddress: event.tonAddress,
      amount: event.amount,
      timestamp: new Date(event.timestamp * 1000).toISOString(),
    });

    // Send webhook notification if configured
    if (this.config.webhookUrl) {
      await this.sendWebhook(event);
    }

    // You can add additional event handling logic here
    // For example, storing in database, sending to queue, etc.
  }

  /**
   * Send webhook notification to FEVM or other external service
   */
  private async sendWebhook(event: DepositEvent): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      const payload = {
        eventType: "ton_deposit",
        network: this.config.network,
        vaultAddress: this.config.vaultAddress,
        event: event,
      };

      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log("✅ Webhook sent successfully");
      } else {
        console.error(
          "❌ Webhook failed:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("❌ Error sending webhook:", error);
    }
  }

  /**
   * Get the current monitoring status
   */
  public getStatus(): {
    isRunning: boolean;
    lastProcessedLt: string | null;
    vaultAddress: string;
  } {
    return {
      isRunning: this.isRunning,
      lastProcessedLt: this.lastProcessedLt,
      vaultAddress: this.config.vaultAddress,
    };
  }

  /**
   * Utility function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export types for use in other modules
export { DepositEvent, EventListenerConfig };
