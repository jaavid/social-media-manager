const config = {
  // Django API/WS paths require their trailing slash, including Upgrade requests.
  skipTrailingSlashRedirect: true,
  // Local builds use next start; container builds ship the standalone server.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // Explicit public compatibility keys; never expose the entire environment.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || '/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || process.env.REACT_APP_WS_URL || '',
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || process.env.REACT_APP_PLAUSIBLE_DOMAIN || '',
    NEXT_PUBLIC_PLAUSIBLE_HOST: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || process.env.REACT_APP_PLAUSIBLE_HOST || '',
  },
  async redirects() {
    return [
      { source: '/dashboard/analytics/dashboard', destination: '/dashboard', permanent: true },
      { source: '/dashboard/analytics/analytics', destination: '/dashboard/analytics', permanent: true },
      { source: '/dashboard/analytics/brand-voice/:path*', destination: '/dashboard/brand-voice/:path*', permanent: true },
      { source: '/dashboard/analytics/roi/:path*', destination: '/dashboard/roi/:path*', permanent: true },
      { source: '/dashboard/analytics/insights/:path*', destination: '/dashboard/insights/:path*', permanent: true },
      { source: '/dashboard/analytics/ai-audit/:path*', destination: '/dashboard/ai-audit/:path*', permanent: true },
      { source: '/dashboard/analytics/video/:path*', destination: '/dashboard/video/:path*', permanent: true },
      { source: '/dashboard/analytics/posts/:path*', destination: '/dashboard/posts/:path*', permanent: true },
      { source: '/dashboard/analytics/calendar/:path*', destination: '/dashboard/calendar/:path*', permanent: true },
      { source: '/dashboard/analytics/inbox/:path*', destination: '/dashboard/inbox/:path*', permanent: true },
      { source: '/dashboard/analytics/chat-history/:path*', destination: '/dashboard/chat-history/:path*', permanent: true },
      { source: '/dashboard/analytics/ai-studio/:path*', destination: '/dashboard/ai-studio/:path*', permanent: true },
      { source: '/dashboard/analytics/post-ideas/:path*', destination: '/dashboard/post-ideas/:path*', permanent: true },
      { source: '/dashboard/analytics/composer/:path*', destination: '/dashboard/composer/:path*', permanent: true },
      { source: '/dashboard/analytics/caption-writer/:path*', destination: '/dashboard/caption-writer/:path*', permanent: true },
      { source: '/dashboard/analytics/audit-log/:path*', destination: '/dashboard/audit-log/:path*', permanent: true },
      { source: '/dashboard/analytics/synclogs/:path*', destination: '/dashboard/synclogs/:path*', permanent: true },
      { source: '/dashboard/analytics/alerts/:path*', destination: '/dashboard/alerts/:path*', permanent: true },
      { source: '/dashboard/analytics/queues/:path*', destination: '/dashboard/queues/:path*', permanent: true },
      { source: '/dashboard/analytics/automations/:path*', destination: '/dashboard/automations/:path*', permanent: true },
      { source: '/dashboard/analytics/hashtags/:path*', destination: '/dashboard/hashtags/:path*', permanent: true },
      { source: '/dashboard/analytics/approvals/:path*', destination: '/dashboard/approvals/:path*', permanent: true },
      { source: '/dashboard/analytics/audience/:path*', destination: '/dashboard/audience/:path*', permanent: true },
      { source: '/dashboard/analytics/ai-usage/:path*', destination: '/dashboard/ai-usage/:path*', permanent: true },
      { source: '/dashboard/analytics/notifications/:path*', destination: '/dashboard/notifications/:path*', permanent: true },
      { source: '/dashboard/analytics/competitors/:path*', destination: '/dashboard/competitors/:path*', permanent: true },
      { source: '/dashboard/analytics/reports/:path*', destination: '/dashboard/reports/:path*', permanent: true },
      { source: '/dashboard/analytics/reviews/:path*', destination: '/dashboard/reviews/:path*', permanent: true },
      { source: '/dashboard/analytics/media/:path*', destination: '/dashboard/media/:path*', permanent: true },
    ];
  },
  async rewrites() {
    const backend = process.env.NEXT_BACKEND_URL || 'http://127.0.0.1:8000';
    // Capture the complete suffix (including its slash). A :path* parameter
    // splits segments and drops the slash even with skipTrailingSlashRedirect.
    return { beforeFiles: ['/api/:path(.*)', '/media/:path(.*)', '/backend/:path(.*)', '/static/:path(.*)', '/ws/:path(.*)'].map(source => ({
      source, destination: `${backend}${source}`,
    })) };
  },
};
export default config;
