/**
 * Additional utils tests to achieve 100% coverage
 */

import { groupUtils, permissionUtils } from '../index';
import { Group } from '../../core/types';

describe('Utils - Coverage Tests', () => {
  const createTestGroup = (id: string, members: (string | Group)[]): Group => ({
    id,
    name: `Group ${id}`,
    members,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('groupUtils edge cases', () => {
    it('should handle containsUser edge case', () => {
      const group = createTestGroup('test', ['user1', 'user2']);
      
      // Use containsUser through the 'this' context
      expect(groupUtils.containsUser(group, 'user1')).toBe(true);
      expect(groupUtils.containsUser(group, 'user3')).toBe(false);
    });
  });

  describe('permissionUtils.matchesPattern - Line 82 Coverage', () => {
    it('should handle exact length matching - line 82', () => {
      // Test the specific case where pattern parts match exactly
      // and we need to check if lengths are equal (line 82)
      
      // Case 1: Pattern and permission have same length and match exactly
      const exactMatch = permissionUtils.matchesPattern('users.read', 'users.read');
      expect(exactMatch).toBe(true);
      
      // Case 2: Pattern parts all match but permission is longer
      // This tests the final length comparison (line 82)
      const longerPermission = permissionUtils.matchesPattern('users.read.extra', 'users.read');
      expect(longerPermission).toBe(false);
      
      // Case 3: Pattern and permission same length, all parts match
      const sameLength = permissionUtils.matchesPattern('a.b.c', 'a.b.c');
      expect(sameLength).toBe(true);
      
      // Case 4: Single level exact match
      const singleLevel = permissionUtils.matchesPattern('admin', 'admin');
      expect(singleLevel).toBe(true);
      
      // Case 5: Two-level exact match where line 82 is critical
      const twoLevel = permissionUtils.matchesPattern('users.create', 'users.create');
      expect(twoLevel).toBe(true);
      
      // Case 6: Pattern shorter than permission, all parts match, but different lengths
      // This specifically tests line 82 returning false
      const shorterPattern = permissionUtils.matchesPattern('users.read.details.extra', 'users.read');
      expect(shorterPattern).toBe(false);
    });

    it('should handle edge cases for line 82', () => {
      // Empty strings
      const emptyBoth = permissionUtils.matchesPattern('', '');
      expect(emptyBoth).toBe(true);
      
      // Single character matches
      const singleChar = permissionUtils.matchesPattern('a', 'a');
      expect(singleChar).toBe(true);
      
      // Single character mismatch
      const singleCharDiff = permissionUtils.matchesPattern('a', 'b');
      expect(singleCharDiff).toBe(false);
    });
  });
});