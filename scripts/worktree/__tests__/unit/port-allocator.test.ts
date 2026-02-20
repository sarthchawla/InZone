import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findFreePort, findAllPorts, isPortInUse } from '../../src/lib/port-allocator.js';
import * as registry from '../../src/lib/registry.js';
import * as utils from '../../src/lib/utils.js';

// Mock dependencies
vi.mock('../../src/lib/registry.js');
vi.mock('../../src/lib/utils.js');

describe('port-allocator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(registry.getPortRange).mockImplementation((type) => {
      switch (type) {
        case 'frontend':
          return { min: 5173, max: 5199 };
        case 'backend':
          return { min: 3001, max: 3099 };
        case 'database':
          return { min: 7432, max: 7499 };
        default:
          return { min: 0, max: 0 };
      }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('findFreePort', () => {
    it('returns base port when nothing is in use', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([]);
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const port = findFreePort('frontend');

      expect(port).toBe(5173);
    });

    it('skips ports reserved in registry', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([5173, 5174]);
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const port = findFreePort('frontend');

      expect(port).toBe(5175);
    });

    it('skips ports in use by system (ss check)', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([]);
      vi.mocked(utils.runCommandSafe).mockImplementation((cmd, args) => {
        if (cmd === 'ss') {
          return 'LISTEN *:5173\nLISTEN *:5174';
        }
        return null;
      });

      const port = findFreePort('frontend');

      expect(port).toBe(5175);
    });

    it('uses correct range for database (7432-7499)', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([7432]); // main workspace
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const port = findFreePort('database');

      expect(port).toBe(7433);
    });

    it('uses correct range for backend (3001-3099)', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([3001]);
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const port = findFreePort('backend');

      expect(port).toBe(3002);
    });

    it('throws error when no ports available', () => {
      // All ports in range are used
      const allPorts = Array.from({ length: 27 }, (_, i) => 5173 + i);
      vi.mocked(registry.getUsedPorts).mockReturnValue(allPorts);
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      expect(() => findFreePort('frontend')).toThrow('No free ports available');
    });
  });

  describe('findAllPorts', () => {
    it('allocates all three ports', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([]);
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const ports = findAllPorts();

      expect(ports).toEqual({
        frontend: 5173,
        backend: 3001,
        database: 7432,
      });
    });

    it('skips already used ports for each service', () => {
      vi.mocked(registry.getUsedPorts).mockImplementation((type) => {
        switch (type) {
          case 'frontend':
            return [5173, 5174];
          case 'backend':
            return [3001];
          case 'database':
            return [7432, 7433];
          default:
            return [];
        }
      });
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const ports = findAllPorts();

      expect(ports).toEqual({
        frontend: 5175,
        backend: 3002,
        database: 7434,
      });
    });
  });

  describe('isPortInUse', () => {
    it('returns true when port is found in ss output', () => {
      vi.mocked(utils.runCommandSafe).mockImplementation((cmd) => {
        if (cmd === 'ss') {
          return 'tcp LISTEN 0 128 *:5173';
        }
        return null;
      });

      const result = isPortInUse(5173);

      expect(result).toBe(true);
    });

    it('returns true when port is found in lsof output', () => {
      vi.mocked(utils.runCommandSafe).mockImplementation((cmd) => {
        if (cmd === 'lsof') {
          return 'node 12345 user 22u IPv4 TCP *:5173 (LISTEN)';
        }
        return null;
      });

      const result = isPortInUse(5173);

      expect(result).toBe(true);
    });

    it('returns false when port is not in use', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const result = isPortInUse(5173);

      expect(result).toBe(false);
    });
  });
});
