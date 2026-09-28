import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The Instagram reel frames are only 335px wide, so the optimizer's
    // default quality of 75 re-encodes an already-lossy file and the loss
    // shows at that size. 90 is allowed alongside it for those.
    qualities: [75, 90],

    // next/image refuses any external host that isn't listed here, so without
    // this a product photo uploaded to Cloudinary throws instead of rendering.
    // Cloudinary already resizes and compresses on its own CDN, so the images
    // are passed through unoptimized rather than paying for the same work twice
    // out of the host's image-optimization quota.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
