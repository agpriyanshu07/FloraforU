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

    // Why these three settings exist, together:
    //
    // The catalogue holds 920 product photographs, and every one of them was
    // being put through the image optimizer with the stock width ladder --
    // 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048 and 3840. Ten widths per
    // photo, from sources whose median width is 577px, so the top of that
    // ladder was asking for upscales of pictures that do not have the pixels.
    // Worse, the plain `src` that non-srcset consumers use (crawlers, link
    // previews, anything parsing the HTML rather than picking from a srcset)
    // was pinned at w=3840 -- a guaranteed 3840px request for all 920.
    //
    // On top of that, the default minimumCacheTTL is four hours. An optimized
    // variant is not transformed once; it expires and is transformed AGAIN on
    // the next request after it, six times a day, for every variant of every
    // photo, for as long as anyone browses. Image transformations are metered
    // by the host, and a finite monthly allowance spent that way runs out --
    // at which point /_next/image stops serving and photographs vanish from
    // the site until the meter resets. That is the "sometimes the photos don't
    // render" this fixes, and it is why re-importing the CSV never changed
    // anything: nothing was ever wrong with the data.
    //
    // The widths below are what the site actually renders. The widest slot on
    // any page is the 1160px offer banner; product cards are 280px, the
    // product gallery 520px, category cards 380px. Nothing needs 1920 and up.
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],

    // 31 days instead of 4 hours. These files are committed to the repository
    // and can only change in a deploy, so there is nothing to revalidate
    // against in between. The one trap: replacing a photo while keeping its
    // filename leaves the old one cached until this expires -- give a replaced
    // photo a new filename and it appears immediately.
    minimumCacheTTL: 2678400,

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
