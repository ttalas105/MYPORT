import * as THREE from 'three';
import type { StudioMaterials } from './studio-furniture';

type TubePoint = readonly [number, number];
type NeonGlyph = { width: number; strokes: readonly (readonly TubePoint[])[] };
type AnimatedNeonLetter = {
    group: THREE.Group;
    restPosition: THREE.Vector3;
    core: THREE.MeshBasicMaterial;
    glass: THREE.MeshStandardMaterial;
    bloom: THREE.MeshBasicMaterial;
};

export interface StudioNeon {
    group: THREE.Group;
    aboutSign: THREE.Mesh;
    /** Seek-safe one-shot progress. Both 0 and 1 restore the exact resting appearance. */
    animateActivation(progress: number): void;
}

/** A physical invitation at the threshold. Interaction is supplied by the HTML layer. */
export function buildAboutNeon(m: StudioMaterials): StudioNeon {
    const group = new THREE.Group();
    group.name = 'CLICK ME — exterior neon';
    group.position.set(1.78, 1.95, 4.36);

    const core = new THREE.MeshBasicMaterial({ color: 0xffeedb, toneMapped: false });
    const glass = new THREE.MeshStandardMaterial({
        color: 0xff8c91, emissive: 0xff657d, emissiveIntensity: 1.7,
        roughness: .24, metalness: .05, transparent: true, opacity: .46,
        depthWrite: false, toneMapped: false,
    });
    const bloom = new THREE.MeshBasicMaterial({
        color: 0xff657d, transparent: true, opacity: .095,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const letters: AnimatedNeonLetter[] = [];
    const wallLights: THREE.PointLight[] = [];
    const restCoreColor = core.color.clone();
    const restGlassColor = glass.color.clone();
    const restEmissiveColor = glass.emissive.clone();
    const restBloomColor = bloom.color.clone();
    const hotCoreColor = new THREE.Color(0xffffff);
    const hotGlassColor = new THREE.Color(0xffdec4);
    const hotEmissiveColor = new THREE.Color(0xffc09d);
    const hotBloomColor = new THREE.Color(0xffb08c);
    const restLightColor = new THREE.Color(0xff6d82);
    const hotLightColor = new THREE.Color(0xffbf9b);
    const ceramic = new THREE.MeshStandardMaterial({ color: 0x9e8580, roughness: .54 });

    function fixture(x: number, y: number, z: number, radius: number, depth: number, material: THREE.Material) {
        const mount = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 12), material);
        mount.rotation.x = Math.PI / 2;
        mount.position.set(x, y, z);
        mount.castShadow = true;
        group.add(mount);
    }

    const glyphs: Record<string, NeonGlyph> = {
        C: { width: .24, strokes: [[
            [.235, .292], [.207, .327], [.074, .334], [.026, .307],
            [.006, .25], [.006, .091], [.025, .038], [.069, .006], [.20, .008], [.238, .042],
        ]] },
        L: { width: .20, strokes: [[
            [.007, .334], [.007, .079], [.011, .035], [.040, .006], [.196, .006],
        ]] },
        I: { width: .01, strokes: [[[.005, .334], [.005, .006]]] },
        K: { width: .25, strokes: [
            [[.005, .334], [.005, .006]],
            [[.242, .329], [.072, .196], [.034, .17], [.074, .139], [.247, .006]],
        ] },
        M: { width: .32, strokes: [[
            [.005, .005], [.005, .294], [.018, .33], [.044, .307],
            [.158, .14], [.277, .308], [.307, .33], [.316, .294], [.316, .005],
        ]] },
        E: { width: .23, strokes: [
            [[.226, .33], [.062, .33], [.013, .307], [.005, .263], [.005, .070], [.012, .032], [.047, .006], [.227, .006]],
            [[.012, .167], [.195, .167]],
        ] },
    };

    function row(text: string, baseline: number, spacing: number) {
        const width = [...text].reduce((total, letter) => total + glyphs[letter].width, 0) + (text.length - 1) * spacing;
        let x = -width / 2;
        for (const letter of text) {
            const glyph = glyphs[letter];
            const glyphPoints = glyph.strokes.flat();
            const centerX = (Math.min(...glyphPoints.map(point => point[0])) + Math.max(...glyphPoints.map(point => point[0]))) / 2;
            const centerY = (Math.min(...glyphPoints.map(point => point[1])) + Math.max(...glyphPoints.map(point => point[1]))) / 2;
            const letterGroup = new THREE.Group();
            letterGroup.name = `Neon letter ${letters.length + 1} — ${letter}`;
            letterGroup.position.set(x + centerX, baseline + centerY, .006);
            group.add(letterGroup);
            // Each letter owns its color state, while every material remains attached for disposal.
            const letterCore = letters.length ? core.clone() : core;
            const letterGlass = letters.length ? glass.clone() : glass;
            const letterBloom = letters.length ? bloom.clone() : bloom;
            letters.push({ group: letterGroup, restPosition: letterGroup.position.clone(), core: letterCore, glass: letterGlass, bloom: letterBloom });
            for (const stroke of glyph.strokes) {
                const points = stroke.map(([px, py]) => new THREE.Vector3(px - centerX, py - centerY, 0));
                const path = new THREE.CatmullRomCurve3(points, false, 'centripetal');
                // Different radii preserve a hot center, glass envelope and a narrow optical fringe.
                const hotTube = new THREE.Mesh(new THREE.TubeGeometry(path, 72, .0058, 8, false), letterCore);
                const glassTube = new THREE.Mesh(new THREE.TubeGeometry(path, 72, .0095, 10, false), letterGlass);
                const fringe = new THREE.Mesh(new THREE.TubeGeometry(path, 72, .016, 6, false), letterBloom);
                hotTube.renderOrder = 1;
                glassTube.renderOrder = 2;
                fringe.renderOrder = 3;
                letterGroup.add(hotTube, glassTube, fringe);

                for (const at of [.18, .76]) {
                    const point = path.getPointAt(at);
                    // Slim ceramic stand-offs attach each tube directly to the plaster.
                    fixture(point.x + letterGroup.position.x, point.y + letterGroup.position.y, -.033, .0055, .064, ceramic);
                }
                // Electrode feeds enter the wall directly behind each tube end.
                for (const end of [points[0], points[points.length - 1]]) {
                    const endX = end.x + letterGroup.position.x;
                    const endY = end.y + letterGroup.position.y;
                    fixture(endX, endY, -.030, .0033, .072, m.rubber);
                }
            }
            x += glyph.width + spacing;
        }
    }
    row('CLICK', .13, .07);
    row('ME', -.40, .10);

    // Real lights tint the nearby plaster; there is no floating glow plane or screen backdrop.
    for (const [x, y] of [[-.40, .26], [.40, .26], [0, -.22]]) {
        const light = new THREE.PointLight(0xff6d82, .10, 1.15, 2);
        light.position.set(x, y, -.014);
        group.add(light);
        wallLights.push(light);
    }

    const aboutSign = new THREE.Mesh(new THREE.PlaneGeometry(1.60, 1.15), new THREE.MeshBasicMaterial({
        transparent: true, opacity: 0, colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
    }));
    aboutSign.name = 'CLICK ME — about Thomas interaction bounds';
    aboutSign.position.set(0, 0, .025);
    // Retain geometric bounds for the HTML button, but exclude this helper from
    // every render pass, including depth/normal overrides used for occlusion.
    aboutSign.visible = false;
    group.add(aboutSign);

    function animateActivation(progress: number): void {
        const p = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
        const resting = p === 0 || p === 1;
        const energy: number[] = [];
        letters.forEach((letter, index) => {
            // Seven staggered pulses finish at 98% of the caller's one-shot duration.
            const t = resting ? 0 : THREE.MathUtils.clamp((p - index * .065) / .59, 0, 1);
            const active = t > 0 && t < 1;
            const surge = active
                ? THREE.MathUtils.smoothstep(t, 0, .18) * (1 - THREE.MathUtils.smoothstep(t, .18, 1))
                : 0;
            const spring = active ? Math.sin(t * Math.PI * 4) * Math.exp(-3 * t) * Math.sin(t * Math.PI) : 0;
            energy.push(surge);
            letter.group.position.copy(letter.restPosition);
            letter.group.rotation.set(0, 0, 0);
            letter.group.scale.setScalar(1);
            if (active) {
                letter.group.position.y += .073 * surge + .026 * spring;
                letter.group.position.z += .055 * surge;
                letter.group.rotation.x = -.13 * surge;
                letter.group.rotation.z = (index % 2 ? 1 : -1) * (.12 * surge + .040 * spring);
                letter.group.scale.setScalar(1 + .075 * surge + .015 * spring);
            }
            letter.core.color.copy(restCoreColor).lerp(hotCoreColor, surge);
            letter.glass.color.copy(restGlassColor).lerp(hotGlassColor, surge);
            letter.glass.emissive.copy(restEmissiveColor).lerp(hotEmissiveColor, surge);
            letter.glass.emissiveIntensity = 1.7 + 3.2 * surge;
            letter.bloom.color.copy(restBloomColor).lerp(hotBloomColor, surge);
            letter.bloom.opacity = .095 + .15 * surge;
        });
        const lightLetters = [[0, 1, 2], [3, 4], [5, 6]];
        wallLights.forEach((light, index) => {
            const surge = Math.max(...lightLetters[index].map(letter => energy[letter]));
            light.color.copy(restLightColor).lerp(hotLightColor, surge);
            light.intensity = .10 + .22 * surge;
        });
    }

    return { group, aboutSign, animateActivation };
}
