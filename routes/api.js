'use strict';
const {thread, reply} = new (require("../controllers/handler.js"))();

module.exports = function(app) {
  app.route('/api/threads/:board')
    .post(thread.post)
    .get(thread.get)
    .delete(thread.delete)
    .put(thread.put);


  app.route('/api/replies/:board')
    .post(reply.post)
    .get(reply.get)
    .delete(reply.delete)
    .put(reply.put);
};