import crypto from 'crypto';

/**
 * User role
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * User information
 */
export interface User {
  /** The user ID */
  id: string;
  /** The username */
  username: string;
  /** The hashed password */
  passwordHash: string;
  /** The user's role */
  role: UserRole;
  /** The API key for the user */
  apiKey?: string;
}

/**
 * Authentication options
 */
export interface AuthOptions {
  /** Whether authentication is enabled */
  enabled?: boolean;
  /** The secret key used for token signing */
  secretKey?: string;
  /** The token expiration time in seconds */
  tokenExpirationSeconds?: number;
}

/**
 * Authentication service
 */
export class AuthService {
  private users: Map<string, User> = new Map();
  private apiKeys: Map<string, string> = new Map(); // apiKey -> userId
  private enabled: boolean;
  private secretKey: string;
  private tokenExpirationSeconds: number;

  /**
   * Create a new authentication service
   * @param options Authentication options
   */
  constructor(options: AuthOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.secretKey = options.secretKey ?? crypto.randomBytes(32).toString('hex');
    this.tokenExpirationSeconds = options.tokenExpirationSeconds ?? 3600; // 1 hour
  }

  /**
   * Enable or disable authentication
   * @param enabled Whether authentication is enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if authentication is enabled
   * @returns True if authentication is enabled, false otherwise
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create a new user
   * @param username The username
   * @param password The password
   * @param role The user's role
   * @returns The created user
   */
  createUser(username: string, password: string, role: UserRole = UserRole.USER): User {
    if (this.getUserByUsername(username)) {
      throw new Error(`User ${username} already exists`);
    }

    const id = crypto.randomUUID();
    const passwordHash = this.hashPassword(password);
    const apiKey = crypto.randomBytes(32).toString('hex');

    const user: User = {
      id,
      username,
      passwordHash,
      role,
      apiKey,
    };

    this.users.set(id, user);
    this.apiKeys.set(apiKey, id);

    return user;
  }

  /**
   * Get a user by ID
   * @param id The user ID
   * @returns The user, or undefined if not found
   */
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  /**
   * Get a user by username
   * @param username The username
   * @returns The user, or undefined if not found
   */
  getUserByUsername(username: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  /**
   * Get a user by API key
   * @param apiKey The API key
   * @returns The user, or undefined if not found
   */
  getUserByApiKey(apiKey: string): User | undefined {
    const userId = this.apiKeys.get(apiKey);
    if (!userId) {
      return undefined;
    }
    return this.getUser(userId);
  }

  /**
   * Authenticate a user with username and password
   * @param username The username
   * @param password The password
   * @returns The user if authentication is successful, undefined otherwise
   */
  authenticate(username: string, password: string): User | undefined {
    const user = this.getUserByUsername(username);
    if (!user) {
      return undefined;
    }

    const passwordHash = this.hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      return undefined;
    }

    return user;
  }

  /**
   * Authenticate a user with an API key
   * @param apiKey The API key
   * @returns The user if authentication is successful, undefined otherwise
   */
  authenticateWithApiKey(apiKey: string): User | undefined {
    return this.getUserByApiKey(apiKey);
  }

  /**
   * Generate a token for a user
   * @param user The user
   * @returns The generated token
   */
  generateToken(user: User): string {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + this.tokenExpirationSeconds,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = this.sign(payloadBase64);

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Verify a token
   * @param token The token to verify
   * @returns The user if the token is valid, undefined otherwise
   */
  verifyToken(token: string): User | undefined {
    if (!token) {
      return undefined;
    }

    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) {
      return undefined;
    }

    // Verify the signature
    const expectedSignature = this.sign(payloadBase64);
    if (signature !== expectedSignature) {
      return undefined;
    }

    try {
      // Decode the payload
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

      // Check if the token has expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return undefined;
      }

      // Get the user
      return this.getUser(payload.userId);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Hash a password
   * @param password The password to hash
   * @returns The hashed password
   */
  private hashPassword(password: string): string {
    return crypto.createHmac('sha256', this.secretKey).update(password).digest('hex');
  }

  /**
   * Sign a payload
   * @param payload The payload to sign
   * @returns The signature
   */
  private sign(payload: string): string {
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }
}

// Create a default authentication service instance
export const authService = new AuthService();
