import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { ThreeTokens } from '../lib/theme';

interface Props {
  theme: ThreeTokens;
}

/**
 * Bloom-only postprocessing chain. Isolated into its own module so it can be
 * dynamically imported via `React.lazy()` and split out of the initial bundle
 * — `@react-three/postprocessing` + `postprocessing` are ~80 KB gzipped on
 * their own and aren't needed for first paint of the static geometry.
 */
export default function Postprocessing({ theme }: Props) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={theme.bloomIntensity}
        luminanceThreshold={theme.bloomThreshold}
        luminanceSmoothing={theme.bloomSmoothing}
        mipmapBlur
      />
    </EffectComposer>
  );
}
