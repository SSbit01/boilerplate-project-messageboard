const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);


suite('Functional Tests', function() {
  const board = "tests";

  test("Creating a new thread: POST request to /api/threads/{board}", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text0", delete_password:"test"})
    .end((err, res) => {
      let id = res.res.req.path.slice(9);
      chai.request(server)
      .get(`/api/replies/${board}?thread_id=${id}`)
      .end((err2, res2) => {
        let obj = res2.body;
        assert.isArray(obj.replies);
        assert.equal(obj.replies.length, 0);
        assert.equal(obj._id, id);
        assert.equal(obj.text, "text0");
        assert.equal(obj.created_on, obj.bumped_on);
        done();
      });
    });
  });

  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text1", delete_password:"test"})
    .end((err, res) => {
      let id = res.res.req.path.slice(9);
      chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({thread_id:id, delete_password:"test2"})
      .end((err2, res2) => {
        assert.equal(res2.text, "incorrect password");
        chai.request(server)
        .get(`/api/replies/${board}?thread_id=${id}`)
        .end((err3, res3) => {
          let obj = res3.body;
          assert.isArray(obj.replies);
          assert.equal(obj.replies.length, 0);
          assert.equal(id, obj._id);
          assert.equal(obj.text, "text1");
          assert.equal(obj.created_on, obj.bumped_on);
          done();
        });
      });
    });
  });

  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text2", delete_password:"test"})
    .end((err, res) => {
      let id = res.res.req.path.slice(9);
      chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({thread_id:id, delete_password:"test"})
      .end((err2, res2) => {
        assert.equal(res2.text, "success");
        chai.request(server)
        .get(`/api/replies/${board}?thread_id=${id}`)
        .end((err3, res3) => {
          assert.equal(Object.keys(res3.body).length, 0);
          done();
        });
      });
    });
  });

  test("Reporting a thread: PUT request to /api/threads/{board}", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text3", delete_password:"test"})
    .end((err, res) => {
      let id = res.res.req.path.slice(9);
      chai.request(server)
      .put(`/api/threads/${board}`)
      .send({thread_id:id})
      .end((err2, res2) => {
        assert.equal(res2.text, "success");
        done();
      });
    });
  });

  test("Creating a new reply: POST request to /api/replies/{board}", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text4", delete_password:"test"})
    .end((err, res) => {
      let id = res.res.req.path.slice(9);
      chai.request(server)
      .post(`/api/replies/${board}`)
      .send({thread_id:id, text:"test_r", delete_password:"test"})
      .end((err2, res2) => {
        chai.request(server)
        .get(`/api/replies/${board}?thread_id=${id}`)
        .end((err3, res3) => {
          let obj = res3.body.replies[0];
          assert.isDefined(obj._id);
          assert.isDefined(obj.created_on);
          assert.equal(obj.text, "test_r");
          done();
        });
      });
    });
  });

  test("Deleting a reply with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text5", delete_password:"test"})
    .end((err, res) => {
      let t_id = res.res.req.path.slice(9);
      chai.request(server)
      .post(`/api/replies/${board}`)
      .send({thread_id:t_id, text:"test_r2", delete_password:"test"})
      .end((err2, res2) => {
        chai.request(server)
        .get(`/api/replies/${board}?thread_id=${t_id}`)
        .end((err3, res3) => {
          let r_id = res3.body.replies[0]._id;
          chai.request(server)
          .delete(`/api/replies/${board}`)
          .send({thread_id:t_id, reply_id:r_id, delete_password:"test2"})
          .end((err4, res4) => {
            assert.equal(res4.text, "incorrect password");
            chai.request(server)
            .get(`/api/replies/${board}?thread_id=${t_id}`)
            .end((err5, res5) => {
              let obj = res5.body.replies[0];
              assert.isDefined(obj._id);
              assert.isDefined(obj.created_on);
              assert.equal(obj.text, "test_r2");
              done();
            });
          });
        });
      });
    });
  });

  test("Deleting a reply with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text6", delete_password:"test"})
    .end((err, res) => {
      let t_id = res.res.req.path.slice(9);
      chai.request(server)
      .post(`/api/replies/${board}`)
      .send({thread_id:t_id, text:"test_r3", delete_password:"test"})
      .end((err2, res2) => {
        chai.request(server)
        .get(`/api/replies/${board}?thread_id=${t_id}`)
        .end((err3, res3) => {
          let r_id = res3.body.replies[0]._id;
          chai.request(server)
          .delete(`/api/replies/${board}`)
          .send({thread_id:t_id, reply_id:r_id, delete_password:"test"})
          .end((err4, res4) => {
            assert.equal(res4.text, "success");
            chai.request(server)
            .get(`/api/replies/${board}?thread_id=${t_id}`)
            .end((err5, res5) => {
              assert.equal(res5.body.replies[0].text, "[deleted]");
              done();
            });
          });
        });
      });
    });
  });

  test("Reporting a reply: PUT request to /api/replies/{board}", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text7", delete_password:"test"})
    .end((err, res) => {
      let t_id = res.res.req.path.slice(9);
      chai.request(server)
      .post(`/api/replies/${board}`)
      .send({thread_id:t_id, text:"test_r4", delete_password:"test"})
      .end((err2, res2) => {
        chai.request(server)
        .get(`/api/replies/${board}?thread_id=${t_id}`)
        .end((err3, res3) => {
          let r_id = res3.body.replies[0]._id;
          chai.request(server)
          .put(`/api/replies/${board}`)
          .send({thread_id:t_id, reply_id:r_id})
          .end((err4, res4) => {
            assert.equal(res4.text, "success");
            done();
          });
        });
      });
    });
  });

  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", done => {
    chai.request(server)
    .post(`/api/threads/${board}`)
    .send({text:"text8", delete_password:"test"})
    .end((err, res) => {
      let id = res.res.req.path.slice(9);
      chai.request(server)
      .post(`/api/replies/${board}`)
      .send({thread_id:id, text:"test_r5", delete_password:"test"})
      .end((err2, res2) => {
        chai.request(server)
        .get(`/api/replies/${board}?thread_id=${id}`)
        .end((err3, res3) => {
          let obj = res3.body;
          assert.isUndefined(obj.reported);
          assert.isUndefined(obj.delete_password);
          assert.isDefined(obj._id);
          assert.equal(obj.text, "text8");
          assert.isBelow(new Date(obj.created_on).getTime(), new Date(obj.bumped_on).getTime());
          let reply = res3.body.replies[0];
          assert.equal(Object.keys(reply).length, 3);
          assert.isDefined(reply._id);
          assert.isDefined(reply.created_on);
          assert.equal(reply.text, "test_r5");
          done();
        });
      });
    });
  });

  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", done => {
    chai.request(server)
    .get(`/api/threads/${board}`)
    .end((err, arr) => {
      let body = arr.body;
      assert.isAtMost(body.length, 10);
      for (let i in body) {
        let obj = body[i];
        assert.isArray(obj.replies);
        assert.isAtMost(obj.replies.length, 3);
        assert.isDefined(obj._id);
        assert.isDefined(obj.text);
        assert.isDefined(obj.created_on);
        assert.isDefined(obj.bumped_on);
        assert.isUndefined(obj.reported);
        assert.isUndefined(obj.delete_password);
        for (let j in obj.replies) {
          let reply = obj.replies[j];
          assert.equal(Object.keys(reply).length, 3);
          assert.isDefined(reply._id);
          assert.isDefined(reply.created_on);
          assert.isDefined(reply.text);
        }
      }
      done();
    });
  });
});