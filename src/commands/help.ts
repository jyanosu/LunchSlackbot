export default async function handleHelp({
  say,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  await say(
    [
      "🍱 *LunchBot Commands:*",
      "begin (/lsb-begin) - start the lunch poll for the day",
      "suggest <place> (/lsb-suggest) - add a lunch place to today's poll",
      "suggestiondeadline <time> (/lsb-deadline) - set the suggestion deadline (default 11:00 AM EST)",
      "remove <place> (/lsb-remove) - remove a suggestion from today's poll",
      "list (/lsb-list) - show today's lunch suggestions",
      "vote (/lsb-vote) - start voting on today's suggestions",
      "showpoll (/lsb-showpoll) - show the current poll",
      "showmasterlist (/lsb-showmasterlist) - show the master suggestion list",
      "removefrommasterlist <place> (/lsb-removefrommasterlist) - remove from master list",
      "seedmasterlist (/lsb-seedmasterlist) - seed the master list with predefined places",
      "suggestfrommasterlist [count] (/lsb-suggestfrommasterlist) - suggest random places from master list (default 5)",
      "endpoll (/lsb-endpoll) - end voting and announce the winner",
      "history (/lsb-showhistory) - show past lunch winners",
      "help (/lsb-help) - show this message",
    ].join("\n")
  );
}
