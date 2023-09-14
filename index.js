const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

//
require("dotenv").config();
var jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const uri = "mongodb+srv://bd_boosUser:AejC4UewYztgC0Ts@cluster0.5tob0mc.mongodb.net/?retryWrites=true&w=majority";
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5tob0mc.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5tob0mc.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const allFoodMenuDataCollection = client
      .db("bd_hotel_food_delivery")
      .collection("foodItemMenu");
    const reviewsDataCollection = client
      .db("bd_hotel_food_delivery")
      .collection("reviewsData");

    const cartDataCollection = client
      .db("bd_hotel_food_delivery")
      .collection("carts");
    const usersCollection = client
      .db("bd_hotel_food_delivery")
      .collection("users");

    app.get("/foodMenu", async (req, res) => {
      const menuFoodData = await allFoodMenuDataCollection.find({}).toArray();
      // console.log(menuFoodData);
      res.send(menuFoodData);
    });
    app.get("/review", async (req, res) => {
      const reviewData = await reviewsDataCollection.find({}).toArray();
      // console.log(reviewData);
      res.send(reviewData);
    });

    /* Cart collection */
    app.post("/carts", async (req, res) => {
      const item = req.body;
      console.log("item please", item);
      const result = await cartDataCollection.insertOne(item);
      console.log(result);
      res.send(result);
    });
    
    // no lover 
    const love = 'no lover not interest grial'
    // cart get use spacepic user
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const result = await cartDataCollection
        .find({ emailUser: email })
        .toArray();
      res.send(result);
    });

    // myCart deleted
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const deletedResult = await cartDataCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(deletedResult);
    });

    // users related apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existUser = await usersCollection.findOne(user.email);
      if (existUser) {
        return res.send({ message: "user all ready exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //  all user related apis
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find({}).toArray();
      res.send(users);
    });

    // user role update  related apis //
    app.patch("/users/admin/:email", async (req, res) => {
      console.log("para -->", req.params.email);
      const findUser = await usersCollection.findOne({
        email: req.params.email,
      });
      if (!findUser) {
        return res.send({ message: "user email not found" });
      }
      console.log("findUser me-->", findUser);
      const updateUser = await usersCollection.updateOne(
        {
          email: req.params.email,
        },
        {
          $set: { role: "admin" },
        }
      );
      res.send(updateUser);
    });

    //   user deleted related apis
    app.delete("/users/:id", async (req, res) => {
      const deletedUser = await usersCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      console.log("deletedUser ->", deletedUser);
      res.send(deletedUser);
    });

    // Token user client side || why pot jhn kar sr I no //
    /*     app.get("/token/:email", (req, res) => {
      console.log("token email -->", req.params.email);
      const serverTokenUser = jwt.sign(
        {
          email: req.params.email,
        },
        process.env.ACCESS_SECRET_TOKEN_USER,
        { expiresIn: "12h" }
      );
      res.send({ token: serverTokenUser });
    }); */
    // same code get pot difference why...

    app.post("/jwt/token", (req, res) => {
      const user = req.body;
      console.log("user body token jwt -->", user);
      const serverTokenUser = jwt.sign(
        {
          user,
        },
        process.env.ACCESS_SECRET_TOKEN_USER,
        { expiresIn: "12h" }
      );
      console.log("token me ", serverTokenUser);
      res.send({ token: serverTokenUser });
    });

    // home
    app.get("/", (req, res) => {
      res.send("BOOS is Setting !");
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Boos is Sleeping Room https://${port}`);
});
