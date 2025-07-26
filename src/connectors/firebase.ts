import {
  User,
  Group,
  Role,
  UserAssignment,
  PermissionTemplate,
  DatabaseConnector
} from '../core/types';

// Firebase types (will be available when firebase is installed)
type Firestore = any;
type DocumentSnapshot = any;

/**
 * Firebase Firestore connector for Gatekeeper RBAC
 * Supports both client-side (firebase) and server-side (firebase-admin)
 */
export class FirebaseConnector implements DatabaseConnector {
  private db: Firestore;
  private collections: {
    users: string;
    groups: string;
    roles: string;
    assignments: string;
    templates: string;
  };

  constructor(
    firestore: Firestore,
    collections: {
      users?: string;
      groups?: string;
      roles?: string;
      assignments?: string;
      templates?: string;
    } = {}
  ) {
    this.db = firestore;
    this.collections = {
      users: 'rbac_users',
      groups: 'rbac_groups',
      roles: 'rbac_roles',
      assignments: 'rbac_assignments',
      templates: 'rbac_templates',
      ...collections
    };
  }

  // User operations
  async getUser(userId: string): Promise<User | null> {
    try {
      const doc = await this.db
        .collection(this.collections.users)
        .doc(userId)
        .get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as User;
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  }

  async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const now = new Date();
      const userData = {
        ...user,
        createdAt: now,
        updatedAt: now
      };

      await this.db
        .collection(this.collections.users)
        .doc(user.id)
        .set(userData);

      return userData as User;
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.db
        .collection(this.collections.users)
        .doc(userId)
        .update(updateData);

      const updatedUser = await this.getUser(userId);
      if (!updatedUser) {
        throw new Error('User not found after update');
      }

      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // Also delete user assignment
      await this.deleteUserAssignment(userId);
      
      await this.db
        .collection(this.collections.users)
        .doc(userId)
        .delete();
    } catch (error) {
      throw new Error(`Failed to delete user: ${error}`);
    }
  }

  // Group operations
  async getGroup(groupId: string): Promise<Group | null> {
    try {
      const doc = await this.db
        .collection(this.collections.groups)
        .doc(groupId)
        .get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Group;
    } catch (error) {
      throw new Error(`Failed to get group: ${error}`);
    }
  }

  async createGroup(group: Omit<Group, 'createdAt' | 'updatedAt'>): Promise<Group> {
    try {
      const now = new Date();
      const groupData = {
        ...group,
        createdAt: now,
        updatedAt: now
      };

      await this.db
        .collection(this.collections.groups)
        .doc(group.id)
        .set(groupData);

      return groupData as Group;
    } catch (error) {
      throw new Error(`Failed to create group: ${error}`);
    }
  }

  async updateGroup(groupId: string, updates: Partial<Group>): Promise<Group> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.db
        .collection(this.collections.groups)
        .doc(groupId)
        .update(updateData);

      const updatedGroup = await this.getGroup(groupId);
      if (!updatedGroup) {
        throw new Error('Group not found after update');
      }

      return updatedGroup;
    } catch (error) {
      throw new Error(`Failed to update group: ${error}`);
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    try {
      await this.db
        .collection(this.collections.groups)
        .doc(groupId)
        .delete();
    } catch (error) {
      throw new Error(`Failed to delete group: ${error}`);
    }
  }

  async getGroupsByUserId(userId: string): Promise<Group[]> {
    try {
      const assignment = await this.getUserAssignment(userId);
      if (!assignment) {
        return [];
      }

      const groups: Group[] = [];
      for (const groupId of assignment.groupIds) {
        const group = await this.getGroup(groupId);
        if (group) {
          groups.push(group);
        }
      }

      return groups;
    } catch (error) {
      throw new Error(`Failed to get groups for user: ${error}`);
    }
  }

  // Role operations
  async getRole(roleId: string): Promise<Role | null> {
    try {
      const doc = await this.db
        .collection(this.collections.roles)
        .doc(roleId)
        .get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Role;
    } catch (error) {
      throw new Error(`Failed to get role: ${error}`);
    }
  }

  async createRole(role: Omit<Role, 'createdAt' | 'updatedAt'>): Promise<Role> {
    try {
      const now = new Date();
      const roleData = {
        ...role,
        createdAt: now,
        updatedAt: now
      };

      await this.db
        .collection(this.collections.roles)
        .doc(role.id)
        .set(roleData);

      return roleData as Role;
    } catch (error) {
      throw new Error(`Failed to create role: ${error}`);
    }
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.db
        .collection(this.collections.roles)
        .doc(roleId)
        .update(updateData);

      const updatedRole = await this.getRole(roleId);
      if (!updatedRole) {
        throw new Error('Role not found after update');
      }

      return updatedRole;
    } catch (error) {
      throw new Error(`Failed to update role: ${error}`);
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    try {
      await this.db
        .collection(this.collections.roles)
        .doc(roleId)
        .delete();
    } catch (error) {
      throw new Error(`Failed to delete role: ${error}`);
    }
  }

  // Assignment operations
  async getUserAssignment(userId: string): Promise<UserAssignment | null> {
    try {
      const doc = await this.db
        .collection(this.collections.assignments)
        .doc(userId)
        .get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        userId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as UserAssignment;
    } catch (error) {
      throw new Error(`Failed to get user assignment: ${error}`);
    }
  }

  async createUserAssignment(
    assignment: Omit<UserAssignment, 'createdAt' | 'updatedAt'>
  ): Promise<UserAssignment> {
    try {
      const now = new Date();
      const assignmentData = {
        ...assignment,
        createdAt: now,
        updatedAt: now
      };

      await this.db
        .collection(this.collections.assignments)
        .doc(assignment.userId)
        .set(assignmentData);

      return assignmentData as UserAssignment;
    } catch (error) {
      throw new Error(`Failed to create user assignment: ${error}`);
    }
  }

  async updateUserAssignment(
    userId: string,
    updates: Partial<UserAssignment>
  ): Promise<UserAssignment> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.db
        .collection(this.collections.assignments)
        .doc(userId)
        .update(updateData);

      const updatedAssignment = await this.getUserAssignment(userId);
      if (!updatedAssignment) {
        throw new Error('User assignment not found after update');
      }

      return updatedAssignment;
    } catch (error) {
      throw new Error(`Failed to update user assignment: ${error}`);
    }
  }

  async deleteUserAssignment(userId: string): Promise<void> {
    try {
      await this.db
        .collection(this.collections.assignments)
        .doc(userId)
        .delete();
    } catch (error) {
      throw new Error(`Failed to delete user assignment: ${error}`);
    }
  }

  // Template operations
  async getTemplate(templateId: string): Promise<PermissionTemplate | null> {
    try {
      const doc = await this.db
        .collection(this.collections.templates)
        .doc(templateId)
        .get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PermissionTemplate;
    } catch (error) {
      throw new Error(`Failed to get template: ${error}`);
    }
  }

  async createTemplate(
    template: Omit<PermissionTemplate, 'createdAt' | 'updatedAt'>
  ): Promise<PermissionTemplate> {
    try {
      const now = new Date();
      const templateData = {
        ...template,
        createdAt: now,
        updatedAt: now
      };

      await this.db
        .collection(this.collections.templates)
        .doc(template.id)
        .set(templateData);

      return templateData as PermissionTemplate;
    } catch (error) {
      throw new Error(`Failed to create template: ${error}`);
    }
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<PermissionTemplate>
  ): Promise<PermissionTemplate> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.db
        .collection(this.collections.templates)
        .doc(templateId)
        .update(updateData);

      const updatedTemplate = await this.getTemplate(templateId);
      if (!updatedTemplate) {
        throw new Error('Template not found after update');
      }

      return updatedTemplate;
    } catch (error) {
      throw new Error(`Failed to update template: ${error}`);
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.db
        .collection(this.collections.templates)
        .doc(templateId)
        .delete();
    } catch (error) {
      throw new Error(`Failed to delete template: ${error}`);
    }
  }

  async listTemplates(): Promise<PermissionTemplate[]> {
    try {
      const snapshot = await this.db
        .collection(this.collections.templates)
        .get();

      const templates: PermissionTemplate[] = [];
      snapshot.forEach((doc: DocumentSnapshot) => {
        const data = doc.data();
        templates.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as PermissionTemplate);
      });

      return templates;
    } catch (error) {
      throw new Error(`Failed to list templates: ${error}`);
    }
  }
}

/**
 * Helper function to create Firebase connector with common configurations
 */
export function createFirebaseConnector(
  firestore: Firestore,
  options?: {
    collections?: {
      users?: string;
      groups?: string;
      roles?: string;
      assignments?: string;
      templates?: string;
    };
  }
): FirebaseConnector {
  return new FirebaseConnector(firestore, options?.collections);
}