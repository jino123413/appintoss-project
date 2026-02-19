import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'pyeonhye',
  web: {
    host: '0.0.0.0',
    port: 8081,
    commands: {
      dev: 'rsbuild dev',
      build: 'rsbuild build',
    },
  },
  permissions: [],
  outdir: 'dist',
  brand: {
    displayName: '편혜',
    icon: 'https://raw.githubusercontent.com/jino123413/appintoss-project/main/pyeonhye/assets/logo/pyeonhye-logo-600.png',
    primaryColor: '#0EA5A4',
    bridgeColorMode: 'basic',
  },
  webViewProps: {
    type: 'partner',
  },
});

