import { ScatterplotLayer, ScatterplotLayerProps } from '@deck.gl/layers';
import { DefaultProps } from '@deck.gl/core';
import { OverlayDomainSpot } from './useOverlayDomainData';

export interface DeckGLPieDatum extends OverlayDomainSpot {
  id: string;
  position: [number, number, number];
}

const MAX_SLICES = 12;



export interface DeckGLPieLayerProps extends Omit<ScatterplotLayerProps<DeckGLPieDatum>, 'getPosition'> {
  id: string;
  data: DeckGLPieDatum[];
  spotRadius: number;
  domainColorMap: Record<number, string>;
}

class PieScatterplotLayer extends ScatterplotLayer<DeckGLPieDatum, DeckGLPieLayerProps> {
  static componentName = 'PieScatterplotLayer';

  static defaultProps: DefaultProps = {
    ...ScatterplotLayer.defaultProps,
    radiusUnits: 'pixels',
    stroked: false,
    filled: true,
    pickable: true,
    getPosition: (d: DeckGLPieDatum) => d.position,
    getRadius: (props: Required<DeckGLPieLayerProps>) => props.spotRadius,
  };

  getShaders() {
    const shaders = super.getShaders();

    return {
      ...shaders,
      inject: {
        ...(shaders.inject ?? {}),
        'vs:#decl': `
in vec4 instanceDomains0;
in vec4 instanceDomains1;
in vec4 instanceDomains2;
in float instanceSliceCount;

out vec4 vDomains0;
out vec4 vDomains1;
out vec4 vDomains2;
out float vSliceCount;
`,
        'vs:#main-end': `
vDomains0 = instanceDomains0;
vDomains1 = instanceDomains1;
vDomains2 = instanceDomains2;
vSliceCount = instanceSliceCount;
`,
        'fs:#decl': `
in vec4 vDomains0;
in vec4 vDomains1;
in vec4 vDomains2;
in float vSliceCount;

// Hardcoded domain colors (matching useOverlayDomainData DOMAIN_PALETTE)
vec3 DOMAIN_COLORS[14] = vec3[](
  vec3(0.059, 0.463, 0.435),  // #0F766E - domain 0
  vec3(0.145, 0.388, 0.933),  // #2563EB - domain 1
  vec3(0.976, 0.451, 0.094),  // #F97316 - domain 2
  vec3(0.851, 0.149, 0.157),  // #DC2626 - domain 3
  vec3(0.024, 0.600, 0.412),  // #059669 - domain 4
  vec3(0.486, 0.227, 0.933),  // #7C3AED - domain 5
  vec3(0.792, 0.541, 0.016),  // #CA8A04 - domain 6
  vec3(0.859, 0.153, 0.467),  // #DB2777 - domain 7
  vec3(0.032, 0.569, 0.761),  // #0891B2 - domain 8
  vec3(0.396, 0.639, 0.051),  // #65A30D - domain 9
  vec3(0.706, 0.325, 0.035),  // #B45309 - domain 10
  vec3(0.263, 0.224, 0.792),  // #4338CA - domain 11
  vec3(0.114, 0.306, 0.847),  // #1D4ED8 - domain 12
  vec3(0.745, 0.071, 0.239)   // #BE123C - domain 13
);

float readDomain(float sliceIndex) {
  if (sliceIndex < 4.0) { return vDomains0[int(sliceIndex)]; }
  if (sliceIndex < 8.0) { return vDomains1[int(sliceIndex - 4.0)]; }
  return vDomains2[int(sliceIndex - 8.0)];
}
`,
        'fs:DECKGL_FILTER_COLOR': `
{
  vec2 uv = geometry.uv;
  float r = length(uv);

  if (r > 1.0) discard;

  float totalSlices = max(vSliceCount, 1.0);
  float theta = atan(uv.y, uv.x);
  if (theta < 0.0) theta += 6.2832;

  float sliceAngle = 6.2832 / totalSlices;
  float sliceIndex = clamp(floor(theta / sliceAngle), 0.0, totalSlices - 1.0);
  
  // Read domain ID from vertex attributes
  float domainFloat = readDomain(sliceIndex);
  int domainId = int(round(domainFloat));

  // Look up color by domain ID
  vec3 rgb;
  if (domainId >= 0 && domainId < 14) {
    rgb = DOMAIN_COLORS[domainId];
  } else if (domainId < 0) {
    // Unfilled slot (missing experiment)
    rgb = vec3(0.85, 0.85, 0.85);
  } else {
    // Out of bounds — fallback gray
    rgb = vec3(0.65, 0.65, 0.65);
  }

  float edgeAlpha = smoothstep(1.0, 0.92, r);
  color = vec4(rgb, edgeAlpha);

  color = picking_filterHighlightColor(color);
  color = picking_filterPickingColor(color);
}
`,
      },
    };
  }

  initializeState() {
    super.initializeState();

    const attributeManager = this.getAttributeManager();
    if (!attributeManager) {
      return;
    }

    attributeManager.addInstanced({
      instanceSliceCount: {
        size: 1,
        update: (attribute: any, params: any) => {
          const { data, startRow, endRow } = params;
          const value = attribute.value as Float32Array | number[];

          let row = 0;
          for (const spot of data as Iterable<DeckGLPieDatum>) {
            if (row >= startRow && row < endRow) {
              const offset = row - startRow;
              const sliceCount = Math.max(1, Math.min(spot.domainsInOrder.length, MAX_SLICES));
              value[offset] = sliceCount;
            }
            row += 1;
          }
        },
      },
      instanceDomains0: {
        size: 4,
        update: (attribute: any, params: any) => this.writeDomains(attribute.value, params, 0),
      },
      instanceDomains1: {
        size: 4,
        update: (attribute: any, params: any) => this.writeDomains(attribute.value, params, 4),
      },
      instanceDomains2: {
        size: 4,
        update: (attribute: any, params: any) => this.writeDomains(attribute.value, params, 8),
      },
    });
  }

  draw(params: { uniforms: Record<string, unknown> }) {
    super.draw(params);
  }

  private writeDomains(
    value: Float32Array | number[],
    params: any,
    startSlice: number,
  ) {
    const { data, startRow, endRow } = params;

    let row = 0;
    for (const spot of data as Iterable<DeckGLPieDatum>) {
      if (row >= startRow && row < endRow) {
        const baseOffset = (row - startRow) * 4;

        for (let i = 0; i < 4; i += 1) {
          const domain = spot.domainsInOrder[startSlice + i];
          value[baseOffset + i] = typeof domain === 'number' ? domain : -1;
        }
      }
      row += 1;
    }
  }
}

export default function createDeckGLPieLayer(props: DeckGLPieLayerProps) {
  return new PieScatterplotLayer({
    ...props,
    id: props.id,
    data: props.data,
    getPosition: (d: DeckGLPieDatum) => d.position,
    getRadius: props.spotRadius,
    radiusUnits: 'pixels',
    stroked: false,
    filled: true,
    pickable: true,
  });
}
