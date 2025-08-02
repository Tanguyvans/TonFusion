import { NetworkProvider } from "@ton/blueprint";
import {
  EventListenerService,
  EventListenerConfig,
} from "../services/EventListenerService";

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();

  console.log("\n🎧 TON Event Listener Service");
  console.log("==============================");

  // Get vault address
  const vaultAddress = await ui.inputAddress(
    "Enter vault contract address to monitor: "
  );

  // Get webhook URL (optional)
  const webhookChoice = await ui.choose(
    "Do you want to configure a webhook URL for FEVM integration?",
    ["Yes", "No"],
    (v) => v
  );

  let webhookUrl: string | undefined;
  if (webhookChoice === "Yes") {
    webhookUrl = await ui.input(
      "Enter webhook URL (e.g., http://your-fevm-service.com/webhook): "
    );
  }

  // Get polling interval
  const intervalStr = await ui.input(
    "Enter polling interval in milliseconds (default: 5000): "
  );
  const pollingInterval = intervalStr ? parseInt(intervalStr) : 5000;

  // Get starting point (optional)
  const startChoice = await ui.choose(
    "Do you want to start monitoring from a specific logical time?",
    ["Yes - Enter LT", "No - Start from latest"],
    (v) => v
  );

  let startFromLt: string | undefined;
  if (startChoice === "Yes - Enter LT") {
    startFromLt = await ui.input("Enter logical time (LT) to start from: ");
  }

  // Configure the event listener
  const config: EventListenerConfig = {
    vaultAddress: vaultAddress.toString(),
    network: provider.network() === "mainnet" ? "mainnet" : "testnet",
    webhookUrl,
    pollingInterval,
    startFromLt,
  };

  console.log("\n📋 Configuration:");
  console.log(`   Vault Address: ${config.vaultAddress}`);
  console.log(`   Network: ${config.network}`);
  console.log(`   Polling Interval: ${config.pollingInterval}ms`);
  if (config.webhookUrl) {
    console.log(`   Webhook URL: ${config.webhookUrl}`);
  }
  if (config.startFromLt) {
    console.log(`   Starting from LT: ${config.startFromLt}`);
  }

  const confirm = await ui.choose(
    "\nStart event listener with this configuration?",
    ["Yes", "No"],
    (v) => v
  );

  if (confirm === "No") {
    console.log("Operation cancelled");
    return;
  }

  // Create and start the event listener
  const eventListener = new EventListenerService(config);

  console.log("\n🚀 Starting event listener...");
  console.log("Press Ctrl+C to stop the service\n");

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down event listener...");
    eventListener.stopListening();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Shutting down event listener...");
    eventListener.stopListening();
    process.exit(0);
  });

  // Start listening for events
  try {
    await eventListener.startListening();
  } catch (error) {
    console.error("❌ Failed to start event listener:", error);
    process.exit(1);
  }
}
