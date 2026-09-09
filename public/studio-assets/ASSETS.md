# Studio material assets

Downloaded unchanged from Poly Haven on 2026-09-08 and 2026-09-09. The **twelve source files total 9,709,544 bytes (9.26 MiB)**: the original nine files (6,294,967 bytes) plus three walnut-veneer maps (3,414,577 bytes). There are eleven JPG maps and one 1K Radiance HDR. The veneer diffuse is 2K; the remaining JPGs are 1K. This inventory excludes the soundtrack and generated runtime textures.

The twelve material and lighting assets listed below are **CC0 1.0 / public domain**. This license statement does not cover the soundtrack in `audio/`. Poly Haven permits commercial use, modification and redistribution without required attribution. These files remain free CC0 assets; their authorship is credited below. See the [official asset license](https://polyhaven.com/license) and [CC0 1.0 summary](https://creativecommons.org/publicdomain/zero/1.0/). Metadata and checksum verification used the [official public API](https://polyhaven.com/our-api). The added veneer's dimensions, acquisition checks and SHA-256 hashes are recorded in [wood-veneer/SOURCE.md](wood-veneer/SOURCE.md).

| Material | Author | Source | Local files |
| --- | --- | --- | --- |
| Wood Floor | Dimitrios Savva | [Asset page](https://polyhaven.com/a/wood_floor) | `wood_floor_diff_1k.jpg`, `wood_floor_nor_gl_1k.jpg`, `wood_floor_rough_1k.jpg` |
| Black Walnut Veneer 02 | Jenelle van Heerden (asset page; API credit: `All`) | [Asset page](https://polyhaven.com/a/black_walnut_veneer_02) | `wood-veneer/black_walnut_veneer_02_diff_2k.jpg`, `wood-veneer/black_walnut_veneer_02_nor_gl_1k.jpg`, `wood-veneer/black_walnut_veneer_02_rough_1k.jpg` |
| Plastered Wall 02 | Charlotte Baglioni | [Asset page](https://polyhaven.com/a/plastered_wall_02) | `plastered_wall_02_diff_1k.jpg`, `plastered_wall_02_nor_gl_1k.jpg`, `plastered_wall_02_rough_1k.jpg` |
| Bi Stretch | colormass (photography), Rico Cilliers (processing) | [Asset page](https://polyhaven.com/a/bi_stretch) | `bi_stretch_nor_gl_1k.jpg`, `bi_stretch_rough_1k.jpg` |
| Studio Small 01 | Greg Zaal | [Asset page](https://polyhaven.com/a/studio_small_01) | `studio_small_01_1k.hdr` |

## Direct downloads and verified checksums

Every downloaded file matched the MD5 supplied by Poly Haven's asset metadata.

| File / source download | Bytes | MD5 |
| --- | ---: | --- |
| [wood_floor_diff_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_floor/wood_floor_diff_1k.jpg) | 734493 | `b7e927d2bf2f8f103820ff3890c8407c` |
| [wood_floor_nor_gl_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_floor/wood_floor_nor_gl_1k.jpg) | 423303 | `620f174d2c09b579c5d02d37b2106668` |
| [wood_floor_rough_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_floor/wood_floor_rough_1k.jpg) | 527754 | `36146634f1dbd1bc30cd071857584c10` |
| [plastered_wall_02_diff_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plastered_wall_02/plastered_wall_02_diff_1k.jpg) | 436395 | `3ca0d02e87ad5c6eb21efa4b05b7748e` |
| [plastered_wall_02_nor_gl_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plastered_wall_02/plastered_wall_02_nor_gl_1k.jpg) | 960241 | `5419137dd937f95a849b884258fb8bb5` |
| [plastered_wall_02_rough_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plastered_wall_02/plastered_wall_02_rough_1k.jpg) | 173930 | `2d4a4a40491eb5a115c086bb65aba32c` |
| [bi_stretch_nor_gl_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/bi_stretch/bi_stretch_nor_gl_1k.jpg) | 640580 | `4fb717e22bfa4d926b8aa7e85f77acda` |
| [bi_stretch_rough_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/bi_stretch/bi_stretch_rough_1k.jpg) | 696831 | `8ffcba9c038d97597cc3b35e68043f62` |
| [studio_small_01_1k.hdr](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_01_1k.hdr) | 1701440 | `d53167ca2993398293869a3a0a88910b` |
| [wood-veneer/black_walnut_veneer_02_diff_2k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/black_walnut_veneer_02/black_walnut_veneer_02_diff_2k.jpg) | 2365710 | `e4ef13d171747d6c877bec563b67d389` |
| [wood-veneer/black_walnut_veneer_02_nor_gl_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/black_walnut_veneer_02/black_walnut_veneer_02_nor_gl_1k.jpg) | 401633 | `c0c6e98576374b8aae8d2a270de7725f` |
| [wood-veneer/black_walnut_veneer_02_rough_1k.jpg](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/black_walnut_veneer_02/black_walnut_veneer_02_rough_1k.jpg) | 647234 | `f538862668397a49212484812b1a0653` |

## Material integration notes

- Wood Floor is photographed oak, with a 1.7m × 1.7m physical tile. It is assigned only to the named `Studio floor` mesh. Furniture and door panels use the separate veneer maps, preserving continuous grain without floorboard joins.
- Black Walnut Veneer 02 covers 1m × 1m. Its 2K diffuse supplies visible furniture grain, paired with 1K normal and roughness maps. Warm material multipliers, subtle normals and restrained clearcoat provide finished satin wood. The source image's horizontal grain is aligned along each box face's longer direction.
- Plaster covers approximately 2.23 m square. Use a warm grey material multiplier and restrained normal strength so detail appears under grazing light.
- Bi Stretch has a fine woven surface covering approximately 0.265 m square. Only normal and roughness maps are included so acoustic panels can use a plain charcoal, olive or burgundy material color without a noisy pattern. It can also add subtle weave to speaker grilles and chair upholstery.
- Diffuse maps use `SRGBColorSpace`; normal and roughness maps remain data textures. All normals use OpenGL convention. Matched maps share wrapping and UV transforms. The local `studio-geometry.ts` rounded-box helper creates stable one-metre UV charts before batching. `studio-surfaces.ts` applies material tile scale and grain orientation only to intact box-face groups; custom surfaces and merged geometry retain authored UVs. Texture anisotropy is capped at 8.
- The HDR is loaded through `RGBELoader` and `PMREMGenerator` for restrained environmental fill and fallback reflections. It is never a room background. Desktop additionally captures the furnished room once at 128px per cubemap face and filters that capture through PMREM for reflective wood, metals and glazing. This generated map is not a downloaded asset and is not refreshed per frame; mobile and failed captures retain HDR reflections.
- The procedural night-sky gradient is a small runtime canvas texture. Distant facades, window apertures, glazing, continuous curtains and lamp hardware are geometry. Their generated textures follow scene disposal and do not change this downloaded-source inventory.
