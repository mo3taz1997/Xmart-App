const { getDefaultConfig } = require("expo/metro-config");
const { createProxyMiddleware } = require("http-proxy-middleware");

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  blockList: [
    /\.local\/.*/,
    /\.git\/.*/,
    /server_dist\/.*/,
  ],
};

config.watcher = {
  ...config.watcher,
  additionalExts: config.watcher?.additionalExts || [],
  watchman: {
    ...(config.watcher?.watchman || {}),
    deferStates: ["hg.update"],
  },
  healthCheck: {
    ...(config.watcher?.healthCheck || {}),
    enabled: false,
  },
};

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url === "/admin" || req.url.startsWith("/admin?") || req.url.startsWith("/api/admin")) {
        const proxy = createProxyMiddleware({
          target: "http://localhost:5000",
          changeOrigin: true,
        });
        return proxy(req, res, next);
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
