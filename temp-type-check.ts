import { vi, type Mock } from 'vitest';

// Test the Mock type signature
const mockFn: Mock = vi.fn();
console.log(mockFn);
