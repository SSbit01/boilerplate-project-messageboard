const chai = require('chai'),
      chaiHttp = require('chai-http'),
      {assert} = chai,
      //
      {ObjectId} = require("mongodb"),
      {compareSync} = require("bcrypt"),
      //
      server = require('../server');

chai.use(chaiHttp);

const requester = chai.request(server).keepOpen();


suite('Functional Tests', function() {
  const board = "tests";

  test("Creating a new thread: POST request to /api/threads/{board}", done => {
    const text = "test0",
          delete_password = "test1";
    requester
      .post(`/api/threads/${board}`)
      .send({text, delete_password})
      .end((err, {body}) => {
        assert.isString(body._id);
        assert.equal(body.text, text);
        assert.approximately(new Date(body.created_on).getTime(), Date.now(), 5000);
        assert.equal(body.created_on, body.bumped_on);
        assert.isFalse(body.reported);
        assert.isTrue(compareSync(delete_password, body.delete_password));
        assert.isArray(body.replies);
        assert.lengthOf(body.replies, 0);
        done();
      });
  });

  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", done => {
    requester
      .post(`/api/threads/${board}`)
      .send({text: "test0", delete_password: "test1"})
      .end((err, {body: {_id: thread_id}}) => {
        requester
          .delete(`/api/threads/${board}`)
          .send({thread_id, delete_password: "test2"})
          .end((err, {text}) => {
            assert.equal(text, "incorrect password");
            requester
              .get(`/api/replies/${board}`)
              .query({thread_id})
              .end((err, {body}) => {
                assert.isNotNull(body);
                assert.isNotEmpty(body);
                done();
              });
          });
      });
  });

  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", done => {
    const delete_password = "test1";
    requester
      .post(`/api/threads/${board}`)
      .send({text: "test0", delete_password})
      .end((err, {body: {_id: thread_id}}) => {
        requester
          .delete(`/api/threads/${board}`)
          .send({thread_id, delete_password})
          .end((err, {text}) => {
            assert.equal(text, "success");
            requester
              .get(`/api/replies/${board}`)
              .query({thread_id})
              .end((err, {body}) => {
                assert.isNull(body);
                done();
              });
          });
      });
  });

  test("Reporting a thread: PUT request to /api/threads/{board}", done => {
    requester
      .post(`/api/threads/${board}`)
      .send({text: "test0", delete_password: "test1"})
      .end((err, {body: {_id: thread_id}}) => {
        requester
          .put(`/api/threads/${board}`)
          .send({thread_id})
          .end((err, {text}) => {
            assert.equal(text, "reported");
            done();
          });
      });
  });

  test("Creating a new reply: POST request to /api/replies/{board}", done => {
    const text = "test_reply",
          delete_password = "test_delete";
    requester
      .post(`/api/threads/${board}`)
      .send({text: "test0", delete_password: "test1"})
      .end((err, {body: {_id: thread_id}}) => {
        requester
          .post(`/api/replies/${board}`)
          .send({thread_id, text, delete_password})
          .end((err, {body}) => {
            assert.isString(body._id);
            assert.equal(body.text, text);
            assert.approximately(new Date(body.created_on).getTime(), Date.now(), 5000);
            assert.isFalse(body.reported);
            assert.isTrue(compareSync(delete_password, body.delete_password));
            done();
          });
      });
  });

  test("Deleting a reply with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", done => {
    requester
      .post(`/api/threads/${board}`)
      .send({text: "test0", delete_password: "test1"})
      .end((err, {body: {_id: thread_id}}) => {
        requester
          .post(`/api/replies/${board}`)
          .send({thread_id, text: "test_r2", delete_password: "test_delete"})
          .end((err, {body: {_id: reply_id}}) => {
            requester
              .delete(`/api/replies/${board}`)
              .send({thread_id, reply_id, delete_password: "test2"})
              .end((err, {text}) => {
                assert.equal(text, "incorrect password");
                requester
                  .get(`/api/replies/${board}`)
                  .query({thread_id})
                  .end((err, {body: {replies: [reply]}}) => {
                    assert.equal(reply._id, reply_id);
                    assert.approximately(new Date(reply.created_on).getTime(), Date.now(), 5000);
                    assert.isString(reply.text);
                    done();
                  });
              });
          });
      });
  });

  test("Deleting a reply with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", done => {
    const delete_password = "test_delete";
    requester
      .post(`/api/threads/${board}`)
      .send({text: "test0", delete_password: "test1"})
      .end((err, {body: {_id: thread_id}}) => {
        requester
          .post(`/api/replies/${board}`)
          .send({thread_id, text: "test_r2", delete_password})
          .end((err, {body: {_id: reply_id}}) => {
            requester
              .delete(`/api/replies/${board}`)
              .send({thread_id, reply_id, delete_password})
              .end((err, {text}) => {
                assert.equal(text, "success");
                requester
                  .get(`/api/replies/${board}`)
                  .query({thread_id})
                  .end((err, {body: {replies: [reply]}}) => {
                    assert.equal(reply.text, "[deleted]");
                    done();
                  });
              });
          });
      });
  });

  test("Reporting a reply: PUT request to /api/replies/{board}", done => {
    requester
      .post(`/api/threads/${board}`)
      .send({text: "test0", delete_password: "test1"})
      .end((err, {body: {_id: thread_id}}) => {
        requester
          .post(`/api/replies/${board}`)
          .send({thread_id, text: "test_r2", delete_password: "test_delete"})
          .end((err, {body: {_id: reply_id}}) => {
            requester
              .put(`/api/replies/${board}`)
              .send({thread_id, reply_id})
              .end((err, {text}) => {
                assert.equal(text, "reported");
                done();
              });
          });
      });
  });

  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", done => {
    const thread_text = "test0",
          reply_text = "test_reply";
    requester
      .post(`/api/threads/${board}`)
      .send({text: thread_text, delete_password: "test"})
      .end((err, {body: {_id: thread_id}}) => {
        requester
          .post(`/api/replies/${board}`)
          .send({thread_id, text: reply_text, delete_password: "test"})
          .end(() => {
            requester
              .get(`/api/replies/${board}`)
              .query({thread_id})
              .end((err, {body}) => {
                assert.doesNotHaveAnyKeys(body, ["reported", "delete_password"]);
                assert.isString(body._id);
                assert.equal(body.text, thread_text);
                assert.isBelow(new Date(body.created_on).getTime(), new Date(body.bumped_on).getTime());
                const [reply] = body.replies;
                assert.doesNotHaveAnyKeys(reply, ["reported", "delete_password"]);
                assert.isString(reply._id);
                assert.approximately(new Date(reply.created_on).getTime(), Date.now(), 5000);
                assert.equal(reply.text, reply_text);
                done();
              });
          });
      });
  });

  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", done => {
    requester
      .get(`/api/threads/${board}`)
      .end((err, {body}) => {
        assert.isAtMost(body.length, 10);
        for (const thread of body) {
          assert.isArray(thread.replies);
          assert.isAtMost(thread.replies.length, 3);
          assert.hasAnyKeys(thread, ["_id", "text", "created_on", "bumped_on"]);
          assert.doesNotHaveAnyKeys(thread, ["reported", "delete_password"]);
          for (const reply of thread.replies) {
            assert.hasAllKeys(reply, ["_id", "text", "created_on"]);
            assert.doesNotHaveAnyKeys(reply, ["reported", "delete_password"]);
          }
        }
        done();
      });
  });
});