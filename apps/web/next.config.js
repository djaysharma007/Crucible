const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  transpilePackages: ['@crucible/ui', '@crucible/shared', '@crucible/config'],
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
      const monacoRoot = path.dirname(
        path.dirname(path.dirname(require.resolve('monaco-editor'))),
      );
      const editorApiPath = path.join(
        monacoRoot,
        'esm/vs/editor/editor.api.js',
      );

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
