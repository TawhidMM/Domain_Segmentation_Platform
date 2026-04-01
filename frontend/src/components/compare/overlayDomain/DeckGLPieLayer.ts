import { ScatterplotLayer, ScatterplotLayerProps } from '@deck.gl/layers';
import { DefaultProps, Layer} from '@deck.gl/core';
import { OverlayDomainSpot } from './useOverlayDomainData';
import { buildPalette, MAX_SLICES } from './PieLayerUtils';
import { PIE_LAYER_SHADER_INJECT } from './PieLayerShader';

export interface DeckGLPieDatum extends OverlayDomainSpot {
  id: string;
  position: [number, number, number];
}

export interface DeckGLPieLayerProps extends Omit<ScatterplotLayerProps<DeckGLPieDatum>, 'getPosition'> {
  id: string;
  data: DeckGLPieDatum[];
  spotRadius: number;
  domainColorMap: Record<number, string>;
}

class PieScatterplotLayer extends ScatterplotLayer<DeckGLPieDatum, DeckGLPieLayerProps> {
  static componentName = 'PieScatterplotLayer';

  private palette: Float32Array = buildPalette({});

  static defaultProps: DefaultProps = {
    ...ScatterplotLayer.defaultProps,
    radiusUnits: 'meters',
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
        ...PIE_LAYER_SHADER_INJECT,
      },
    };
  }

  updateState({ props, oldProps, changeFlags }: any) {
    super.updateState({ props, oldProps, changeFlags });

    if (changeFlags.propsChanged || props.domainColorMap !== oldProps?.domainColorMap) {
      this.palette = buildPalette(props.domainColorMap ?? {});
      
      (this as Layer).setNeedsRedraw();
    }
  }

  initializeState() {
    super.initializeState();

    const attributeManager = (this as any).getAttributeManager?.();
    if (!attributeManager) {
      return;
    }

    attributeManager.addInstanced({
      instanceSliceCount: {
        size: 1,
        update: (attribute: any, params: any) => {
          const { data, startRow, endRow } = params;
          const value = attribute.value as Float32Array;

          let i = 0;
          for (const spot of data) {
            if (i >= startRow && i < endRow) {
              const offset = i - startRow;
              value[offset] = Math.max(0, Math.min(spot?.sliceCount || 0, MAX_SLICES));
            }
            i++;
            if (i >= endRow) break;
          }
        },
      },
      instanceDomains0: { size: 4, update: (attr: any, p: any) => this.updateDomainAttrs(attr, p, 0) },
      instanceDomains1: { size: 4, update: (attr: any, p: any) => this.updateDomainAttrs(attr, p, 4) },
      instanceDomains2: { size: 4, update: (attr: any, p: any) => this.updateDomainAttrs(attr, p, 8) },
      instanceDomains3: { size: 4, update: (attr: any, p: any) => this.updateDomainAttrs(attr, p, 12) },
    });
  }

  private updateDomainAttrs(attribute: any, params: any, startIdx: number) {
    const { data, startRow, endRow } = params;
    const value = attribute.value as Float32Array;

    let i = 0;
    for (const spot of data) {
      if (i >= startRow && i < endRow) {
        const offset = (i - startRow) * 4;
        const domains = spot?.domainsInOrder || [];

        for (let j = 0; j < 4; j++) {
          const d = domains[startIdx + j];
          value[offset + j] = (d !== undefined && d !== null) ? d : -1;
        }
      }
      i++;
      if (i >= endRow) break;
    }
  }

  draw(params: { uniforms: Record<string, unknown> }) {
    params.uniforms = {
      ...params.uniforms,
      uPalette: this.palette,
    };

    super.draw(params);
  }
}

export default function createDeckGLPieLayer(props: DeckGLPieLayerProps) {
  const layer = new (PieScatterplotLayer as any)({
    ...props,
    getPosition: (d: DeckGLPieDatum) => d.position,
    getRadius: () => props.spotRadius,
    radiusUnits: 'meters',
    stroked: false,
    filled: true,
    pickable: true,
    spotRadius: props.spotRadius,
    domainColorMap: props.domainColorMap,
  });

  return layer;
}