'use strict';

const { body } = require('express-validator');
const { getContainer } = require('../config/container');
const sessionConfig = require('../config/session');
const { validateRequest } = require('../middlewares/validationMiddleware');

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

        req.session.save((err) => {
          if (err) return next(err);
          return res.redirect('/dashboard');
        });
      } catch (error) {
        if (error.statusCode === 401) {
          return res.status(401).render('auth/login', {
            title: 'Login',
            layout: 'layouts/auth',
            error: error.message,
            email: req.body.email,
          });
        }
        return next(error);
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
