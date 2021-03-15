const ObjectID = require("mongodb").ObjectID;
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
mongoose.connect(
  process.env.DB,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  }
);

const schema = new mongoose.Schema({
  text: {type:String, required:true},
  created_on: {type:Date, required:true},
  bumped_on: {type:Date, required:true},
  reported: {type:Boolean, default:"false"},
  delete_password: {type:String, required:true},
  replies: []
});

const saltRounds = 10;

const error = "ERROR!";


function Handler() {
  this.tpost = (req, res) => {
    let board = req.params.board;
    let rb = req.body;
    let model = mongoose.model(board, schema);
    let date = new Date();
    new model({
      text: rb.text,
      created_on: date,
      bumped_on: date,
      delete_password: bcrypt.hashSync(rb.delete_password,saltRounds)
    }).save((err, data) => {
      if (data===null || err) {
        res.send(err);
      } else {
        res.redirect(`/b/${board}/${data._id}`);
      }
    });
  }

  this.tget = (req, res) => {
    let model = mongoose.model(req.params.board, schema);
    model
    .find({})
    .select("-reported -delete_password")
    .sort({bumped_on: -1})
    .limit(10)
    .exec((err, data) => {
      data.forEach(i => {
        i.replies = i.replies.slice(Math.max(i.replies.length-3,0));
        i.replies.forEach(j => {
          delete j.reported;
          delete j.delete_password;
        });
      });
      res.send(data);
    });
  }

  this.tdelete = (req, res) => {
    let rb = req.body;
    let model = mongoose.model(req.params.board, schema);
    model.findById(rb.thread_id, (err,data) => {
      if (data===null || err) {
        res.send(error);
      } else if (bcrypt.compareSync(rb.delete_password,data.delete_password)) {
        model.findByIdAndDelete(rb.thread_id, (err2, d2) => {
          if (d2===null || err2) {
            res.send(error);
          } else {
            res.send("success");
          }
        });
      } else {
        res.send("incorrect password");
      }
    });
  }

  this.tput = (req, res) => {
    let rb = req.body;
    let model = mongoose.model(req.params.board, schema);
    model.findByIdAndUpdate(rb.thread_id, {reported:true}, (err, data) => {
      if (data===null || err) {
        res.send("id not found");
      } else {
        res.send("success");
      }
    });
  }

  this.rpost = (req, res) => {
    let board = req.params.board;
    let rb = req.body;
    let model = mongoose.model(board, schema);
    let date_n = new Date();
    let obj = {
      _id: new ObjectID(),
      text: rb.text,
      created_on: date_n,
      delete_password: bcrypt.hashSync(rb.delete_password,saltRounds),
      reported: false
    }
    model.findByIdAndUpdate(
      rb.thread_id,
      {$push: {replies:obj},
      bumped_on: date_n},
      (err, data) => {
        if (data===null || err) {
          res.send("id not found");
        } else {
          res.redirect(`/b/${board}/${rb.thread_id}`);
        }
      }
    );
  }

  this.rget = (req, res) => {
    let model = mongoose.model(req.params.board, schema);
    model.findById(req.query.thread_id)
    .select("-reported -delete_password")
    .exec((err, data) => {
      if (data===null || err) {
        res.send("id not found");
      } else {
        data.replies.forEach(i => {
          delete i.reported;
          delete i.delete_password;
        });
        res.send(data);
      }
    });
  }

  this.rdelete = (req, res) => {
    let rb = req.body;
    let model = mongoose.model(req.params.board, schema);
    model.findById(rb.thread_id, (err,data) => {
      if (data===null || err) {
        res.send("thread id not found");
      } else {
        let reply = data.replies.find(obj => {return obj._id==rb.reply_id});
        if (reply === undefined) {
          res.send("reply id not found");
        } else if (bcrypt.compareSync(rb.delete_password,reply.delete_password)) {
          model.findOneAndUpdate(
            {_id:rb.thread_id, "replies._id":new ObjectID(rb.reply_id)},
            {$set: {"replies.$.text":"[deleted]"}},
            (err2, d2) => {
              if (d2===null || err2) {
                res.send(error);
              } else {
                res.send("success");
              }
            }
          );
        } else {
          res.send("incorrect password");
        }
      }
    });
  }

  this.rput = (req, res) => {
    let rb = req.body;
    let model = mongoose.model(req.params.board, schema);
    model.findOneAndUpdate(
      {_id:rb.thread_id, "replies._id":new ObjectID(rb.reply_id)},
      {$set: {"replies.$.reported":true}},
      (err, data) => {
        if (data===null || err) {
          res.send(error);
        } else {
          res.send("success");
        }
      }
    );
  }
}


module.exports = Handler;