export interface AkashicPatternData {
  vertices: { x: number; y: number }[];
  edges: { from: number; to: number }[];
  circles: { cx: number; cy: number; radius: number }[];
}

export interface AkashicListItem {
  id: string;
  name: string;
  thumbnail?: string;
  downloads: number;
  created_at: number;
}

export interface AkashicListResponse {
  patterns: AkashicListItem[];
  total: number;
  page: number;
}

export interface AkashicPatternDetail {
  id: string;
  name: string;
  data: AkashicPatternData;
  thumbnail?: string;
}
