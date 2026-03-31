type Listener = () => void;
const listeners: Record<string, Listener[]> = {};

export const tabEvents = {
  on(event: string, fn: Listener) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return () => {
      listeners[event] = listeners[event].filter(l => l !== fn);
    };
  },
  emit(event: string) {
    listeners[event]?.forEach(fn => fn());
  },
};

const scrollRefs: Record<string, React.RefObject<any>> = {};

export const scrollRegistry = {
  register(tabName: string, ref: React.RefObject<any>) {
    scrollRefs[tabName] = ref;
  },
  unregister(tabName: string) {
    delete scrollRefs[tabName];
  },
  scrollToTop(tabName: string) {
    const ref = scrollRefs[tabName];
    if (!ref?.current) return false;
    const node = ref.current;
    if (node.scrollTo) {
      node.scrollTo({ x: 0, y: 0, animated: true });
      return true;
    }
    if (node.scrollToOffset) {
      node.scrollToOffset({ offset: 0, animated: true });
      return true;
    }
    return false;
  },
};
