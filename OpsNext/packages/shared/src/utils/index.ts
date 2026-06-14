export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normaliseDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^www\./, '').toLowerCase().trim();
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';
  const masked = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
  return `${masked}@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, '*');
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function paginate<T>(
  items: T[],
  pageSize: number,
): { data: T[]; hasMore: boolean } {
  return {
    data: items.slice(0, pageSize),
    hasMore: items.length > pageSize,
  };
}

export function generateOpaqueToken(bytes = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      result[key as keyof T] =
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? deepMerge(
              (base[key as keyof T] as Record<string, unknown>) ?? {},
              value as Record<string, unknown>,
            ) as T[keyof T]
          : value as T[keyof T];
    }
  }
  return result;
}
