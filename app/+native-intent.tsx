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
        const isHttp = u.protocol === 'http:' || u.protocol === 'https:';
        if (isHttp) {
          pathname = u.pathname || '/';
        } else {
          pathname = `/${u.host}${u.pathname || ''}`.replace(/\/+$/, '') || '/';
        }
        search = u.search || '';
      } catch {
        const m = path.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)(\/[^?#]*)?(\?[^#]*)?/i);
        if (m) {
          const isHttp = /^https?:/i.test(path);
          pathname = isHttp ? (m[2] || '/') : `/${m[1]}${m[2] || ''}`.replace(/\/+$/, '') || '/';
          search = m[3] || '';
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
