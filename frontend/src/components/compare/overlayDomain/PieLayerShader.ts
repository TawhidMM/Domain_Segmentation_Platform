export const PIE_LAYER_SHADER_INJECT = {
  'vs:#decl': `
attribute float instanceSliceCount;
attribute vec4 instanceDomains0;
attribute vec4 instanceDomains1;
attribute vec4 instanceDomains2;
attribute vec4 instanceDomains3;

varying float vSliceCount;
varying vec4 vDomains0;
varying vec4 vDomains1;
varying vec4 vDomains2;
varying vec4 vDomains3;
`,
  'vs:#main-end': `
vSliceCount = instanceSliceCount;
vDomains0 = instanceDomains0;
vDomains1 = instanceDomains1;
vDomains2 = instanceDomains2;
vDomains3 = instanceDomains3;
`,
  'fs:#decl': `
varying float vSliceCount;
varying vec4 vDomains0;
varying vec4 vDomains1;
varying vec4 vDomains2;
varying vec4 vDomains3;

uniform vec3 uPalette[32];

float readPackedDomain(vec4 domains, float idx) {
  if (idx < 1.0) {
    return domains.x;
  }

  if (idx < 2.0) {
    return domains.y;
  }

  if (idx < 3.0) {
    return domains.z;
  }

  return domains.w;
}

float readDomain(float idx) {
  if (idx < 4.0) {
    return readPackedDomain(vDomains0, idx);
  }

  if (idx < 8.0) {
    return readPackedDomain(vDomains1, idx - 4.0);
  }

  if (idx < 12.0) {
    return readPackedDomain(vDomains2, idx - 8.0);
  }

  return readPackedDomain(vDomains3, idx - 12.0);
}

vec3 getColor(int domainId) {
  vec3 color = vec3(0.9);

  for (int i = 0; i < 32; i++) {
    if (i == domainId) {
      color = uPalette[i];
    }
  }

  return color;
}
`,
  'fs:DECKGL_FILTER_COLOR': `
{
  vec2 uv = geometry.uv;
  float r = length(uv);

  if (r > 1.0) discard;

  float totalSlices = max(vSliceCount, 1.0);
  float theta = atan(uv.y, uv.x);

  if (theta < 0.0) {
    theta += 6.28318530718;
  }

  float sliceAngle = 6.28318530718 / totalSlices;
  float sliceIdx = floor(theta / sliceAngle);
  sliceIdx = clamp(sliceIdx, 0.0, totalSlices - 1.0);

  int domainId = int(readDomain(sliceIdx));
  vec3 rgb = getColor(domainId);
  float edgeAlpha = smoothstep(1.0, 0.92, r);

  color = vec4(rgb, edgeAlpha);
  color = picking_filterHighlightColor(color);
  color = picking_filterPickingColor(color);
}
`,
};
