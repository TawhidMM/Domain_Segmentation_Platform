# Spatial Consensus Visualization

A comprehensive React component for visualizing spatial consensus data with 3 view modes, automatic Canvas/SVG rendering, and smooth transitions.

## Features

- **3 View Modes:**
  - **Consensus**: Color-coded by domain labels with full opacity
  - **Confidence**: Perceptually uniform viridis colormap (dark blue → yellow)
  - **Combined**: Domain colors with opacity driven by confidence (min 25%)

- **Intelligent Rendering Engine:**
  - Canvas rendering for >5k spots (high performance)
  - SVG rendering for <3k spots (crisp, scalable)
  - Automatic selection based on data size

- **Dynamic Legends:**
  - Domain color legend automatically updated per mode
  - Confidence gradient display for heatmap mode

- **Smooth Transitions:**
  - 200ms opacity transitions when switching modes
  - Efficient style updates without full re-renders

## Installation

All files are included in the visualization system. No additional dependencies required beyond existing React + MUI stack.

## Usage

### Basic Example

```tsx
import SpatialConsensusVisualization from '@/components/visualization/SpatialConsensusVisualization';
import { ConsensusData } from '@/hooks/useSpatialConsensusRendering';

const MyComponent = () => {
  const consensusData: ConsensusData[] = [
    { x: 10, y: 20, consensus_label: 0, confidence: 0.85 },
    { x: 30, y: 40, consensus_label: 1, confidence: 0.92 },
    // ... more spots
  ];

  return (
    <SpatialConsensusVisualization
      data={consensusData}
      width={600}
      height={400}
      isLoading={false}
    />
  );
};
```

### With Custom Colors

```tsx
<SpatialConsensusVisualization
  data={consensusData}
  width={600}
  height={400}
  domainColors={{
    '0': '#FF6B6B',
    '1': '#4ECDC4',
    '2': '#45B7D1',
  }}
  radius={3}
/>
```

### Converting from API Response

```tsx
import { convertResultToConsensusData } from '@/lib/consensusDataUtils';

const experimentResult = await fetchExperimentResult(jobId);
const consensusData = convertResultToConsensusData(experimentResult);

return (
  <SpatialConsensusVisualization
    data={consensusData}
    isLoading={!consensusData}
  />
);
```

## File Structure

### Core Components

- **`SpatialConsensusVisualization.tsx`** - Main orchestrator component
  - Manages mode state
  - Renders control bar with mode toggle
  - Coordinates rendering engine selection
  - Displays legend and info footer

- **`SpatialConsensusSVG.tsx`** - SVG renderer (<3k spots)
  - Renders each spot as `<circle>`
  - Smooth opacity transitions via CSS
  - Scalable and crisp rendering

- **`SpatialConsensusCanvas.tsx`** - Canvas renderer (>5k spots)
  - High-performance canvas drawing
  - RequestAnimationFrame-based transitions
  - Opacity animation for smooth mode switching

- **`ConsensuLegend.tsx`** - Dynamic legend component
  - Shows domain color squares (consensus/combined modes)
  - Shows confidence gradient (confidence mode)
  - Auto-updates based on active mode

### Utilities & Hooks

- **`useSpatialConsensusRendering.ts`** - Core logic hook
  - Determines Canvas vs SVG based on spot count
  - Extracts unique domain labels
  - Calculates spatial bounds
  - Memoized for performance

- **`colorMaps.ts`** - Color mapping, color utilities
  - Viridis perceptually uniform colormap implementation
  - Domain color palette (10 colors)
  - Opacity clamping function
  - Gradient generation

- **`consensusDataUtils.ts`** - Data conversion utilities
  - `convertResultToConsensusData()` - API → visualization format
  - `calculateConfidenceStats()` - Statistical analysis
  - `normalizeCoordinates()` - Spatial normalization
  - `filterByConfidence()` / `filterByLabel()` - Data filtering

## API Reference

### SpatialConsensusVisualization Props

```typescript
interface SpatialConsensusVisualizationProps {
  data: ConsensusData[] | null;        // Array of spots with spatial + confidence data
  width?: number;                      // Canvas width (default: 600)
  height?: number;                     // Canvas height (default: 400)
  isLoading?: boolean;                 // Show loading state
  domainColors?: Record<string, string>; // Custom domain color palette
  radius?: number;                     // Spot radius (default: 2)
}
```

