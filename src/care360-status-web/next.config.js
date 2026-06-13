// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export only when explicitly requested (Azure SWA production builds).
  // Vercel deployments leave NEXT_EXPORT unset so API routes work normally.
  output: process.env.NEXT_EXPORT === '1' ? 'export' : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
