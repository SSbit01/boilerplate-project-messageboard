'use strict';
const handler = require("../controllers/handler.js");

module.exports = function (app) {
  const Handler = new handler();

  app.route('/api/threads/:board')
  .post(Handler.tpost)
  .get(Handler.tget)
  .delete(Handler.tdelete)
  .put(Handler.tput);


  app.route('/api/replies/:board')
  .post(Handler.rpost)
  .get(Handler.rget)
  .delete(Handler.rdelete)
  .put(Handler.rput);
};