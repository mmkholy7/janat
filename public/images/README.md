# Landscape Images

Landscape photographs downloaded from Unsplash and served locally so visits do not contact an image provider.

- mountains.jpg: https://images.unsplash.com/photo-1519681393784-d120267933ba
- forest.jpg: https://images.unsplash.com/photo-1448375240586-882707db888b
- lake.jpg: https://images.unsplash.com/photo-1470770841072-f978cf4d019e

Each photo also has a WebP version (`<name>.webp`, same size as the JPEG) and a small-screen WebP (`<name>-1080.webp`). Browsers that support WebP use those; others fall back to the JPEG. Regenerate them with `cwebp -q 76` and `cwebp -q 74 -resize 1080 0` when replacing a photo.

License: https://unsplash.com/license. Retain source information when replacing assets.