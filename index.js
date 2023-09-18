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


    // cart get all itmes 
    app.get('/carts', async (req, res) => {
      const queryEmail = req.query.email;
      console.log('query email now ::: ', queryEmail);
      const filter = { emailUser: queryEmail }
      console.log('filter miya ', filter);
      const result = await cartDataCollection.find(filter).toArray();
      res.send(result)
    })



    // Add cart 
    app.post('/cart/addItem', async (req, res) => {
      const clientBody = req.body;
      console.log(clientBody, 'body data');
      //  const addDb = await cartDataCollection.insertOne(client)mistik:cient
      const addDb = await cartDataCollection.insertOne(clientBody)
      console.log(addDb)
      res.send(addDb)
    })


    // hotel all Itemt menus list of food menu name and serv
    app.get("/foodMenu", async (req, res) => {
      const menuFoodData = await allFoodMenuDataCollection.find({}).toArray();
      res.send(menuFoodData);
    });

    //TODO:  AKANE REIVEWS DATA ASE MONGODB TE   

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
