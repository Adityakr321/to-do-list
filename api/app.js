require('dotenv').config({ path: __dirname + '/../.env' }); // Load environment variables from .env file
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/../views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/../public"));

// Log the environment variable to check if it's being read correctly
console.log("MONGODB_URI:", process.env.MONGODB_URI);

// MongoDB Atlas connection with options for stability
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Successfully connected to MongoDB Atlas!");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});


// Schemas and models
const itemSchema = {
  name: String
};

const listSchema = {
  name: String,
  items: [itemSchema]
};

const Item = mongoose.model("Item", itemSchema);
const List = mongoose.model("List", listSchema);

// Default items
const item1 = new Item({
  name: "Welcome to your To-Do List!"
});

const item2 = new Item({
  name: "Hit the + button to add a new Item."
});

const item3 = new Item({
  name: "Check off items once you're done!"
});

const defaultArray = [item1, item2, item3];

// Home route ("/")
app.get("/", function (req, res) {
  Item.find()
    .then((foundItems) => {
      if (foundItems.length === 0) {
        Item.insertMany(defaultArray)
          .then(() => {
            console.log("Default items inserted!");
          })
          .catch((err) => {
            console.log(err);
          });
        res.redirect("/");
      } else {
        res.render("list", { listTitle: "Today", newListItems: foundItems });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

// Handle POST requests ("/")
app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    name: itemName,
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName })
      .then((foundList) => {
        foundList.items.push(item);
        foundList.save();
        res.redirect("/" + listName);
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

// Handle item deletion ("/delete")
app.post("/delete", function (req, res) {
  const checkboxItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndDelete(checkboxItemId)
      .then(() => {
        res.redirect("/");
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkboxItemId } } })
      .then(() => {
        res.redirect("/" + listName);
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

// Dynamic route for custom lists ("/:customListName")
app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({ name: customListName })
    .then(foundList => {
      if (!foundList) {
        const list = new List({
          name: customListName,
          items: defaultArray
        });
        return list.save().then(() => {
          res.redirect("/" + customListName);
        });
      } else {
        res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).send("An error occurred.");
    });
});

// About page route ("/about")
app.get("/about", function (req, res) {
  res.render("about");
});

// Dynamic port for Vercel/Heroku or local port 3000
const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server started on port " + port);
});
