import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import type { CompletionRecord } from './completionDB';
import { 
  getCompletion, 
  getAllCompletions, 
  updateCompletion, 
  isPatternCompleted,
  getCompletedCount,
  getTotalPatternsCount,
  getBetterRank
} from './completionDB';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn()
};

// Mock IDBRequest
class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: Event) => void) | null = null;
  
  // Simulate success
  succeed() {
    console.log('MockIDBRequest.succeed() called');
    if (this.onsuccess) {
      console.log('Calling onsuccess handler');
      const event = new Event('success');
      this.onsuccess.call(this, event);
    } else {
      console.log('No onsuccess handler to call');
    }
  }
  
  // Simulate error
  fail() {
    console.log('MockIDBRequest.fail() called');
    if (this.onerror) {
      const event = new Event('error');
      this.onerror.call(this, event);
    }
  }
}

// Mock IDBTransaction
class MockIDBTransaction {
  objectStoreName: string;
  mode: string;
  completed: boolean = false;
  
  constructor(name: string, mode: string) {
    this.objectStoreName = name;
    this.mode = mode;
  }
  
  objectStore(name: string) {
    return new MockIDBObjectStore(name);
  }
  
  // Simulate completion
  complete() {
    this.completed = true;
  }
}

// Mock IDBObjectStore
class MockIDBObjectStore {
  name: string;
  data: Map<string, any> = new Map();
  
  constructor(name: string) {
    this.name = name;
  }
  
  get(key: string) {
    console.log('MockIDBObjectStore.get called with key:', key);
    // Return the current mockGetRequest (updated in each beforeEach)
    console.log('Returning mockGetRequest:', mockGetRequest);
    return mockGetRequest;
  }
  
  put(value: any) {
    console.log('MockIDBObjectStore.put called with value:', value);
    // Return the current mockPutRequest (updated in each beforeEach)
    if (value && value.patternName) {
      this.data.set(value.patternName, value);
    }
    console.log('Returning mockPutRequest:', mockPutRequest);
    return mockPutRequest;
  }
  
  getAll() {
    // Return the current mockGetAllRequest (updated in each beforeEach)
    return mockGetAllRequest;
  }
  
  createIndex(name: string, keyPath: string, options: any) {
    // Mock implementation
    return {};
  }
}

// Store the mock requests and database so tests can trigger success
let mockOpenRequest: MockIDBRequest;
let mockGetRequest: MockIDBRequest;
let mockPutRequest: MockIDBRequest;
let mockGetAllRequest: MockIDBRequest;
let mockDb: IDBDatabase | null = null;

// Store original methods for restoration
let originalObjectStore: any;
let originalGet: any;
let originalPut: any;
let originalGetAll: any;

// Cache object store instances that persist across transactions and database opens
const objectStoreInstances = new Map<string, MockIDBObjectStore>();

