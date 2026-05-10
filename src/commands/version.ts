import { getBuildInfo } from "../build-info";

export default async function handleVersion({
  say,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const info = getBuildInfo();
  const timestamp = info?.timestamp ?? "unknown";
  await say(`🔧 *Last built:* ${timestamp}`);
}
