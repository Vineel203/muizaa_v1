'use strict';

const { body } = require('express-validator');
const { getContainer } = require('../config/container');
const sessionConfig = require('../config/session');
const { validateRequest } = require('../middlewares/validationMiddleware');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class AuthController {
  constructor() {
    const { authService } = getContainer().services;
    this.authService = authService;
  }

  showLogin(req, res) {
    res.render('auth/login', {
      title: 'Login',
      layout: 'layouts/auth',
      error: null,
      email: '',
    });
  }

  login = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest,
    async (req, res, next) => {
      try {
        const { email, password, remember } = req.body;
        const user = await this.authService.login(email, password);

        req.session.user = this.authService.sanitizeUser(user);

        if (remember === 'on' || remember === true) {
          req.session.cookie.maxAge = sessionConfig.rememberMaxAge;
        } else {
          req.session.cookie.maxAge = sessionConfig.maxAge;
        }

        await new Promise((resolve, reject) => {
          req.session.save((err) => (err ? reject(err) : resolve()));
        });

        return res.redirect('/dashboard');
      } catch (error) {
        if (error.statusCode === 401) {
          return res.status(401).render('auth/login', {
            title: 'Login',
            layout: 'layouts/auth',
            error: error.message,
            email: req.body.email,
          });
        }

        if (error instanceof ValidationError) {
          return res.status(422).render('auth/login', {
            title: 'Login',
            layout: 'layouts/auth',
            error: error.message,
            email: req.body.email,
          });
        }

        logger.error('Login failed', {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });

        return res.status(500).render('auth/login', {
          title: 'Login',
          layout: 'layouts/auth',
          error: 'Unable to sign in right now. Please try again shortly.',
          email: req.body.email,
        });
      }
    },
  ];

  logout(req, res) {
    req.session.destroy(() => {
      res.clearCookie(sessionConfig.name);
      res.redirect('/login');
    });
  }
}

module.exports = AuthController;
