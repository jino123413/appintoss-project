import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'today-quote',
  web: {
    host: '0.0.0.0',
    port: 3012,
    commands: {
      dev: 'rsbuild dev',
      build: 'rsbuild build',
    },
  },
  permissions: [],
  outdir: 'dist',
  brand: {
    displayName: '오늘의 명대사',
    icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/today-quote.png',
    primaryColor: '#2F6B62',
    bridgeColorMode: 'basic',
  },
  webViewProps: {
    type: 'partner',
  },
});
