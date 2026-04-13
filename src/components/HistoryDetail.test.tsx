import { render, screen } from '@testing-library/react'
import HistoryDetail from './HistoryDetail'
import type { MagicCircleHistory } from '@/lib/types'
import type { MagicCirclePattern } from '@/lib/patterns'

// Mock data for testing
const mockPattern: MagicCirclePattern = {
  name: 'テストパターン',
  vertices: [
    { x: 100, y: 50 },
    { x: 150, y: 120 },
    { x: 200, y: 200 },
    { x: 50, y: 180 },
    { x: 180, y: 180 }
  ],
  edges: [
    { from: 0, to: 2 },
    { from: 2, to: 4 },
    { from: 4, to: 1 },
    { from: 1, to: 3 },
    { from: 3, to: 0 }
  ],
  circles: [
    { cx: 0.5, cy: 0.5, radius: 100 },
    { cx: 0.5, cy: 0.5, radius: 80 }
  ]
}

const mockHistoryData = {
  pattern: mockPattern,
  drawLogs: [
    [
      { x: 100, y: 50, t: 0, type: 'start' },
      { x: 110, y: 55, t: 100, type: 'move' },
      { x: 120, y: 60, t: 200, type: 'move' },
      { x: 130, y: 70, t: 300, type: 'end' }
    ],
    [
      { x: 150, y: 120, t: 400, type: 'start' },
      { x: 160, y: 130, t: 500, type: 'move' },
      { x: 170, y: 140, t: 600, type: 'end' }
    ]
  ],
  timestamp: Date.now()
}

const mockHistory: MagicCircleHistory = {
  id: 'test-history-1',
  data: mockHistoryData,
  score: 85,
  rank: 'A',
  difficulty: 'normal',
  difficultyMultiplier: 1.0,
  damageMultiplier: '1.5x',
  createdAt: Date.now()
}

// Mock canvas context
const mockGetContext = jest.fn();
const mockCanvas = {
  getContext: mockGetContext
};

describe('HistoryDetail component', () => {
  beforeEach(() => {
    // Mock performance.now for animation timing
    jest.spyOn(window.performance, 'now').mockReturnValue(1000)
    
    // Mock requestAnimationFrame and cancelAnimationFrame
    const mockRequestAnimationFrame = jest.fn().mockImplementation(callback => {
      const id = Date.now() + Math.random()
      // Call the callback immediately with a mock timestamp
      callback(performance.now())
      return id
    })
    const mockCancelAnimationFrame = jest.fn()
    
    Object.defineProperty(window, 'requestAnimationFrame', { 
      value: mockRequestAnimationFrame 
    })
    Object.defineProperty(window, 'cancelAnimationFrame', { 
      value: mockCancelAnimationFrame 
    })
    
    // Mock canvas getContext
    const mockContext = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      shadowBlur: 0,
      shadowColor: '',
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      fillStyle: '',
      save: jest.fn(),
      restore: jest.fn()
    };
    mockGetContext.mockReturnValue(mockContext);
    
    // Mock HTMLCanvasElement
    const mockCanvasElement = {
      getContext: mockGetContext,
      width: 350,
      height: 350,
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test')
    };
    
    // Mock document.createElement to return our mock canvas
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = (tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvasElement;
      }
      return originalCreateElement(tagName);
    };
  })
  
  afterEach(() => {
    jest.restoreAllMocks()
  })
  
  it('should render without error', () => {
    const { container } = render(<HistoryDetail history={mockHistory} onClose={() => {}} onReEdit={() => {}} />)
    expect(container).toBeInTheDocument()
  })
  
  it('should display pattern name', () => {
    render(<HistoryDetail history={mockHistory} onClose={() => {}} onReEdit={() => {}} />)
    expect(screen.getByText(/テストパターン/i)).toBeInTheDocument()
  })
  
  it('should display replay button when history data is available', () => {
    render(<HistoryDetail history={mockHistory} onClose={() => {}} onReEdit={() => {}} />)
    // The button should be enabled when there's valid history data
    const playButton = screen.getByRole('button', { name: /▶️ 再生/ })
    expect(playButton).toBeInTheDocument()
    // Note: We can't easily test the disabled state without actually clicking
    // but we can verify the button exists
  })
  
  it('should not display replay button when no history is provided', () => {
    render(<HistoryDetail history={null} onClose={() => {}} onReEdit={() => {}} />)
    const playButton = screen.queryByRole('button', { name: /▶️ 再生/ })
    expect(playButton).not.toBeInTheDocument()
  })
  
  it('should not display replay button when history has no data', () => {
    const emptyHistory = { ...mockHistory, data: null as any }
    render(<HistoryDetail history={emptyHistory} onClose={() => {}} onReEdit={() => {}} />)
    const playButton = screen.queryByRole('button', { name: /▶️ 再生/ })
    expect(playButton).not.toBeInTheDocument()
  })
  
  it('should not display replay button when history has empty draw logs', () => {
    const emptyDrawLogsHistory = { 
      ...mockHistory, 
      data: { ...mockHistoryData, drawLogs: [] } 
    }
    render(<HistoryDetail history={emptyDrawLogsHistory} onClose={() => {}} onReEdit={() => {}} />)
    const playButton = screen.queryByRole('button', { name: /▶️ 再生/ })
    expect(playButton).not.toBeInTheDocument()
  })
})