const config = {
  // Local builds use next start; container builds ship the standalone server.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // Explicit public compatibility keys; never expose the entire environment.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || '/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || process.env.REACT_APP_WS_URL || '',
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || process.env.REACT_APP_PLAUSIBLE_DOMAIN || '',
    NEXT_PUBLIC_PLAUSIBLE_HOST: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || process.env.REACT_APP_PLAUSIBLE_HOST || '',
  },
  async rewrites() {
    const backend = process.env.NEXT_BACKEND_URL || 'http://127.0.0.1:8000';
    return { beforeFiles: ['/api/:path*', '/media/:path*', '/backend/:path*', '/static/:path*', '/ws/:path*'].map(source => ({
      source, destination: `${backend}${source}`,
    })) };
  },
};
export default config;