// Mock global indexedDB
beforeEach(() => {
  // Clear mocks
  vi.clearAllMocks();
  mockDb = null;
  mockOpenRequest = new MockIDBRequest();
  mockGetRequest = new MockIDBRequest();
  mockPutRequest = new MockIDBRequest();
  mockGetAllRequest = new MockIDBRequest();
  
  // Reset the object store cache for each test
  objectStoreInstances.clear();
  
  // Setup mock indexedDB - return a new mock request each time
  mockIndexedDB.open.mockImplementation(() => {
    // Create a new request for this call
    const openRequest = new MockIDBRequest();
    
    // Store it so tests can access it
    mockOpenRequest = openRequest;
    
    // Set up the database that will be returned when open succeeds
    mockDb = {
      objectStoreNames: {
        contains: (name: string) => name === STORE_NAME
      } as DOMStringList,
      transaction: (storeName: string, mode: string) => {
        const tx = new MockIDBTransaction(storeName, mode);
        // When we get the object store, return our cached mock
        tx.objectStore = (name: string) => {
          if (!objectStoreInstances.has(name)) {
            objectStoreInstances.set(name, new MockIDBObjectStore(name));
          }
          return objectStoreInstances.get(name)!;
        };
        return tx;
      },
      close: () => {}
    } as IDBDatabase;
    
    // Set the result on the request BEFORE calling succeed
    // This simulates what happens in the real indexedDB when open succeeds
    openRequest.result = mockDb;
    
    return openRequest;
  });
  
  // Mock MockIDBObjectStore methods to create new mock requests each time
  originalGet = MockIDBObjectStore.prototype.get;
  MockIDBObjectStore.prototype.get = function(key: string) {
    console.log('MockIDBObjectStore.get called with key:', key);
    // Create a new request for this call
    const getRequest = new MockIDBRequest();
    // Update the reference so tests can access it
    mockGetRequest = getRequest;
    // Set the result based on the actual data in this.data
    // Important: In real IndexedDB, get() returns undefined when key doesn't exist, not null
    getRequest.result = this.data.get(key);
    console.log('Created and stored mockGetRequest with result:', getRequest.result);
    return getRequest;
  };
  
  originalPut = MockIDBObjectStore.prototype.put;
  MockIDBObjectStore.prototype.put = function(value: any) {
    console.log('MockIDBObjectStore.put called with value:', value);
    // Create a new request for this call
    const putRequest = new MockIDBRequest();
    // Update the reference so tests can access it
    mockPutRequest = putRequest;
    console.log('Created and stored mockPutRequest:', mockPutRequest);
    if (value && value.patternName) {
      // Actually store the data in our mock database
      this.data.set(value.patternName, value);
      console.log('Stored data in mock database:', Array.from(this.data.entries()));
    }
    return putRequest;
  };
  
  originalGetAll = MockIDBObjectStore.prototype.getAll;
  MockIDBObjectStore.prototype.getAll = function() {
    console.log('MockIDBObjectStore.getAll called');
    // Create a new request for this call
    const getAllRequest = new MockIDBRequest();
    // Update the reference so tests can access it
    mockGetAllRequest = getAllRequest;
    // Set the result based on the actual data in this.data
    getAllRequest.result = Array.from(this.data.values());
    console.log('Created and stored mockGetAllRequest:', mockGetAllRequest);
    return getAllRequest;
  };
  
  // @ts-ignore
  global.indexedDB = mockIndexedDB;
});

afterEach(() => {
  // Restore original methods
  MockIDBTransaction.prototype.objectStore = originalObjectStore;
  MockIDBObjectStore.prototype.get = originalGet;
  MockIDBObjectStore.prototype.put = originalPut;
  MockIDBObjectStore.prototype.getAll = originalGetAll;
  
  // @ts-ignore
  delete global.indexedDB;
});