### ConsensusData Type

```typescript
interface ConsensusData {
  x: number;                           // X coordinate
  y: number;                           // Y coordinate
  consensus_label: string | number;    // Domain/cluster label
  confidence: number;                  // Confidence score (0-1)
}
```

## Rendering Logic Details

### Mode: Consensus
- **Fill**: `domainColorMap[consensus_label]`
- **Opacity**: 1 (full opacity)
- **Use case**: Viewing cluster assignments, clear domain visualization

### Mode: Confidence
- **Fill**: `viridisColormap(confidence)` 
  - 0 → dark blue (#440154)
  - 0.5 → teal (#31688e)
  - 1 → bright yellow (#fde725)
- **Opacity**: 1 (full opacity)
- **Use case**: Identifying low-confidence regions at a glance

### Mode: Combined
- **Fill**: `domainColorMap[consensus_label]`
- **Opacity**: `max(0.25, confidence)`
- **Use case**: Both domain and confidence information simultaneously

## Performance Characteristics

| Spot Count | Rendering Engine | Expected Performance | Note |
|-----------|-----------------|----------------------|------|
| <3,000    | SVG             | 60 FPS               | Crisp, scalable |
| 3,000-5,000 | SVG + Canvas transition | ~60 FPS | Auto-selection point |
| >5,000    | Canvas          | 60 FPS               | GPU-accelerated |
| >50,000   | Canvas          | 30-60 FPS            | Performant for most cases |

## Smooth Transitions

When switching modes, the component animates opacity changes over 200ms:

- **SVG**: CSS transition property handles smoothing
- **Canvas**: RequestAnimationFrame loop with progress interpolation

No expensive DOM re-renders occur during transitions.

## Customization

### Custom Color Palette

```tsx
const customColors: Record<string, string> = {
  '0': '#e74c3c',  // Red
  '1': '#3498db',  // Blue
  '2': '#2ecc71',  // Green
};

<SpatialConsensusVisualization
  data={consensusData}
  domainColors={customColors}
/>
```

### Adjust Spot Radius

```tsx
<SpatialConsensusVisualization
  data={consensusData}
  radius={4}  // Larger spots
/>
```

### Faster Transitions

The transition duration is hardcoded at 200ms. To modify, edit `SpatialConsensusVisualization.tsx` component prop:

```tsx
transitionDuration={100}  // Faster
```

## Data Preparation

Expected API response structure:

```json
{
  "result": {
    "spatial_data": [
      {
        "x": 10.5,
        "y": 20.3,
        "consensus_label": 0,
        "confidence": 0.92
      },
      ...
    ]
  }
}
```

Use `convertResultToConsensusData()` to transform:

```tsx
const data = convertResultToConsensusData(apiResult);
```

## Best Practices

1. **Normalize coordinates** before rendering if needed:
   ```tsx
   const normalized = normalizeCoordinates(data, 600, 400);
   ```

2. **Calculate stats** to understand data distribution:
   ```tsx
   const stats = calculateConfidenceStats(data);
   console.log(`Confidence range: ${stats.min} - ${stats.max}`);
   ```

3. **Filter data** for specific analysis:
   ```tsx
   const highConfidence = filterByConfidence(data, 0.8);
   const cluster0Only = filterByLabel(data, [0]);
   ```

## Browser Support

- Chrome/Edge: Full support (Canvas + SVG)
- Firefox: Full support (Canvas + SVG)
- Safari: Full support (Canvas + SVG)
- Mobile: Full support (Canvas for large datasets, SVG for small)

## Troubleshooting

**Issue**: All spots appear gray
- **Solution**: Check `domainColors` prop is passed, or ensure `consensus_label` values match color keys

**Issue**: Performance drops with >50k spots
- **Solution**: Canvas engine already selected. Consider filtering data by confidence threshold

**Issue**: Transitions are choppy
- **Solution**: Ensure browser hardware acceleration is enabled. Check for browser throttling in DevTools

## Future Enhancements

- [ ] Zoom/pan controls
- [ ] Hover tooltip with spot details
- [ ] Spatial clustering overlay
- [ ] Export as PNG/SVG
- [ ] Real-time data streaming
