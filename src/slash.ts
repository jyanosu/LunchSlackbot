import { App } from "@slack/bolt";
import { routeCommand } from "./handlers";

export function registerSlashCommands(app: App) {
  app.command("/lsb-begin", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("begin", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-suggest", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("suggest", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-deadline", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("suggestiondeadline", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-remove", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("remove", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-list", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("list", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-help", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("help", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-vote", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("vote", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-showpoll", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("showpoll", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });
}
