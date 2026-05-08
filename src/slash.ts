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

  app.command("/lsb-showmasterlist", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("showmasterlist", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-removefrommasterlist", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("removefrommasterlist", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-seedmasterlist", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("seedmasterlist", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-suggestfrommasterlist", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("suggestfrommasterlist", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-endpoll", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("endpoll", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-showhistory", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("showhistory", { say, args: "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-schedulebegin", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("schedulebegin", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-schedulevote", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("schedulevote", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-scheduleend", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("scheduleend", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-scheduledays", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("scheduledays", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });

  app.command("/lsb-schedule", async ({ ack, say, body }) => {
    await ack();
    await routeCommand("schedule", { say, args: body.text ?? "", userId: body.user_id, channelId: body.channel_id });
  });
}
