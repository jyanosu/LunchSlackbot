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
      "schedule (/lsb-schedule) - show current schedule",
      "schedule enable (/lsb-schedule) - enable automatic schedule",
      "schedule disable (/lsb-schedule) - disable automatic schedule",
      "schedulebegin <time> (/lsb-schedulebegin) - set automatic begin time",
      "schedulevote <time> (/lsb-schedulevote) - set automatic vote time",
      "scheduleend <time> (/lsb-scheduleend) - set automatic end time",
      "scheduledays <days> (/lsb-scheduledays) - set which days the schedule runs (e.g., 2-3 for Tue-Wed)",
      "prune [days] (/lsb-prune) - set prune retention period in days (default 120, min 7)",
      "version (/lsb-version) - show bot build timestamp",
      "help (/lsb-help) - show this message",
    ].join("\n")
  );
}
