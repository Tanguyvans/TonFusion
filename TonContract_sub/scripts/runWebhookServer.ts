import { runWebhookServer } from "../services/WebhookServer";

// Simple runner for the webhook server
runWebhookServer().catch((error) => {
  console.error("❌ Failed to start webhook server:", error);
  process.exit(1);
});
