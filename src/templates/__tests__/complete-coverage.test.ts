/**
 * Complete templates coverage tests for edge cases
 */

import { PermissionTemplateBuilder } from '../index';

describe('Templates Complete Coverage', () => {
  describe('PermissionTemplateBuilder - optional property fallbacks (lines 195-204)', () => {
    it('should handle addPermission when permissions array is undefined', () => {
      const builder = new PermissionTemplateBuilder('test-id', 'Test Template');
      
      // Reset permissions to undefined to test the fallback
      (builder as any).template.permissions = undefined;
      
      // This should trigger the fallback: this.template.permissions = this.template.permissions || [];
      builder.addPermission('read:documents');
      
      // Verify permissions array was created and permission was added
      expect((builder as any).template.permissions).toEqual([
        { permission: 'read:documents', conditions: undefined }
      ]);
    });

    it('should handle addPermission with conditions when permissions array is undefined', () => {
      const builder = new PermissionTemplateBuilder('test-id', 'Test Template');
      
      // Reset permissions to undefined to test the fallback
      (builder as any).template.permissions = undefined;
      
      const conditions = [{ type: 'time', value: '9-17' }];
      
      // This should trigger the fallback and add permission with conditions
      builder.addPermission('write:documents', conditions);
      
      // Verify permissions array was created and permission was added with conditions
      expect((builder as any).template.permissions).toEqual([
        { permission: 'write:documents', conditions }
      ]);
    });

    it('should handle addVariable when variables object is undefined', () => {
      const builder = new PermissionTemplateBuilder('test-id', 'Test Template');
      
      // Reset variables to undefined to test the fallback
      (builder as any).template.variables = undefined;
      
      // This should trigger the fallback: this.template.variables = this.template.variables || {};
      builder.addVariable('department', 'IT');
      
      // Verify variables object was created and variable was added
      expect((builder as any).template.variables).toEqual({
        department: 'IT'
      });
    });

    it('should handle addMetadata when metadata object is undefined', () => {
      const builder = new PermissionTemplateBuilder('test-id', 'Test Template');
      
      // Initially, metadata should be undefined
      expect((builder as any).template.metadata).toBeUndefined();
      
      // This should trigger the fallback: this.template.metadata = this.template.metadata || {};
      builder.addMetadata('version', '1.0');
      
      // Verify metadata object was created and metadata was added
      expect((builder as any).template.metadata).toEqual({
        version: '1.0'
      });
    });

    it('should append to existing permissions array', () => {
      const builder = new PermissionTemplateBuilder('test-id', 'Test Template');
      
      // Add first permission to create the array
      builder.addPermission('read:documents');
      
      // Add second permission - should append, not replace
      builder.addPermission('write:documents');
      
      expect((builder as any).template.permissions).toEqual([
        { permission: 'read:documents', conditions: undefined },
        { permission: 'write:documents', conditions: undefined }
      ]);
    });

    it('should append to existing variables object', () => {
      const builder = new PermissionTemplateBuilder('test-id', 'Test Template');
      
      // Add first variable to create the object
      builder.addVariable('department', 'IT');
      
      // Add second variable - should append, not replace
      builder.addVariable('level', 'senior');
      
      expect((builder as any).template.variables).toEqual({
        department: 'IT',
        level: 'senior'
      });
    });

    it('should append to existing metadata object', () => {
      const builder = new PermissionTemplateBuilder('test-id', 'Test Template');
      
      // Add first metadata to create the object
      builder.addMetadata('version', '1.0');
      
      // Add second metadata - should append, not replace
      builder.addMetadata('author', 'system');
      
      expect((builder as any).template.metadata).toEqual({
        version: '1.0',
        author: 'system'
      });
    });
  });
}); 