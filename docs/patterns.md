# 🔺 Pattern System (patterns.ts)

## Overview
The pattern system defines all magic circle templates that users can trace. It includes both preset patterns (geometric shapes, symbols) and procedurally generated random patterns.

## Core Data Structures

### Point
```typescript
interface Point {
  x: number; // Canvas X coordinate
  y: number; // Canvas Y coordinate
}
```

### Edge
```typescript
interface Edge {
  from: number; // Index of start vertex in vertices array
  to: number;   // Index of end vertex in vertices array
}
```

### CircleDef
```typescript
interface CircleDef {
  cx: number; // Relative X center (0-1, 0.5 = canvas center)
  cy: number; // Relative Y center (0-1, 0.5 = canvas center)
  radius: number; // Radius in pixels
}
```

### MagicCirclePattern
```typescript
interface MagicCirclePattern {
  name: string;           // Display name of the pattern
  vertices: Point[];      // Array of corner/control points
  edges: Edge[];          // Connections between vertices
  circles: CircleDef[];   // Auxiliary circles for decoration
  vertexCount: number;    // Number of vertices
  edgeCount: number;      // Number of edges
  circleCount: number;    // Number of circles
}
```

## Preset Patterns
The system includes 9 predefined patterns:

1. **三角形 (Triangle)** - Basic 3-sided polygon
2. **五芒星 (Pentagram)** - 5-pointed star
3. **六芒星 (Hexagram)** - Star of David (two overlapping triangles)
4. **円 (Circle)** - Approximated with 60 points
5. **複合魔法陣 (Complex Magic Circle)** - 8-pointed star with inner connections
6. **八芒星 (Octagram)** - 8-pointed star
7. **三重円 (Triple Circle)** - Three concentric circles
8. **五重星結界 (Pentagram Seal)** - Pentagram with outer pentagon frame
9. **魔方陣風 (Magic Square Style)** - 3x3 grid pattern

## Pattern Generation

### createPresetPattern(canvasSize)
Generates all preset patterns scaled to the given canvas size.
- Centers patterns in the middle of the canvas
- Scales based on canvasSize * 0.35 for base radius
- Returns array of MagicCirclePattern objects

### generateRandomPattern(config)
Creates procedurally generated patterns based on difficulty:
```typescript
interface RandomPatternConfig {
  difficulty: Difficulty;   // easy, normal, hard, expert
  canvasSize: number;       // Canvas dimensions
}
```

#### Difficulty-Based Generation
- **Easy**: 3 vertices, 1 circle
- **Normal**: 3-5 vertices, 1-2 circles
- **Hard**: 4-6 vertices, 1-3 circles
- **Expert**: 5-9 vertices, 1-3 circles + extra edges

#### Features
- Random vertex count within difficulty range
- Choice between polygon or star-shaped edges
- Additional random edges for expert difficulty
- Scaled radius variation (85%-115% of base)
- Dynamic naming: "Lv.[DIFFICULTY] #[NUMBER]"

## Helper Functions

### Vertex Generation
- `regularPolygonVertices(cx, cy, radius, n)`: Creates evenly spaced points on a circle
- `polygonEdges(n)`: Creates edges connecting consecutive vertices (closed shape)
- `starEdges(n, step)`: Creates star pattern by skipping vertices
- `generateEdgePoints(vertices, edges, pointsPerEdge)`: Samples points along edges for rendering

### Template Utilities
- `getPatternVerticesForTemplate(pattern)`: Returns raw vertices
- `getPatternTemplatePoints(pattern, pointsPerEdge)`: Returns sampled points along edges for collision detection

## Usage Examples

### Getting Current Pattern
```typescript
const currentPattern = patterns[currentIdx];
const patternName = currentPattern?.name ?? '';
```

### Drawing Template
```typescript
// In canvas rendering
drawTemplate(pattern, highlight); // Draws vertices, edges, and circles
```

### Scoring
```typescript
// Pass pattern to scoring function
const result = calculateScore(userPath, pattern, difficultyTolerance);
```

## Design Notes

### Coordinate System
- Origin (0,0) at top-left canvas corner
- Center at (canvasSize/2, canvasSize/2)
- Y increases downward (standard canvas coordinates)

### Scaling
All patterns scale proportionally with canvas size
Base radius = canvasSize * 0.35
Patterns maintain aspect ratio regardless of canvas dimensions

### Performance
- Preset patterns calculated once on initialization
- Random patterns generated on-demand
- Edge sampling allows adjustable precision for collision detection
- Complex patterns use vertex sampling to avoid performance issues