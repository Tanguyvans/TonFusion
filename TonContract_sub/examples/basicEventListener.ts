import {
  EventListenerService,
  EventListenerConfig,
} from "../services/EventListenerService";

/**
 * Basic example of how to use the EventListenerService programmatically
 */
async function runBasicEventListener() {
  // Configuration for the event listener
  const config: EventListenerConfig = {
    vaultAddress: "kQBBkjy_kUeB8um1BVChq1Uru4MXM8V-CixDZ1XPyLjaKR5v", // Sample vault address
    network: "testnet",
    pollingInterval: 5000, // Poll every 5 seconds
    webhookUrl: "http://localhost:3000/webhook", // Optional webhook
    // startFromLt: '47291837000003' // Optional: start from specific logical time
  };

  console.log("🎧 Starting Basic Event Listener Example");
  console.log("=========================================");

  // Create the event listener
  const eventListener = new EventListenerService(config);

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

  try {
    // Start listening for events
    await eventListener.startListening();
  } catch (error) {
    console.error("❌ Failed to start event listener:", error);
    process.exit(1);
  }
}

/**
 * Example with custom event handling (without webhook)
 */
async function runCustomEventHandler() {
  const config: EventListenerConfig = {
    vaultAddress: "kQBBkjy_kUeB8um1BVChq1Uru4MXM8V-CixDZ1XPyLjaKR5v",
    network: "testnet",
    pollingInterval: 3000, // Poll every 3 seconds
    // No webhook URL - handle events in code directly
  };

  console.log("🎧 Starting Custom Event Handler Example");
  console.log("========================================");

  const eventListener = new EventListenerService(config);

  // You can extend the EventListenerService or handle events differently
  // This is just a basic example - in practice you'd extend the class
  console.log(
    "✅ Custom event handler would be implemented by extending EventListenerService"
  );
  console.log("   and overriding the handleDepositEvent method");

  // For this example, we'll just start the basic listener
  await eventListener.startListening();
}

// Command line argument handling
const args = process.argv.slice(2);
const mode = args[0] || "basic";

async function main() {
  switch (mode) {
    case "basic":
      await runBasicEventListener();
      break;
    case "custom":
      await runCustomEventHandler();
      break;
    default:
      console.log(
        "Usage: npx ts-node examples/basicEventListener.ts [basic|custom]"
      );
      console.log("");
      console.log("Examples:");
      console.log(
        "  npx ts-node examples/basicEventListener.ts basic   # Run basic listener"
      );
      console.log(
        "  npx ts-node examples/basicEventListener.ts custom  # Run custom handler"
      );
      process.exit(1);
  }
}

// Run the example
main().catch((error) => {
  console.error("❌ Example failed:", error);
  process.exit(1);
});
