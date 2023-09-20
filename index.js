const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

//
require("dotenv").config();
let jwt = require('jsonwebtoken');

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

/* Jwt veryfy middleware  */
const varifyJwtMiddleWare = (req, res, next) => {
  const header = req.headers.authorizatoin;
  if (!header) {
    return res.status(401).send({ error: true, message: 'unAuthorization header a br token nai' })
  }

  const token = header.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN_USER, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unAuthorization token bad ba experier' })
    }
    req.decoded = decoded;
    // console.log('just onely req--->',req);
    console.log('middleware veryfy funciton now--->', req.decoded = decoded);
    next()
  })
  // 
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client
      .db("bd_hotel_food_delivery")
      .collection("users");

    const allFoodMenuDataCollection = client
      .db("bd_hotel_food_delivery")
      .collection("foodItemMenu");
    const reviewsDataCollection = client
      .db("bd_hotel_food_delivery")
      .collection("reviewsData");

    const cartDataCollection = client
      .db("bd_hotel_food_delivery")
      .collection("carts");


    // Token send cilent side and playload emial data set
    app.post('/user/tokenSet', async (req, res) => {
      const playloadBody = req.body;
      const token = jwt.sign(playloadBody, process.env.ACCESS_SECRET_TOKEN_USER, { expiresIn: '1h' })
      res.send({ token })
    })

    // users/roleSet
    app.patch("/users/roleSet/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ emailUser: email });
      if (user.role === 'admin') {
        return res.send({ message: "this is all ready admin" })
      }
      const updatedRole = await usersCollection.updateOne({ emailUser: email }, { $set: { role: 'admin' } });
      res.send(updatedRole)
    });


    // single users deleted  apis
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const deletedResult = await usersCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(deletedResult)
    })
    // users releted apis
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find({}).toArray();
      res.send(result)
    })

    // user updated emali users releted apis
    app.post('/users', async (req, res) => {
      const clintBody = req.body;
      const existUserEmail = { emailuser: clintBody.emailuser };
      const existUser = await usersCollection.findOne(existUserEmail);
      if (existUser) {
        return res.send({ message: 'user already exist' })
      }
      const add = await usersCollection.insertOne(clintBody)
      res.send(add)
    })

    // deleted cart itde .em food 
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      console.log('para id me: ', id);
      const deletedItemDb = await cartDataCollection.deleteOne({ _id: new ObjectId(id) })
      console.log('deletedItemDb me', deletedItemDb);
      res.send(deletedItemDb)
    })

    // cart get all itmes 
    // app.get('/carts', varifyJwtMiddleWare, async (req, res) => {
    app.get('/carts', varifyJwtMiddleWare, async (req, res) => {
      const queryEmail = req.query.email;
      console.log(queryEmail, '---->query email');
      if (!queryEmail) return 'carts get email is not found';

      const decodedEmail = req.decoded.emailUser;
      console.log(decodedEmail, '-->decoded Email');

      if (decodedEmail !== queryEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access not vaid token' })
      }
      const filter = { emailUser: queryEmail }
      const result = await cartDataCollection.find(filter).toArray();
      res.send(result)
    })

    // Add cart 
    app.post('/cart/addItem', async (req, res) => {
      const clientBody = req.body;
      // console.log(clientBody, 'body data'); 
      const query = { foodItemId: clientBody.foodItemId };
      console.log('check id add food: ', query);
      const existId = await cartDataCollection.findOne(query);
      if (existId) {
        console.log('existId id food: ', existId);
        const data = {};
        data.message = 'exist';
        console.log('custom data: ', data);
        return res.send(data)
      }
      //  const addDb = await cartDataCollection.insertOne(client)mistik:cient
      const addDb = await cartDataCollection.insertOne(clientBody)
      console.log(addDb, 'add db logic')
      return res.send(addDb)
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
