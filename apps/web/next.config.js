const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crucible/ui', '@crucible/shared', '@crucible/config'],
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
