const {connect, Schema, model, Error} = require("mongoose");
const bcrypt = require("bcrypt");

connect(
  process.env.DB,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  }
);

const reply_schema = new Schema({
  text: {type:String, required:true},
  reported: {type:Boolean, default:"false"},
  delete_password: {type:String, required:true}
}, {
  timestamps: {
    createdAt: "created_on",
    updatedAt: false
  }
});

const thread_schema = new Schema({
  text: {type:String, required:true},
  reported: {type:Boolean, default:"false"},
  delete_password: {type:String, required:true},
  replies: [reply_schema]
}, {
  timestamps: {
    createdAt: "created_on",
    updatedAt: "bumped_on"
  }
});

const saltRounds = 10;

const error = "ERROR!";


function Handler() {
  this.thread = {
    post(req, res) {
      let board = req.params.board;
      let rb = req.body;
      let Thread = model(board, thread_schema);
      new Thread({
        text: rb.text,
        delete_password: bcrypt.hashSync(rb.delete_password,saltRounds)
      }).save((err, data) => {
        if (data === null || err) {
          res.send(error);
        } else {
          res.redirect(`/b/${board}/${data._id}`);
        }
      });
    },
    get(req, res) {
      let Thread = model(req.params.board, thread_schema);
      Thread
        .find({})
        .limit(10)
        .select("-reported -delete_password -replies.reported -replies.delete_password")
        .sort({bumped_on: -1})
        .exec((err, data) => {
          if (data === null || err) {
            res.send(error);
          } else {
            data.forEach(i => {
              i.replies = i.replies.slice(-3);
            });
            res.send(data);
          }
        });
    },
    delete(req, res) {
      let rb = req.body;
      let Thread = model(req.params.board, thread_schema);
      Thread.findById(rb.thread_id, (err, data) => {
        if (data === null || err) {
          res.send(error);
        } else if (bcrypt.compareSync(rb.delete_password, data.delete_password)) {
          data.remove(err => {
            if (err) {
              res.send(err);
            } else {
              res.send("success")
            }
          });
        } else {
          res.send("incorrect password");
        }
      });
    },
    put(req, res) {
      let rb = req.body;
      let Thread = model(req.params.board, thread_schema);
      Thread.findByIdAndUpdate(rb.thread_id, {reported:true}, {timestamps: false}, (err, data) => {
        if (data === null || err) {
          res.send("id not found");
        } else {
          res.send("success");
        }
      });
    }
  }

  this.reply = {
    post(req, res) {
      let board = req.params.board;
      let {thread_id, text, delete_password} = req.body;
      let Thread = model(board, thread_schema);
      Thread.findByIdAndUpdate(
        thread_id,
        {$push: {replies: {
          text,
          delete_password: bcrypt.hashSync(delete_password, saltRounds)
        }}},
        (err, data) => {
          if (data === null || err) {
            res.send("id not found");
          } else {
            res.redirect(`/b/${board}/${thread_id}`);
          }
        }
      );
    },
    get(req, res) {
      let Thread = model(req.params.board, thread_schema);
      Thread.findById(req.query.thread_id)
        .select("-reported -delete_password -replies.reported -replies.delete_password")
        .exec((err, data) => {
          if (data === null || err) {
            res.send("id not found");
          } else {
            res.send(data);
          }
        });
    },
    delete(req, res) {
      let rb = req.body;
      let Thread = model(req.params.board, thread_schema);
      Thread.findById(rb.thread_id, (err, data) => {
        if (data === null || err) {
          res.send("thread id not found");
        } else {
          let reply = data.replies.id(rb.reply_id);
          if (reply === undefined) {
            res.send("reply id not found");
          } else if (bcrypt.compareSync(rb.delete_password, reply.delete_password)) {
            reply.text = "[deleted]";
            data.save({timestamps: false}, err => {
              if (err) {
                res.send(err);
              } else {
                res.send("success");
              }
            });
          } else {
            res.send("incorrect password");
          }
        }
      });
    },
    put(req, res) {
      let rb = req.body;
      let Thread = model(req.params.board, thread_schema);
      Thread.findOneAndUpdate(
        {_id:rb.thread_id, "replies._id":rb.reply_id},
        {$set: {"replies.$.reported":true}},
        {timestamps: false},
        (err, data) => {
          if (data === null || err) {
            res.send(error);
          } else {
            res.send("success");
          }
        }
      );
    }
  }
}


module.exports = Handler;