'use strict';

const bcrypt = require('bcryptjs');
const { UnauthorizedError } = require('../utils/errors');
const { ROLES } = require('../config/permissions');

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async login(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await this.userRepository.updateLastLogin(user.id);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
  }

  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  async createAdmin({ email, password, fullName }) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = await this.hashPassword(password);
    return this.userRepository.createUser({
      email,
      passwordHash,
      role: ROLES.ADMIN,
      fullName,
    });
  }

  sanitizeUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
  }
}

module.exports = AuthService;
