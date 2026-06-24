import type {
  AkashicListResponse,
  AkashicPatternData,
  AkashicPatternDetail,
} from '@/lib/akashicTypes';

const DEVICE_ID_KEY = 'arcane_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
}

export async function fetchAkashicList(params: {
  sort: 'new' | 'popular';
  page?: number;
  limit?: number;
}): Promise<AkashicListResponse | null> {
  try {
    const query = new URLSearchParams({
      sort: params.sort,
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
    });
    const res = await fetch(`/api/akashic/list?${query}`);
    if (!res.ok) return null;
    return (await res.json()) as AkashicListResponse;
  } catch {
    return null;
  }
}

export async function publishToAkashic(params: {
  name: string;
  data: AkashicPatternData;
  thumbnail?: string;
}): Promise<string | null> {
  try {
    const res = await fetch('/api/akashic/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        data: params.data,
        thumbnail: params.thumbnail,
        authorId: getOrCreateDeviceId(),
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch {
    return null;
  }
}

export async function downloadFromAkashic(id: string): Promise<AkashicPatternDetail | null> {
  try {
    const res = await fetch(`/api/akashic/${encodeURIComponent(id)}/download`, {
      method: 'POST',
    });
    if (!res.ok) return null;
    return (await res.json()) as AkashicPatternDetail;
  } catch {
    return null;
  }
}
