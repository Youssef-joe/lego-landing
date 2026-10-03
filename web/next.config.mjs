/** @type {import('next').NextConfig} */
const BUILDER_URL = (process.env.NEXT_PUBLIC_BUILDER_URL ?? 'https://builder.bricowerx.com').replace(/\/$/, '');

const nextConfig = {
  async redirects() {
    // The Builder app moved to its own server; old links keep working.
    return [{ source: '/builder/app/:path*', destination: `${BUILDER_URL}/builder`, permanent: false }];
  },
};

export default nextConfig;
