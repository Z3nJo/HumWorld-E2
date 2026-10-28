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

export const IPTC_CATEGORY_LABELS: Record<IptcCategory, string> = {
  'arts/culture/entertainment/media': 'Arte, cultura y entretenimiento',
  'conflict/war/peace': 'Conflicto, guerra y paz',
  'crime/law/justice': 'Crimen, ley y justicia',
  'disaster/accident': 'Desastres y accidentes',
  'economy/business/finance': 'Economía',
  'education': 'Educación',
  'environment': 'Medio ambiente',
  'health': 'Salud',
  'human interest': 'Interés humano',
  'labour': 'Trabajo',
  'lifestyle/leisure': 'Estilo de vida y ocio',
  'politics': 'Política',
  'religion': 'Religión',
  'science/technology': 'Ciencia y tecnología',
  'society': 'Sociedad',
  'sport': 'Deportes',
  'weather': 'Clima',
};

export interface Channel {
  id: number;
  name: string;
  continent: Continent;
  country: string | null;
  siteUrl: string | null;
  active: boolean;
  createdAt?: string;
}

export interface RssSource {
  id: number;
  channelId: number;
  name: string;
  feedUrl: string;
  category: IptcCategory;
  language: Language;
  active: boolean;
  lastCaptureAt?: string | null;
  createdAt?: string;
}

export interface ChannelWithSources extends Channel {
  sources: RssSource[];
  languages: Language[];
}

export type ChannelSummary = Channel;
export type Source = RssSource & { iptcCategory: IptcCategory; channel: ChannelSummary };
export type ChannelGroup = ChannelWithSources;

export type SourceStatusFilter = 'all' | 'active' | 'inactive';

export interface CreateSourceFeedInput {
  name: string;
  feedUrl: string;
  iptcCategory: IptcCategory;
  language: Language;
  country?: string | null;
  active?: boolean;
}

export interface CreateSourceBatchInput {
  channel?: {
    name: string;
    continent: Continent;
    country?: string | null;
    siteUrl?: string | null;
    active?: boolean;
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

export interface CaptureResult {
  inserted: number;
  failedSources: number;
  skippedSourceIds: number[];
}
