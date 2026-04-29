import { describe, expect, test } from 'vitest';
import type { MagicCirclePattern, Point, Edge, CircleDef } from './patterns';
import { 
  createPresetPattern, 
  generateRandomPattern, 
  generateEdgePoints,
  getPatternVerticesForTemplate,
  getPatternTemplatePoints,
  RandomPatternConfig,
  Difficulty
} from './patterns';

describe('patterns.ts', () => {
  // Helper functions (copied from implementation for testing)
  function regularPolygonVertices(
    cx: number,
    cy: number,
    radius: number,
    n: number,
  ): Point[] {
    const verts: Point[] = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      verts.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    }
    return verts;
  }

  function polygonEdges(n: number): Edge[] {
    const edges: Edge[] = [];
    for (let i = 0; i < n; i++) edges.push({ from: i, to: (i + 1) % n });
    return edges;
  }

  function starEdges(n: number, step: number): Edge[] {
    const edges: Edge[] = [];
    for (let i = 0; i < n; i++) edges.push({ from: i, to: (i + step) % n });
    return edges;
  }

  describe('regularPolygonVertices', () => {
    test('should generate correct vertices for triangle', () => {
      const vertices = regularPolygonVertices(0, 0, 1, 3);
      expect(vertices).toHaveLength(3);
      // First vertex should be at top (angle -PI/2)
      expect(vertices[0].y).toBe(-1);
      expect(Math.abs(vertices[0].x)).toBeLessThan(1e-10);
    });

    test('should generate correct vertices for square', () => {
      const vertices = regularPolygonVertices(0, 0, 1, 4);
      expect(vertices).toHaveLength(4);
      // Check first few vertices
      expect(vertices[0].y).toBe(-1);
      expect(Math.abs(vertices[0].x)).toBeLessThan(1e-10);
      expect(vertices[1].x).toBeCloseTo(1, 10);
      expect(vertices[1].y).toBeCloseTo(0, 10);
    });
  });

  describe('polygonEdges', () => {
    test('should generate correct edges for triangle', () => {
      const edges = polygonEdges(3);
      expect(edges).toHaveLength(3);
      expect(edges[0]).toEqual({ from: 0, to: 1 });
      expect(edges[1]).toEqual({ from: 1, to: 2 });
      expect(edges[2]).toEqual({ from: 2, to: 0 });
    });

    test('should generate correct edges for square', () => {
      const edges = polygonEdges(4);
      expect(edges).toHaveLength(4);
      expect(edges[0]).toEqual({ from: 0, to: 1 });
      expect(edges[3]).toEqual({ from: 3, to: 0 });
    });
  });

  describe('starEdges', () => {
    test('should generate correct star edges for pentagram', () => {
      const edges = starEdges(5, 2);
      expect(edges).toHaveLength(5);
      expect(edges[0]).toEqual({ from: 0, to: 2 });
      expect(edges[1]).toEqual({ from: 1, to: 3 });
      expect(edges[2]).toEqual({ from: 2, to: 4 });
      expect(edges[3]).toEqual({ from: 3, to: 0 });
      expect(edges[4]).toEqual({ from: 4, to: 1 });
    });
  });

  describe('generateEdgePoints', () => {
    test('should generate points along edges', () => {
      const vertices: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
      const edges: Edge[] = [{ from: 0, to: 1 }, { from: 1, to: 2 }];
      const points = generateEdgePoints(vertices, edges, 2);
      
      // Should have 2 points per edge = 4 total
      expect(points).toHaveLength(4);
      // First edge: start point and midpoint
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[1]).toEqual({ x: 5, y: 0 });
      // Second edge: start point and midpoint  
      expect(points[2]).toEqual({ x: 10, y: 0 });
      expect(points[3]).toEqual({ x: 10, y: 5 });
    });
  });

  describe('createPresetPattern', () => {
    test('should create 9 preset patterns', () => {
      const patterns = createPresetPattern(350);
      expect(patterns).toHaveLength(9);
      
      // Check that all patterns have required properties
      patterns.forEach((pattern: MagicCirclePattern) => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('vertices');
        expect(pattern).toHaveProperty('edges');
        expect(pattern).toHaveProperty('circles');
        expect(pattern).toHaveProperty('vertexCount');
        expect(pattern).toHaveProperty('edgeCount');
        expect(pattern).toHaveProperty('circleCount');
        
        // Verify counts match arrays
        expect(pattern.vertexCount).toBe(pattern.vertices.length);
        expect(pattern.edgeCount).toBe(pattern.edges.length);
        expect(pattern.circleCount).toBe(pattern.circles.length);
      });
    });

    test('should have correct pattern names', () => {
      const patterns = createPresetPattern(350);
      const names = patterns.map(p => p.name);
      expect(names).toContain('三角形');
      expect(names).toContain('五芒星');
      expect(names).toContain('六芒星');
      expect(names).toContain('円');
      expect(names).toContain('複合魔法陣');
      expect(names).toContain('八芒星');
      expect(names).toContain('三重円');
      expect(names).toContain('五重星結界');
      expect(names).toContain('魔方陣風');
    });
  });

  describe('generateRandomPattern', () => {
    test('should generate pattern with correct difficulty', () => {
      const config: RandomPatternConfig = { difficulty: 'easy', canvasSize: 300 };
      const pattern = generateRandomPattern(config);
      
      // Easy difficulty should have 3 vertices
      expect(pattern.vertexCount).toBe(3);
      expect(pattern.name).toMatch(/Lv\.EASY/);
    });

    test('should generate pattern with hard difficulty', () => {
      const config: RandomPatternConfig = { difficulty: 'hard', canvasSize: 300 };
      const pattern = generateRandomPattern(config);
      
      // Hard difficulty should have 4-6 vertices
      expect(pattern.vertexCount).toBeGreaterThanOrEqual(4);
      expect(pattern.vertexCount).toBeLessThanOrEqual(6);
      expect(pattern.name).toMatch(/Lv\.HARD/);
    });

    test('should generate pattern with expert difficulty', () => {
      const config: RandomPatternConfig = { difficulty: 'expert', canvasSize: 300 };
      const pattern = generateRandomPattern(config);
      
      // Expert difficulty should have 5-9 vertices
      expect(pattern.vertexCount).toBeGreaterThanOrEqual(5);
      expect(pattern.vertexCount).toBeLessThanOrEqual(9);
      expect(pattern.name).toMatch(/Lv\.EXPERT/);
    });

    test('should respect canvas size', () => {
      const config: RandomPatternConfig = { difficulty: 'normal', canvasSize: 800 };
      const pattern = generateRandomPattern(config);
      
      // Vertices should be within canvas bounds (with some margin)
      pattern.vertices.forEach((v: Point) => {
        expect(v.x).toBeGreaterThan(0);
        expect(v.x).toBeLessThan(800);
        expect(v.y).toBeGreaterThan(0);
        expect(v.y).toBeLessThan(800);
      });
    });
  });

  describe('getPatternVerticesForTemplate', () => {
    test('should return vertices unchanged', () => {
      const mockPattern: MagicCirclePattern = {
        name: 'test',
        vertices: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
        edges: [{ from: 0, to: 1 }],
        circles: [],
        vertexCount: 2,
        edgeCount: 1,
        circleCount: 0
      };
      
      const result = getPatternVerticesForTemplate(mockPattern);
      expect(result).toEqual(mockPattern.vertices);
    });
  });

  describe('getPatternTemplatePoints', () => {
    test('should generate template points', () => {
      const mockPattern: MagicCirclePattern = {
        name: 'test',
        vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
        circles: [],
        vertexCount: 3,
        edgeCount: 2,
        circleCount: 0
      };
      
      const points = getPatternTemplatePoints(mockPattern, 2);
      // 2 edges * 2 points per edge = 4 points
      expect(points).toHaveLength(4);
    });
  });
});