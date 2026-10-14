import type { Channel, ChannelWithSources, Language, RssSource } from '../domain/source';

export function deriveChannelLanguages(sources: RssSource[]): Language[] {
  const langs = new Set<Language>();
  for (const src of sources) {
    if (src.language) {
      langs.add(src.language);
    }
  }
  return Array.from(langs).sort();
}

export function groupSourcesByChannel(
  channels: Channel[] = [],
  sources: RssSource[] = [],
): ChannelWithSources[] {
  const sourcesByChannelId = new Map<number, RssSource[]>();

  for (const src of sources || []) {
    const list = sourcesByChannelId.get(src.channelId) ?? [];
    list.push(src);
    sourcesByChannelId.set(src.channelId, list);
  }

  const result: ChannelWithSources[] = (channels || []).map((ch) => {
    const chSources = sourcesByChannelId.get(ch.id) ?? [];
    return {
      ...ch,
      sources: chSources,
      languages: deriveChannelLanguages(chSources),
    };
  });

  return result.sort((a, b) => a.id - b.id);
}
