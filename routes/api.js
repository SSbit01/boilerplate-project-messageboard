const {hashSync, compareSync} = require("bcrypt"),
      {MongoClient, ObjectId} = require("mongodb"),
      //
      DB = new MongoClient(process.env.DB).db();


function encrypt(text, salt = 8) {
  return hashSync(text, salt);
}



module.exports = function(app) {
  
  app.route("/api/threads/:board")
    
    .post(({params: {board}, body: {text, delete_password}}, res) => {
      try {
        const NOW = new Date(),
              RECORD = {
                text,
                created_on: NOW,
                bumped_on: NOW,
                reported: false,
                delete_password: encrypt(delete_password),
                replies: []
              }
        DB.collection(board).insertOne(RECORD, (err, {insertedId}) => {
          if (err) {
            res.json(err);
          } else {
            RECORD._id = insertedId;
            res.json(RECORD);
          }
        });
      } catch {
        res.send("an error occurred");
      }
    })
    
    .get(async({params: {board}}, res) => {
      try {
        res.send(await DB.collection(board).aggregate([{
          $sort: {bumped_on: 1},
        }, {
          $limit: 10
        }, {
          $set: {
            replycount: {$size: "$replies"},
            replies: {$slice: ["$replies", -3]},
          }
        }, {
          $project: {
            delete_password: 0,
            reported: 0,
            "replies.delete_password": 0,
            "replies.reported": 0
          }
        }]).toArray());
      } catch {
        res.send("board not provided");
      }
    })
    
    .delete(({params: {board}, body: {thread_id, delete_password}}, res) => {
      try {
        const COLLECTION = DB.collection(board),
              _id = ObjectId(thread_id);
        COLLECTION.findOne({_id}, {
          projection: {
            _id: 0,
            delete_password: 1
          }
        }, (err, {delete_password: encrypted_password}) => {
          if (err) {
            res.json(err);
          } else if (compareSync(delete_password, encrypted_password)) {
            COLLECTION.deleteOne({_id}, (err, {acknowledged, deletedCount}) => {
              if (err) {
                res.json(err);
              } else if (acknowledged && deletedCount) {
                res.send("success");
              } else {
                res.send("The password is correct but the thread wasn't deleted");
              }
            });
          } else {
            res.send("incorrect password");
          }
        });
      } catch {
        res.send("thread not found");
      }
    })
    
    .put(({params: {board}, body: {thread_id}}, res) => {
      try {
        DB.collection(board).updateOne({_id: ObjectId(thread_id)}, {
          $set: {reported: true}
        }, err => {
          if (err) {
            res.json(err);
          } else {
            res.send("reported");
          }
        });
      } catch {
        res.send("thread not found");
      }
    });

  
  app.route("/api/replies/:board")
    
    .post(({params: {board}, body: {thread_id, text, delete_password}}, res) => {
      try {
        const _id = ObjectId(thread_id),
              NOW = new Date(),
              RECORD = {
                _id: ObjectId(),
                text,
                created_on: NOW,
                delete_password: encrypt(delete_password),
                reported: false
              }
        DB.collection(board).findOneAndUpdate({_id}, {
          $set: {bumped_on: NOW},
          $push: {replies: RECORD}
        }, err => {
          if (err) {
            res.json(err);
          } else {
            res.json(RECORD);
          }
        });
      } catch {
        res.send("thread not found");
      }
    })
    
    .get(({params: {board}, query: {thread_id}}, res) => {
      try {
        DB.collection(board).findOne({_id: ObjectId(thread_id)}, {
          projection: {
            delete_password: 0,
            reported: 0,
            "replies.delete_password": 0,
            "replies.reported": 0
          }
        }, (err, thread) => {
          if (err) {
            res.json(err);
          } else {
            res.json(thread);
          }
        });
      } catch {
        res.send("thread not found");
      }
    })
    
    .delete(({params: {board}, body: {thread_id, reply_id, delete_password}}, res) => {
      try {
       const COLLECTION = DB.collection(board),
              threadId = ObjectId(thread_id),
              replyID = ObjectId(reply_id);
        COLLECTION.findOne({_id: threadId}, {
          projection: {
            _id: 0,
            replies: {
              $elemMatch: {_id: replyID}
            }
          }
        }, async(err, {replies}) => {
          if (err) {
            res.json(err);
          } else if (replies) {
            const [{text, delete_password: encrypted_password}] = replies;
            if (compareSync(delete_password, encrypted_password)) {
              const DELETE_TEXT = "[deleted]";
              if (text != DELETE_TEXT) {
                const {acknowledged, modifiedCount} = await COLLECTION.updateOne({_id: threadId}, {
                  $set: {"replies.$[reply].text": DELETE_TEXT}
                }, {
                  arrayFilters: [{"reply._id": replyID}]
                });
                if (!acknowledged || !modifiedCount) {
                  return res.send("The password is correct but the reply wasn't deleted");
                }
              }
              res.send("success");
            } else {
              res.send("incorrect password");
            }
          } else {
            res.send("reply not found");
          }
        });
      } catch {
        res.send("invalid id");
      }
    })
    
    .put(({params: {board}, body: {thread_id, reply_id}}, res) => {
      try {
        DB.collection(board).updateOne({_id: ObjectId(thread_id)}, {
          $set: {"replies.$[reply].reported": true}
        }, {
          arrayFilters: [{"reply._id": ObjectId(reply_id)}]
        }, (err, {acknowledged, modifiedCount}) => {
          if (err) {
            res.json(err);
          } else if (acknowledged && modifiedCount) {
            res.send("reported");
          } else {
            res.send("reply_id not found");
          }
        });
      } catch {
        res.send("invalid id");
      }
    });

}