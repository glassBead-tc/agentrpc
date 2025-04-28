import { UserRole } from './auth';

/**
 * Access control policy
 */
export interface AccessControlPolicy {
  /** The name of the tool */
  toolName: string;
  /** The roles that are allowed to access the tool */
  allowedRoles: UserRole[];
}

/**
 * Access control service
 */
export class AccessControlService {
  private policies: Map<string, AccessControlPolicy> = new Map();
  private defaultPolicy: AccessControlPolicy = {
    toolName: '*',
    allowedRoles: [UserRole.ADMIN, UserRole.USER],
  };

  /**
   * Create a new access control service
   * @param options Options for the access control service
   */
  constructor(options: { defaultPolicy?: AccessControlPolicy } = {}) {
    if (options.defaultPolicy) {
      this.defaultPolicy = options.defaultPolicy;
    }
  }

  /**
   * Add a policy for a tool
   * @param policy The policy to add
   */
  addPolicy(policy: AccessControlPolicy): void {
    this.policies.set(policy.toolName, policy);
  }

  /**
   * Remove a policy for a tool
   * @param toolName The name of the tool
   * @returns True if the policy was removed, false if it didn't exist
   */
  removePolicy(toolName: string): boolean {
    return this.policies.delete(toolName);
  }

  /**
   * Get the policy for a tool
   * @param toolName The name of the tool
   * @returns The policy for the tool, or the default policy if not found
   */
  getPolicy(toolName: string): AccessControlPolicy {
    return this.policies.get(toolName) || this.defaultPolicy;
  }

  /**
   * Check if a role is allowed to access a tool
   * @param toolName The name of the tool
   * @param role The role to check
   * @returns True if the role is allowed to access the tool, false otherwise
   */
  isAllowed(toolName: string, role: UserRole): boolean {
    // Admins always have access
    if (role === UserRole.ADMIN) {
      return true;
    }

    const policy = this.getPolicy(toolName);
    return policy.allowedRoles.includes(role);
  }

  /**
   * Set the default policy
   * @param policy The default policy
   */
  setDefaultPolicy(policy: AccessControlPolicy): void {
    this.defaultPolicy = policy;
  }

  /**
   * Get the default policy
   * @returns The default policy
   */
  getDefaultPolicy(): AccessControlPolicy {
    return this.defaultPolicy;
  }

  /**
   * Get all policies
   * @returns All policies
   */
  getAllPolicies(): AccessControlPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Clear all policies
   */
  clearPolicies(): void {
    this.policies.clear();
  }
}

// Create a default access control service instance
export const accessControlService = new AccessControlService();
