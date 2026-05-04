import "dotenv/config";
import { App } from "@slack/bolt";
import { handleAppMention } from "./handlers";
import { handleConfirmation, handleBlockAction } from "./commands/remove";
import { loadStore } from "./store";
import { registerSlashCommands } from "./slash";

const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;

if (!SLACK_BOT_TOKEN) {
  console.error("Missing required env var: SLACK_BOT_TOKEN");
  process.exit(1);
}
if (!SLACK_SIGNING_SECRET) {
  console.error("Missing required env var: SLACK_SIGNING_SECRET");
  process.exit(1);
}

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
});

app.event("app_mention", handleAppMention);
app.message(/.*/, handleConfirmation as any);
app.action(/confirm_/, handleBlockAction as any);

registerSlashCommands(app);

console.log("✅ Bot listeners registered: app_mention, message, slash commands");

// Seed store from data/lunch.json if it exists
loadStore();

(async () => {
  try {
    await app.start(process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
    console.log("⚡ LunchBot is running!");
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
})();