describe('completionDB.ts', () => {
  describe('getBetterRank', () => {
    test('should return S rank when comparing S vs anything', () => {
      expect(getBetterRank('S', 'A')).toBe('S');
      expect(getBetterRank('S', 'B')).toBe('S');
      expect(getBetterRank('S', 'C')).toBe('S');
      expect(getBetterRank('S', 'S')).toBe('S');
    });
    
    test('should return A rank when comparing A vs B/C', () => {
      expect(getBetterRank('A', 'B')).toBe('A');
      expect(getBetterRank('A', 'C')).toBe('A');
      expect(getBetterRank('A', 'A')).toBe('A');
    });
    
    test('should return B rank when comparing B vs C', () => {
      expect(getBetterRank('B', 'C')).toBe('B');
      expect(getBetterRank('B', 'B')).toBe('B');
    });
    
    test('should return first rank when second is invalid', () => {
      expect(getBetterRank('A', 'invalid' as any)).toBe('A');
      expect(getBetterRank('invalid' as any, 'C')).toBe('C');
    });
  });

  describe('updateCompletion', () => {
    test('should create new record when none exists', async () => {
      // Start the updateCompletion promise
      const updatePromise = updateCompletion('TestPattern', 85, 'B');
      
      // NOW trigger the openDB success for updateCompletion
      mockOpenRequest.succeed();
      
      // Wait for microtask checkpoint to allow updateCompletion to proceed
      await Promise.resolve();
      
      // updateCompletion should now have called store.get and set up its onsuccess handler
      // Trigger the get request success (returns undefined - no existing record)
      mockGetRequest.succeed();
      
      // Wait for microtask checkpoint to allow updateCompletion to proceed
      await Promise.resolve();
      
      // updateCompletion should now have called store.put and set up its onsuccess handler
      // Trigger the put request success
      mockPutRequest.succeed();
      
      // Wait for updateCompletion to finish
      await updatePromise;
      
      // Start the getCompletion promise
      const getPromise = getCompletion('TestPattern');
      
      // Trigger the openDB success for getCompletion
      mockOpenRequest.succeed();
      
      // Wait for microtask checkpoint to allow getCompletion to proceed
      await Promise.resolve();
      
      // getCompletion should now have called store.get and set up its onsuccess handler
      // Trigger the get request success (should return the stored record we just put)
      mockGetRequest.succeed();
      
      // Wait for microtask checkpoint to allow getCompletion to proceed
      await Promise.resolve();
      
      // Wait for getCompletion to finish
      const completion = await getPromise;
      
      expect(completion).toBeDefined();
      expect(completion?.patternName).toBe('TestPattern');
      expect(completion?.bestScore).toBe(85);
      expect(completion?.bestRank).toBe('B');
      expect(completion?.completionCount).toBe(0); // B rank doesn't increment completion count
      expect(completion?.completedAt).toBe(0); // Not S rank, so completedAt should be 0
      expect(completion?.lastAttempted).toBeGreaterThan(0);
    });
    
    test('should update existing record with higher score', async () => {
      // First update
      const updatePromise1 = updateCompletion('TestPattern', 75, 'B');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise1;
      
      // Second update with higher score
      const updatePromise2 = updateCompletion('TestPattern', 85, 'A');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise2;
      
      const getPromise = getCompletion('TestPattern');
      // Trigger the openDB promise to resolve for getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve for getCompletion
      mockGetRequest.succeed();
      const completion = await getPromise;
      
      expect(completion).toBeDefined();
      expect(completion?.bestScore).toBe(85);
      expect(completion?.bestRank).toBe('A');
      expect(completion?.completionCount).toBe(0);
    });
    
    test('should keep higher score when new score is lower', async () => {
      // First update with high score
      const updatePromise1 = updateCompletion('TestPattern', 95, 'S');
      // Trigger the openDB promise to resolve for updateCompletion1
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise1;
      
      // Second update with lower score
      const updatePromise2 = updateCompletion('TestPattern', 80, 'A');
      // Trigger the openDB promise to resolve for updateCompletion2
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise2;
      
      await updatePromise1;
      await updatePromise2;
      
      const getPromise = getCompletion('TestPattern');
      // Trigger the openDB promise to resolve for getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve for getCompletion
      mockGetRequest.succeed();
      const completion = await getPromise;
      
      expect(completion).toBeDefined();
      expect(completion?.bestScore).toBe(95);
      expect(completion?.bestRank).toBe('S');
      expect(completion?.completionCount).toBe(1); // S rank increments completion count
      expect(completion?.completedAt).toBeGreaterThan(0); // S rank sets completedAt
    });
    
    test('should increment completion count for S rank', async () => {
      const updatePromise1 = updateCompletion('TestPattern', 92, 'S');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      
      const updatePromise2 = updateCompletion('TestPattern', 91, 'S');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      
      const updatePromise3 = updateCompletion('TestPattern', 85, 'A'); // Not S rank
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      
      await updatePromise1;
      await updatePromise2;
      await updatePromise3;
      
      const getPromise = getCompletion('TestPattern');
      // Trigger the openDB promise to resolve for getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve for getCompletion
      mockGetRequest.succeed();
      const completion = await getPromise;
      
      expect(completion).toBeDefined();
      expect(completion?.completionCount).toBe(2); // Only 2 S ranks
    });
    
    test('should set completedAt when first achieving S rank', async () => {
      const updatePromise1 = updateCompletion('TestPattern', 85, 'A'); // Not S rank
      // Trigger the openDB promise to resolve for updateCompletion1
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      
      const getPromise1 = getCompletion('TestPattern');
      // Trigger the openDB promise to resolve for getCompletion1
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getPromise1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve for getCompletion1
      mockGetRequest.succeed();
      
      await updatePromise1;
      let completion = await getPromise1;
      expect(completion?.completedAt).toBe(0);
      
      const updatePromise2 = updateCompletion('TestPattern', 92, 'S'); // First S rank
      // Trigger the openDB promise to resolve for updateCompletion2
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      
      const getPromise2 = getCompletion('TestPattern');
      // Trigger the openDB promise to resolve for getCompletion2
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getPromise2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve for getCompletion2
      mockGetRequest.succeed();
      
      await updatePromise2;
      completion = await getPromise2;
      expect(completion?.completedAt).toBeGreaterThan(0);
      
      const updatePromise3 = updateCompletion('TestPattern', 90, 'S'); // Another S rank
      // Trigger the openDB promise to resolve for updateCompletion3
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      
      const getPromise3 = getCompletion('TestPattern');
      // Trigger the openDB promise to resolve for getCompletion3
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getPromise3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve for getCompletion3
      mockGetRequest.succeed();
      
      await updatePromise3;
      completion = await getPromise3;
      expect(completion?.completedAt).toBeGreaterThan(0);
      // completedAt should remain the same (first S rank time)
      const firstTime = completion?.completedAt;
      
      const updatePromise4 = updateCompletion('TestPattern', 88, 'B');
      // Trigger the openDB promise to resolve for updateCompletion4
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion4 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion4 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      
      const getPromise4 = getCompletion('TestPattern');
      // Trigger the openDB promise to resolve for getCompletion4
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getPromise4 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve for getCompletion4
      mockGetRequest.succeed();
      
      await updatePromise4;
      completion = await getPromise4;
      expect(completion?.completedAt).toBe(firstTime);
    });
  });

  describe('getCompletion', () => {
    test('should return undefined for non-existent pattern', async () => {
      const getPromise = getCompletion('NonExistentPattern');
      // Trigger the openDB promise to resolve for getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      const completion = await getPromise;
      expect(completion).toBeUndefined();
    });
    
    test('should return existing completion record', async () => {
      const updatePromise = updateCompletion('TestPattern', 80, 'C');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise;
      
      const getPromise = getCompletion('TestPattern');
      // Trigger the openDB promise to resolve for getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve for getCompletion
      mockGetRequest.succeed();
      const completion = await getPromise;
      
      expect(completion).toBeDefined();
      expect(completion?.patternName).toBe('TestPattern');
      expect(completion?.bestScore).toBe(80);
      expect(completion?.bestRank).toBe('C');
      expect(completion?.completionCount).toBe(0); // C rank doesn't increment completion count
      expect(completion?.completedAt).toBe(0); // Not S rank, so completedAt should be 0
      expect(completion?.lastAttempted).toBeGreaterThan(0);
    });
  });

  describe('getAllCompletions', () => {
    test('should return empty array when no records', async () => {
      const getAllPromise = getAllCompletions();
      // Trigger the openDB promise to resolve for getAllCompletions
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getAllCompletions to proceed
      await Promise.resolve();
      // Trigger the objectStore.getAll promise to resolve
      mockGetAllRequest.succeed();
      const completions = await getAllPromise;
      expect(completions).toEqual([]);
    });
    
    test('should return all completion records', async () => {
      const updatePromise1 = updateCompletion('Pattern1', 70, 'C');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise1;
      
      const updatePromise2 = updateCompletion('Pattern2', 85, 'B');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise2;
      
      const updatePromise3 = updateCompletion('Pattern3', 92, 'S');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise3;
      
      const getAllPromise = getAllCompletions();
      // Trigger the openDB promise to resolve for getAllCompletions
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getAllCompletions to proceed
      await Promise.resolve();
      // Trigger the objectStore.getAll promise to resolve
      mockGetAllRequest.succeed();
      const completions = await getAllPromise;
      
      expect(completions).toHaveLength(3);
      
      const patternNames = completions.map(c => c.patternName);
      expect(patternNames).toContain('Pattern1');
      expect(patternNames).toContain('Pattern2');
      expect(patternNames).toContain('Pattern3');
    });
  });

  describe('isPatternCompleted', () => {
    test('should return false for non-existent pattern', async () => {
      const isCompletedPromise = isPatternCompleted('NonExistentPattern');
      // Trigger the openDB promise to resolve for isPatternCompleted -> getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow isPatternCompleted to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      const result = await isCompletedPromise;
      expect(result).toBe(false);
    });
    
    test('should return false for pattern with score < 90', async () => {
      const updatePromise = updateCompletion('TestPattern', 85, 'A');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise;
      
      const isCompletedPromise = isPatternCompleted('TestPattern');
      // Trigger the openDB promise to resolve for isPatternCompleted -> getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow isPatternCompleted to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      const result = await isCompletedPromise;
      expect(result).toBe(false);
    });
    
    test('should return true for pattern with score >= 90', async () => {
      const updatePromise = updateCompletion('TestPattern', 92, 'S');
      // Trigger the openDB promise to resolve for updateCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise;
      
      const isCompletedPromise = isPatternCompleted('TestPattern');
      // Trigger the openDB promise to resolve for isPatternCompleted -> getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow isPatternCompleted to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      const result = await isCompletedPromise;
      expect(result).toBe(true);
    });
    
    test('should return true for pattern that was previously completed', async () => {
      const updatePromise1 = updateCompletion('TestPattern', 95, 'S'); // Completed
      // Trigger the openDB promise to resolve for updateCompletion1
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise1;
      
      const updatePromise2 = updateCompletion('TestPattern', 75, 'C');  // Attempt with lower score
      // Trigger the openDB promise to resolve for updateCompletion2
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise2;
      
      const isCompletedPromise = isPatternCompleted('TestPattern');
      // Trigger the openDB promise to resolve for isPatternCompleted -> getCompletion
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow isPatternCompleted to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns existing record)
      mockGetRequest.succeed();
      const result = await isCompletedPromise;
      expect(result).toBe(true);
    });
  });

  describe('getCompletedCount', () => {
    test('should return 0 when no patterns completed', async () => {
      const updatePromise1 = updateCompletion('Pattern1', 80, 'B');
      // Trigger the openDB promise to resolve for updateCompletion1
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise1;
      
      const updatePromise2 = updateCompletion('Pattern2', 70, 'C');
      // Trigger the openDB promise to resolve for updateCompletion2
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise2;
      
      const getCompletedPromise = getCompletedCount();
      // Trigger the openDB promise to resolve for getCompletedCount -> getAllCompletions
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getCompletedPromise to proceed
      await Promise.resolve();
      // Trigger the objectStore.getAll promise to resolve
      mockGetAllRequest.succeed();
      const count = await getCompletedPromise;
      expect(count).toBe(0);
    });
    
    test('should return count of completed patterns', async () => {
      const updatePromise1 = updateCompletion('Pattern1', 92, 'S'); // Completed
      // Trigger the openDB promise to resolve for updateCompletion1
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion1 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise1;
      
      const updatePromise2 = updateCompletion('Pattern2', 85, 'B');  // Not completed
      // Trigger the openDB promise to resolve for updateCompletion2
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion2 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise2;
      
      const updatePromise3 = updateCompletion('Pattern3', 96, 'S'); // Completed
      // Trigger the openDB promise to resolve for updateCompletion3
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion3 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise3;
      
      const updatePromise4 = updateCompletion('Pattern4', 88, 'B');  // Not completed
      // Trigger the openDB promise to resolve for updateCompletion4
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion4 to proceed
      await Promise.resolve();
      // Trigger the objectStore.get promise to resolve (returns undefined)
      mockGetRequest.succeed();
      // Wait for microtask checkpoint to allow updateCompletion4 to proceed
      await Promise.resolve();
      // Trigger the objectStore.put promise to resolve
      mockPutRequest.succeed();
      await updatePromise4;
      
      const getCompletedPromise = getCompletedCount();
      // Trigger the openDB promise to resolve for getCompletedCount -> getAllCompletions
      mockOpenRequest.succeed();
      // Wait for microtask checkpoint to allow getCompletedPromise to proceed
      await Promise.resolve();
      // Trigger the objectStore.getAll promise to resolve
      mockGetAllRequest.succeed();
      const count = await getCompletedPromise;
      expect(count).toBe(2);
    });
  });

  describe('getTotalPatternsCount', () => {
    test('should return pattern count from preset patterns', async () => {
      const count = await getTotalPatternsCount();
      // Should be 9 based on createPresetPattern
      expect(count).toBe(9);
    });
  });
});