import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The catalogue PDF reads product photographs, the logo and the vendored
  // TTFs off disk at request time. Next traces them in today, but by accident
  // rather than by contract -- and the failure mode if a future version stops
  // is nasty: the build succeeds, the route still returns a valid PDF, and it
  // simply has no pictures and no branding in it. Declaring them makes it a
  // guarantee.
  outputFileTracingIncludes: {
    "/api/catalogue-pdf": [
      "./assets/fonts/*.ttf",
      "./public/img/brand/*",
      "./public/img/products/**",
      "./public/img/categories/**",
    ],
  },

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
