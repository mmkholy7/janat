# Power of Fasting Photos

Photos for the "power of fasting" cards. They are served locally so visits do not contact an image provider. All are CC0 (public domain).

- `reward-*.webp`: central dome of Çamlıca Mosque, Istanbul. WordPress Photo Directory, https://wordpress.org/photos/photo/5786893fba/ (CC0).
- `dua-*.webp`: the Prophet's Mosque, Madinah, at sunset. WordPress Photo Directory, https://wordpress.org/photos/photo/5146890aa2/ (CC0).
- `dates-*.webp`: ripe dates on the palm. Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Ripe_and_dry_dates_fruit_bunches.jpg (CC0).

Each photo is cropped to 3:4 and saved at two widths: `-1080.webp` (1080×1440) and `-640.webp` (640×853). Regenerate them with `cwebp -q 78 -m 6 -sharp_yuv -crop x y w h -resize 1080 1440` (and `-resize 640 853`). cwebp strips the camera metadata.
