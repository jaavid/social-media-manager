export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  const { readFile } = await import('node:fs/promises');
  // Rewrites are build-time configuration; the DAL reads the runtime environment.
  // Compare without logging destinations, which may contain infrastructure secrets.
  try {
    const manifest = JSON.parse(await readFile(`${process.cwd()}/.next/routes-manifest.json`, 'utf8')) as {
      rewrites: { beforeFiles: { source: string; destination: string }[] };
    };
    const destination = manifest.rewrites.beforeFiles.find(rule => rule.source === '/api/:path*')?.destination;
    const runtime = process.env.NEXT_BACKEND_URL || 'http://127.0.0.1:8000';
    if (destination && destination !== `${runtime}/api/:path*`) {
      console.error('NEXT_BACKEND_URL differs from the built API rewrite. Rebuild Next with the runtime destination.');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; // Build workers have no manifest yet.
    throw error;
  }
}
