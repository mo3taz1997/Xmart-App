export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  try {
    if (!path) return '/';

    let pathname = path;
    let search = '';

    if (path.includes('://')) {
      try {
        const u = new URL(path);
        pathname = u.pathname || '/';
        search = u.search || '';
      } catch {
        const m = path.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/[^?#]*)?(\?[^#]*)?/i);
        if (m) {
          pathname = m[1] || '/';
          search = m[2] || '';
        }
      }
    } else {
      const qIdx = path.indexOf('?');
      if (qIdx >= 0) {
        pathname = path.slice(0, qIdx);
        search = path.slice(qIdx);
      }
    }

    const productMatch = pathname.match(/^\/p\/([^/?#]+)\/?$/i);
    if (productMatch) {
      const handle = decodeURIComponent(productMatch[1]);
      return `/product/${encodeURIComponent(handle)}${search}`;
    }

    if (/^\/product\/[^/?#]+/i.test(pathname)) {
      return `${pathname}${search}`;
    }

    if (/^\/(collection|brand|search|account|orders|notifications|addresses|checkout|cod-order)(\/|$)/i.test(pathname)) {
      return `${pathname}${search}`;
    }

    return '/';
  } catch (e) {
    console.log('[NativeIntent] redirect error:', e);
    return '/';
  }
}
