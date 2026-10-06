/** @type {import('next').NextConfig} */
const nextConfig = {
  /** @type {import('next').NextConfig} */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  reactCompiler: true,
};

export default nextConfig;
