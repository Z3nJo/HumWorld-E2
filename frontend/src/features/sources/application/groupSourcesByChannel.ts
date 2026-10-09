import type { ChannelGroup, Source } from '../domain/source';

export function groupSourcesByChannel(sources: Source[]): ChannelGroup[] {
  const channelMap = new Map<number, ChannelGroup>();

  for (const src of sources) {
    let group = channelMap.get(src.channelId);
    if (!group) {
      group = {
        id: src.channel.id,
        name: src.channel.name,
        continent: src.channel.continent,
        sources: [],
        activeCount: 0,
      };
      channelMap.set(src.channelId, group);
    }
    group.sources.push(src);
    if (src.active) {
      group.activeCount += 1;
    }
  }

  return Array.from(channelMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
  );
}
