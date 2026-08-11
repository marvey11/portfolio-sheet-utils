import { vi } from 'vitest';

// Global mock for Google Apps Script Logger
(globalThis as any).Logger = {
  log: vi.fn((msg: string) => console.log(`[GAS Logger]: ${msg}`)),
};

// Global mock for SpreadsheetApp if needed
(globalThis as any).SpreadsheetApp = {
  getUi: vi.fn(),
};
