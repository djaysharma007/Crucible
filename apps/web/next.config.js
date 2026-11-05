const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crucible/ui', '@crucible/shared', '@crucible/config'],
  async rewrites() {
    const rawTarget =
      process.env.API_PROXY_TARGET || process.env.API_URL || 'http://localhost:4000';
    // Normalize target: strip any trailing slash, /api/v1, or /api so path is never doubled
    const baseApi = rawTarget
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${baseApi}/api/v1/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${baseApi}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=(self)',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    try {
      const monacoRoot = path.dirname(path.dirname(path.dirname(require.resolve('monaco-editor'))));
      const editorApiPath = path.join(monacoRoot, 'esm/vs/editor/editor.api.js');

      config.resolve.alias = {
        ...config.resolve.alias,
        'monaco-editor/esm/vs/editor/editor.api.js': editorApiPath,
      };
    } catch {
      // In environments where monaco-editor resolution differs
    }
    return config;
  },
};

module.exports = nextConfig;
