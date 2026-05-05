import "dotenv/config";
import { App } from "@slack/bolt";
import { handleAppMention } from "./handlers";
import { handleConfirmation, handleBlockAction } from "./commands/remove";
import { handleVoteToggle } from "./commands/vote";
import { handleExpandVoters } from "./commands/expandvoters";
import { loadStore, loadWinners, saveStore } from "./store";
import { registerSlashCommands } from "./slash";
import { initSchedule, setBoltApp } from "./cron";

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
app.action("vote_toggle", handleVoteToggle as any);
app.action("expand_voters", handleExpandVoters as any);

registerSlashCommands(app);

console.log("✅ Bot listeners registered: app_mention, message, slash commands");

// Seed store from data/lunch.json if it exists
loadStore();
loadWinners();

// Graceful shutdown: save store before exiting
process.on("SIGTERM", () => {
  console.log("SIGTERM received, saving store...");
  saveStore();
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("SIGINT received, saving store...");
  saveStore();
  process.exit(0);
});

(async () => {
  try {
    setBoltApp(app);
    await app.start(process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
    console.log("⚡ LunchBot is running!");

    // Initialize scheduled cron jobs after app starts
    initSchedule(app);
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
})();
