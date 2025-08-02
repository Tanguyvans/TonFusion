import express from "express";
import { DepositEvent } from "./EventListenerService";

interface WebhookPayload {
  eventType: "ton_deposit";
  network: "mainnet" | "testnet";
  vaultAddress: string;
  event: DepositEvent;
}

interface FEVMConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey: string;
}

export class WebhookServer {
  private app: express.Application;
  private port: number;
  private fevmConfig?: FEVMConfig;

  constructor(port: number = 3000, fevmConfig?: FEVMConfig) {
    this.app = express();
    this.port = port;
    this.fevmConfig = fevmConfig;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        fevmConfigured: !!this.fevmConfig,
      });
    });

    // Main webhook endpoint for TON deposits
    this.app.post("/webhook", async (req, res) => {
      try {
        const payload = req.body as WebhookPayload;

        if (!this.isValidWebhookPayload(payload)) {
          return res.status(400).json({
            error: "Invalid webhook payload",
          });
        }

        console.log("🎉 Received TON deposit event:");
        console.log({
          eventType: payload.eventType,
          network: payload.network,
          vaultAddress: payload.vaultAddress,
          transactionId: payload.event.transactionId,
          queryId: payload.event.queryId,
          swapId: payload.event.swapId,
          amount: payload.event.amount,
          ethAddress: payload.event.ethAddress,
          tonAddress: payload.event.tonAddress,
        });

        // Process the deposit event
        await this.processDepositEvent(payload);

        res.json({
          success: true,
          message: "Event processed successfully",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error processing webhook:", error);
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Endpoint to query processed events (for debugging)
    this.app.get("/events/:transactionId", (req, res) => {
      // In a real implementation, you'd query from a database
      res.json({
        message: "Event query endpoint - implement database integration",
        transactionId: req.params.transactionId,
      });
    });
  }

  private isValidWebhookPayload(payload: any): payload is WebhookPayload {
    return (
      payload &&
      payload.eventType === "ton_deposit" &&
      payload.network &&
      payload.vaultAddress &&
      payload.event &&
      payload.event.transactionId &&
      payload.event.swapId &&
      payload.event.ethAddress &&
      payload.event.tonAddress
    );
  }

  private async processDepositEvent(payload: WebhookPayload): Promise<void> {
    const { event } = payload;

    console.log("📤 Processing deposit event for FEVM chain...");

    // Example: Forward to FEVM chain
    if (this.fevmConfig) {
      await this.forwardToFEVM(event);
    } else {
      console.log(
        "⚠️  FEVM configuration not provided, skipping chain forwarding"
      );
    }

    // Example: Store in database (implement as needed)
    await this.storeEvent(event);

    // Example: Send notifications (implement as needed)
    await this.sendNotifications(event);
  }

  private async forwardToFEVM(event: DepositEvent): Promise<void> {
    if (!this.fevmConfig) {
      throw new Error("FEVM configuration not provided");
    }

    try {
      console.log("🔗 Forwarding to FEVM chain...");

      // Example implementation for FEVM interaction
      // You would replace this with actual FEVM/Filecoin contract calls
      const fevmPayload = {
        swapId: event.swapId,
        ethAddress: event.ethAddress,
        tonAddress: event.tonAddress,
        amount: event.amount,
        queryId: event.queryId,
        withdrawalDeadline: event.withdrawalDeadline,
        tonTransactionId: event.transactionId,
      };

      console.log("📋 FEVM Payload:", fevmPayload);

      // TODO: Implement actual FEVM contract interaction
      // Example pseudo-code:
      /*
            const provider = new ethers.providers.JsonRpcProvider(this.fevmConfig.rpcUrl);
            const wallet = new ethers.Wallet(this.fevmConfig.privateKey, provider);
            const contract = new ethers.Contract(this.fevmConfig.contractAddress, ABI, wallet);
            
            const tx = await contract.registerTonDeposit(
                event.swapId,
                event.ethAddress,
                event.amount,
                event.withdrawalDeadline,
                event.tonTransactionId
            );
            
            console.log('✅ FEVM transaction sent:', tx.hash);
            await tx.wait();
            console.log('✅ FEVM transaction confirmed');
            */

      console.log(
        "✅ FEVM forwarding simulated (implement actual contract calls)"
      );
    } catch (error) {
      console.error("❌ Error forwarding to FEVM:", error);
      throw error;
    }
  }

  private async storeEvent(event: DepositEvent): Promise<void> {
    // TODO: Implement database storage
    console.log("💾 Storing event (implement database integration)");

    // Example: Store in PostgreSQL, MongoDB, etc.
    // const stored = await db.events.create({
    //     transactionId: event.transactionId,
    //     swapId: event.swapId,
    //     ethAddress: event.ethAddress,
    //     tonAddress: event.tonAddress,
    //     amount: event.amount,
    //     timestamp: event.timestamp,
    //     processed: true
    // });
  }

  private async sendNotifications(event: DepositEvent): Promise<void> {
    // TODO: Implement notifications (email, Slack, Discord, etc.)
    console.log("📧 Sending notifications (implement as needed)");

    // Example: Send to Discord/Slack
    // await discordBot.sendMessage(`New TON deposit: ${event.amount} from ${event.tonAddress}`);

    // Example: Send email notification
    // await emailService.send({
    //     to: 'admin@example.com',
    //     subject: 'New TON Deposit Detected',
    //     body: `Swap ID: ${event.swapId}, Amount: ${event.amount}`
    // });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`🚀 Webhook server started on port ${this.port}`);
        console.log(
          `📡 Webhook endpoint: http://localhost:${this.port}/webhook`
        );
        console.log(`❤️  Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  public stop(): void {
    console.log("🛑 Stopping webhook server...");
    process.exit(0);
  }
}

// Example usage and CLI runner
export async function runWebhookServer(): Promise<void> {
  const port = parseInt(process.env.WEBHOOK_PORT || "3000");

  // Example FEVM configuration (replace with actual values)
  const fevmConfig: FEVMConfig = {
    rpcUrl:
      process.env.FEVM_RPC_URL || "https://api.hyperspace.node.glif.io/rpc/v1",
    contractAddress: process.env.FEVM_CONTRACT_ADDRESS || "0x...",
    privateKey: process.env.FEVM_PRIVATE_KEY || "",
  };

  const server = new WebhookServer(
    port,
    fevmConfig.rpcUrl && fevmConfig.contractAddress && fevmConfig.privateKey
      ? fevmConfig
      : undefined
  );

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    server.stop();
  });

  process.on("SIGTERM", () => {
    server.stop();
  });

  await server.start();
}

// Auto-run if this file is executed directly
if (require.main === module) {
  runWebhookServer().catch(console.error);
}
