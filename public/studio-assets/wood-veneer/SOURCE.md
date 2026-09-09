# Black Walnut Veneer 02

Downloaded unchanged from Poly Haven on 2026-09-09 for the studio's furniture and door. These three files total **3,414,577 bytes (3.256 MiB)**. The diffuse map uses the 2K JPG variant for visible grain; the subtler normal and roughness maps use 1K JPG variants to keep transfer size below 5 MB.

- **Official asset:** [Black Walnut Veneer 02](https://polyhaven.com/a/black_walnut_veneer_02)
- **Asset ID:** `black_walnut_veneer_02`
- **Author:** Jenelle van Heerden; API author credit is `All`.
- **License:** [Poly Haven CC0 asset license](https://polyhaven.com/license), [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Commercial use, modification, and redistribution are permitted; attribution is appreciated but not required.
- **Official metadata:** [Asset information](https://api.polyhaven.com/info/black_walnut_veneer_02), [file variants and MD5 checksums](https://api.polyhaven.com/files/black_walnut_veneer_02).
- **Physical coverage:** 1 m × 1 m. The asset page reports 1 m width; API `dimensions` is `[1000, 1000]` and `max_resolution` is `[8192, 8192]`.
- **Provider category:** Wood / Veneer / Walnut Veneer. API attributes identify an object surface, man-made, clean. The downloaded diffuse shows continuous horizontal walnut grain without flooring board joins.
- **Metadata revision:** API `files_hash` was `32ab1e934a1c79adc646650aae9cf9636363b19e`; `date_published` was `1786448942` (2026-08-11). The official page records its CC0 vault release on August 11, 2026.

## Files and verification

Every downloaded file matched both the exact byte count and MD5 supplied by the official file API. JPEG dimensions were read locally; all three maps were visually inspected. No crop, recoloring, recompression, or synthetic content was applied.

| Local file / official download | Dimensions | Bytes | Provider and local MD5 |
| --- | --- | ---: | --- |
| [black_walnut_veneer_02_diff_2k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/black_walnut_veneer_02/black_walnut_veneer_02_diff_2k.jpg) | 2048 × 2048 | 2365710 | `e4ef13d171747d6c877bec563b67d389` |
| [black_walnut_veneer_02_nor_gl_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/black_walnut_veneer_02/black_walnut_veneer_02_nor_gl_1k.jpg) | 1024 × 1024 | 401633 | `c0c6e98576374b8aae8d2a270de7725f` |
| [black_walnut_veneer_02_rough_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/black_walnut_veneer_02/black_walnut_veneer_02_rough_1k.jpg) | 1024 × 1024 | 647234 | `f538862668397a49212484812b1a0653` |

Locally computed SHA-256:

```text
ac4cd64753a55684efe4ccaf6f81b465e237a8a885fffb95377cc371924c0f88  black_walnut_veneer_02_diff_2k.jpg
34c8eb00bfbe8fcac0535f20c0150165be0212bb08715e9f556aec9f34795e1e  black_walnut_veneer_02_nor_gl_1k.jpg
ca3ee4961085c842250600b1a13978f2537d3410f00f1ff44e8523c419422fb6  black_walnut_veneer_02_rough_1k.jpg
```

## Integration guidance

These are application suggestions, separate from provider metadata:

- Use the diffuse as an sRGB color texture. Keep the OpenGL normal and roughness maps in `NoColorSpace`; all three maps must share UV transforms and wrapping.
- Start with one tile per real meter in both surface directions. Box faces need UVs scaled to their physical dimensions; a single normalized tile on every differently sized face stretches the grain.
- Grain runs horizontally in the source image. Align it along the long direction of a desk, and rotate the matched map set for vertical door grain. Preserve a consistent orientation between related panels and edge strips.
- For grazing tabletop views, use anisotropy `Math.min(renderer.capabilities.getMaxAnisotropy(), 8)` with standard mipmaps and repeat wrapping. A cap of 4 is a reasonable smaller-device fallback.
- Start from a white or restrained warm-neutral material multiplier so the photographed grain remains legible. The old dark-brown multiplier used to disguise oak floorboards can crush this texture's detail. Choose the final stain under the room lighting.
- Keep normal strength subtle for finished veneer (approximately 0.15–0.25 as an initial normal scale). Begin with a roughness multiplier around 0.85–0.95; the map supplies local satin variation. No displacement geometry is needed for this smooth surface.

The existing floor assets and main asset documentation were not modified by this acquisition.
