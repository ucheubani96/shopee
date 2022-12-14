'use strict';
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Role = use('App/Models/Role');

class Customer {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle({ auth, response }, next) {
    // call next to advance the request
    const role_id = auth.current.user.role_id;
    const role = await Role.findBy('id', role_id);

    if (role.role_label == 'Customer') {
      await next();
    } else {
      return response.status(401).send({
        status_code: 401,
        status: 'Unauthorize Access',
        message: 'You dont have access to perform this action.',
      });
    }
  }
}

module.exports = Customer;
