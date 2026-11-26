import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Images here are admin thumbnails, full-size lightbox photos, runtime uploads
      // and generated QR codes, where next/image adds nothing. Use next/image for
      // new public page imagery.
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
