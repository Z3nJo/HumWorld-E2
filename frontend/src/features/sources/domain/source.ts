export type Continent =
  | 'Africa'
  | 'America'
  | 'Antartida'
  | 'Asia'
  | 'Europa'
  | 'Oceania';

export type Language = 'es' | 'en';

export type IptcCategory =
  | 'arts/culture/entertainment/media'
  | 'conflict/war/peace'
  | 'crime/law/justice'
  | 'disaster/accident'
  | 'economy/business/finance'
  | 'education'
  | 'environment'
  | 'health'
  | 'human interest'
  | 'labour'
  | 'lifestyle/leisure'
  | 'politics'
  | 'religion'
  | 'science/technology'
  | 'society'
  | 'sport'
  | 'weather';

export const CONTINENTS: Continent[] = [
  'Africa',
  'America',
  'Antartida',
  'Asia',
  'Europa',
  'Oceania',
];

export const CONTINENT_LABELS: Record<Continent, string> = {
  Africa: 'África',
  America: 'América',
  Antartida: 'Antártida',
  Asia: 'Asia',
  Europa: 'Europa',
  Oceania: 'Oceanía',
};

export const IPTC_CATEGORIES: IptcCategory[] = [
  'arts/culture/entertainment/media',
  'conflict/war/peace',
  'crime/law/justice',
  'disaster/accident',
  'economy/business/finance',
  'education',
  'environment',
  'health',
  'human interest',
  'labour',
  'lifestyle/leisure',
  'politics',
  'religion',
  'science/technology',
  'society',
  'sport',
  'weather',
];

export interface ChannelSummary {
  id: number;
  name: string;
  continent: Continent;
}

export interface Source {
  id: number;
  channelId: number;
  name: string;
  feedUrl: string;
  iptcCategory: IptcCategory;
  language: Language;
  active: boolean;
  channel: ChannelSummary;
}

export interface ChannelGroup {
  id: number;
  name: string;
  continent: Continent;
  sources: Source[];
  activeCount: number;
}

export type SourceStatusFilter = 'all' | 'active' | 'inactive';

export interface CreateSourceFeedInput {
  name: string;
  feedUrl: string;
  iptcCategory: IptcCategory;
  language: Language;
  active?: boolean;
}

export interface CreateSourceBatchInput {
  channel?: {
    name: string;
    continent: Continent;
  };
  channelId?: number;
  sources: CreateSourceFeedInput[];
}

export interface ReplaceSourceInput {
  name: string;
  feedUrl: string;
  iptcCategory: IptcCategory;
  language: Language;
  active: boolean;
}

export interface PatchSourceInput {
  name?: string;
  feedUrl?: string;
  iptcCategory?: IptcCategory;
  language?: Language;
  active?: boolean;
}
