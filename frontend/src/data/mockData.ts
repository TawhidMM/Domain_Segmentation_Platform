import { ExperimentResult } from '@/types';

// Generate mock spatial coordinates
const generateMockCoordinates = (count: number): { x: number; y: number }[] => {
  const coordinates: { x: number; y: number }[] = [];
  const gridSize = Math.ceil(Math.sqrt(count));
  
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    coordinates.push({
      x: col * 100 + Math.random() * 20 - 10,
      y: row * 100 + Math.random() * 20 - 10,
    });
  }
  
  return coordinates;
};

// Domain color palette
export const domainColors = [
  '#0D9488', // Teal
  '#2563EB', // Blue
  '#DC2626', // Red
  '#EA580C', // Orange
  '#CA8A04', // Yellow
  '#16A34A', // Green
  '#9333EA', // Purple
  '#DB2777', // Pink
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#059669', // Emerald
];

// Generate mock experiment result
export const generateMockResult = (numClusters: number, numSpots: number = 2000): ExperimentResult => {
  const coordinates = generateMockCoordinates(numSpots);
  const domains: number[] = [];
  
  // Create spatial clustering effect
  for (let i = 0; i < numSpots; i++) {
    const { x, y } = coordinates[i];
    const angle = Math.atan2(y - 500, x - 500);
    const distance = Math.sqrt((x - 500) ** 2 + (y - 500) ** 2);
    
    // Assign domain based on position with some noise
    let domain = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * numClusters);
    if (distance < 200) {
      domain = (domain + 1) % numClusters;
    }
    if (Math.random() < 0.1) {
      domain = Math.floor(Math.random() * numClusters);
    }
    
    domains.push(domain);
  }
  
  return {
    domains,
    coordinates,
    domainColors: domainColors.slice(0, numClusters),
  };
};

// Mock dataset summary generator
export const generateMockDatasetSummary = (): { spotCount: number; geneCount: number } => ({
  spotCount: 2000 + Math.floor(Math.random() * 3000),
  geneCount: 18000 + Math.floor(Math.random() * 7000),
});
