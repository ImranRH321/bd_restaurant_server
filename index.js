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

// secreet key  
const stripe = require("stripe")('sk_test_51LLMJnHSBkwSV8IkVhYkhlobH7By7AQ5upvrqFSXq5JHCLurz961vDSdpOQtp3dYcGFugsWffv6HyJXvaB84eohY00TAxsjWWm');

/* Jwt veryfy middleware  */
const varifyJwtMiddleWare = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ error: true, message: 'unAuthorization header a br token nai' })
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN_USER, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unAuthorization token bad ba experier' })
    }
    req.decoded = decoded;
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
    const paymentCollection = client
      .db("bd_hotel_food_delivery")
      .collection("payments");





    const adminVeryfyMiddleWare = async (req, res, next) => {
      const email = req.decoded.emailUser;
      const user = await usersCollection.findOne({ emailUser: email })
      console.log('admin middleware user ase ----- ', user);

      if (user.role !== 'admin') {
        return res.status(401).send({ error: true, message: 'forbidden message user not bad auth pb' })
      }
      console.log('admin next middlware');
      next();
    }




    // Secoraty Layer  , varifyjwt ,
    // email same 
    // check admin 

    // user only allusers route show the problem url just admin show normal user access route qoces then logout and navigate
    //  user/admin 
    app.get('/isAdmin/:email', varifyJwtMiddleWare, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = email;
      if (decodedEmail !== email) {
        return res.status(403).send({ error: true, message: 'forbidden acces' })
      }
      const user = await usersCollection.findOne({ emailUser: email });
      console.log(user, '========== user');
      const isAdmin = { admin: user?.role === "admin" };
      console.log(isAdmin, '====== isAdmin');
      res.send(isAdmin)
    })


    // payment first 
    /*  app.post("/create-payment-intent", varifyJwtMiddleWare, async (req, res) => {
       const { totalPrice } = req.body;
       const amount = totalPrice * 100;
         const paymentIntent = await stripe.paymentIntents.create({
         amount: amount,
         currency: "usd",
          payment_method_types: [
           "card"
         ],
       });
       res.send({
         clientSecret: paymentIntent.client_secret,
       });
     }); */

    // payment save information 
    /*   app.post('/payments', varifyJwtMiddleWare, async (req, res) => {
        const payment = req.body;
        console.log(payment);
        const insertResult = await paymentCollection.insertOne(payment)
        console.log('res', insertResult);
        const query = { _id: { $in: payment.cartItemId.map(cartId => new ObjectId(cartId)) } };
        console.log('qeury me =====', query);
        const deletedResult = await cartDataCollection.deleteMany(query);
        console.log(deletedResult);
        res.send({ insertResult,deletedResult})
      }) */

    // payment visa 
    // Create a PaymentIntent with the order amount and currency
    app.post("/create-payment-intent", varifyJwtMiddleWare, async (req, res) => {
      const { price } = req.body;
      console.log(req.body, 'body');
      const amount = price * 100;
      console.log(price, amount);

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card"
        ],

      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // ============= payment

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      console.log(payment);
      const insertedResult = await paymentCollection.insertOne(payment);
      console.log(insertedResult);
      const query = { _id: { $in: payment.cartItemId.map(itemId => new ObjectId(itemId)) } }
      console.log('query ', query);
      const deletedItem = await cartDataCollection.deleteMany(query)
      console.log('deletedItem', deletedItem);
      res.send({ insertedResult, deletedItem })
    })

    // Token send cilent side and playload emial data set
    app.post('/user/tokenSet', async (req, res) => {
      const playloadBody = req.body;
      const token = jwt.sign(playloadBody, process.env.ACCESS_SECRET_TOKEN_USER, { expiresIn: '1h' })
      res.send({ token })
    })

    // users/roleSet : updated route apis 
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
    app.get('/users', varifyJwtMiddleWare, adminVeryfyMiddleWare, async (req, res) => {
      const result = await usersCollection.find({}).toArray();
      res.send(result)
    })

    // user updated emali users releted apis
    app.post('/users', async (req, res) => {
      const bodyUser = req.body;
      console.log(bodyUser);
      console.log(bodyUser.emailUser);

      const filterEmail = { emailUser: bodyUser.emailUser };

      console.log('filterEamil-->', filterEmail);
      const existUser = await usersCollection.findOne(filterEmail);

      console.log('existUesr-->', existUser);

      if (existUser) {
        return res.send({ message: 'user already exist' })
      }
      const add = await usersCollection.insertOne(bodyUser);
      console.log('new new added now ---> :', add);
      return res.send(add)
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
      const email = req.query.email;
      const varifyEmail = req.decoded.emailUser;
      // console.log('cl-->', email, '----> deco em-->', varifyEmail);
      if (email !== varifyEmail) {
        return res.send({ eror: true, message: 'two email not match forbidden access' })
      }
      const result = await cartDataCollection.find({ emailUser: email }).toArray();
      res.send(result)
    })

    // Add cart 
    app.post('/cart/addItem', async (req, res) => {
      const clientBody = req.body;
      console.log(clientBody, 'check user');
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


    //menu releted apis all items menu
    app.get("/foodMenu", async (req, res) => {
      const menuFoodData = await allFoodMenuDataCollection.find({}).toArray();
      res.send(menuFoodData);
    });
    //  add new item menu releted apis
    app.post('/menu/addItem', varifyJwtMiddleWare, adminVeryfyMiddleWare, async (req, res) => {
      const body = req.body;
      const add = await allFoodMenuDataCollection.insertOne(body);
      res.send(add)
    })

    // manage item deleted apis
    app.delete("/mangeItem/:id", varifyJwtMiddleWare, adminVeryfyMiddleWare, async (req, res) => {
      const id = req.params.id;
      const deltedItem = await allFoodMenuDataCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(deltedItem);
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
