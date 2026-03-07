import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';

function resolveUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) return null;
  return `https://${host}${url}`;
}

/**
 * Returns:
 *   undefined  → still loading (API not yet returned)
 *   null       → loaded, no logo URL configured
 *   string     → loaded, this is the logo URL
 */
export function useLogoUrl(forceDark?: boolean): string | null | undefined {
  const { isDark } = useTheme();

  const { data: homepage, isFetched } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => api.getHomepage(),
    staleTime: 1000 * 30,
  });

  if (!isFetched) return undefined;

  const rawLogoUrl = homepage?.settings?.logoUrl;
  const rawLogoDarkUrl = homepage?.settings?.logoDarkUrl;

  const effectiveDark = forceDark !== undefined ? forceDark : isDark;
  const activeLogoUrl = effectiveDark ? (rawLogoDarkUrl || rawLogoUrl) : rawLogoUrl;
  return resolveUrl(activeLogoUrl);
}
