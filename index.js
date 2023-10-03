const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)

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

    // reiviews apis
    app.get('/reviews', async (req, res) => {
      const result = await reviewsDataCollection.find({}).toArray();
      res.send(result)
    })


    app.get('/admin/state', varifyJwtMiddleWare, adminVeryfyMiddleWare, async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const products = await allFoodMenuDataCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      const payments = await paymentCollection.find({}).toArray();
      const revenue = payments.reduce(((sum, item) => sum + item.price), 0);

      res.send({
        revenue,
        users,
        products,
        orders
      })
    })


    // --------- 
    app.get('/order-state', varifyJwtMiddleWare, adminVeryfyMiddleWare, async (req, res) => {
      // Step 1: Load all payments
      const payments = await paymentCollection.find({}).toArray();
      const menu = await allFoodMenuDataCollection.find({}).toArray();

      // Step 2, 3, 4: Match, Extract MenuItems, and Put them in an array
      const allOrderedItems = payments.flatMap(payment => {
        const orderItems = payment.foodItemId;
        const matchedMenuItems = orderItems.map(orderItemId => {
          const matchingMenu = menu.find(menuItem => menuItem._id.equals(new ObjectId(orderItemId)));
          return matchingMenu;
        });
        return matchedMenuItems;
      });

      // Step 5: Separate allOrderedItems by category using filter
      const separatedItemsByCategory = {};
      allOrderedItems.forEach(item => {
        if (!separatedItemsByCategory[item.category]) {
          separatedItemsByCategory[item.category] = [];
        }
        separatedItemsByCategory[item.category].push(item);
      });

      // Step 6: Get the quantity using length and calculate total price for each category
      const categoryTotals = [];
      Object.keys(separatedItemsByCategory).forEach(category => {
        const itemCount = separatedItemsByCategory[category].length;
        const total = separatedItemsByCategory[category].reduce((total, item) => total + item.price, 0).toFixed(2);
        categoryTotals.push({
          count: itemCount,
          category: category,
          total: total
        });
      });

      // Response with the processed data
      res.json(categoryTotals);
    });

    // --------- pipline but curss server ---- 
    /*  
       app.get('/lola', async (req, res) => {
          const categoryTotals = await paymentCollection.aggregate([
            {
                $lookup: {
                    from: "allFoodMenuDataCollection",
                    localField: "foodItemId",
                    foreignField: "_id",
                    as: "menuItems"
                }
            },
            {
                $unwind: "$menuItems"
            },
            {
                $group: {
                    _id: "$menuItems.category",
                    count: { $sum: 1 },
                    total: { $sum: "$menuItems.price" }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: "$_id",
                    count: 1,
                    total: { $toFixed: ["$total", 2] }
                }
            }
        ]).toArray();
        res.json(categoryTotals);
      }); */

    /* 
      
    /* ================= danger================= */



    // Secoraty Layer  , varifyjwt ,
    // email same 
    // check admin 

    //  user/admin check
    app.get('/isAdmin/:email', varifyJwtMiddleWare, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = email;
      if (decodedEmail !== email) {
        return res.status(403).send({ error: true, message: 'forbidden acces' })
      }
      const user = await usersCollection.findOne({ emailUser: email });
      console.log('===================== user ',user);
      const isAdmin = { admin: user?.role === "admin" };
      console.log(isAdmin, '====== isAdmin');
      res.send(isAdmin)
    })

    // payment history page user

    app.get("/payment/history/:email", async (req, res) => {
      const email = req.params.email;
      console.log('email for history pge'.email);
      const result = await paymentCollection
        .find({ emailUser: email })
        .toArray();
      console.log('history result', result);
      res.send(result);
    });


    // payment  first
    // Create a PaymentIntent with the order amount and currency
    app.post("/create-payment-intent", varifyJwtMiddleWare, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
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

    // ============= payment second

    app.post('/payments', varifyJwtMiddleWare, async (req, res) => {
      const payment = req.body;
      const insertedResult = await paymentCollection.insertOne(payment);
      const query = { _id: { $in: payment.cartItemId.map(itemId => new ObjectId(itemId)) } }
      const deletedItem = await cartDataCollection.deleteMany(query)
      res.send({ insertedResult, deletedItem })
    })

    // Token send cilent side and playload emial data set
    app.post('/user/tokenSet', async (req, res) => {
      const playloadBody = req.body;
      const token = jwt.sign(playloadBody, process.env.ACCESS_SECRET_TOKEN_USER, { expiresIn: '1h' })
      console.log('token me', token);
      res.send({ token })
    })

    // users/roleSet : updated route apis 
    app.patch("/users/roleSet/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ emailUser: email });
      console.log('user role set',user);
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
      // console.log(bodyUser);
      console.log(bodyUser.emailUser);

      const filterEmail = { emailUser: bodyUser.emailUser };

      // console.log('filterEamil-->', filterEmail);
      const existUser = await usersCollection.findOne(filterEmail);

      // console.log('existUesr-->', existUser);

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
    /*  app.post('/cart/addItem', async (req, res) => {
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
     }) */

    app.post('/cart/addItem', async (req, res) => {
      const clientBody = req.body;
      const query = { foodItemId: clientBody.foodItemId };
      const addDb = await cartDataCollection.insertOne(clientBody)
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
      res.send("BD Pannda Express running !");
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


/* ================= danger================= */
/**
   * ---------------
   * todo: pizza koto gula total pizza price 
   * BANGLA SYSTEM(second best solution)
   * ---------------
   * load all payments
   * 2. for each payment, get the menuItems array
   * 3. for each item in the menuItems array get the menuItem from the menu collection
   * 4. put them in an array: allOrderedItems
   * 5. separate allOrderedItems by category using filter
   * 6. now get the quantity by using length: pizzas.length
   * 7. for each category use reduce to get the total amount spent on this category 1.
   * 
   * ------------------ 
   *   lookup: jion kora
unknown: koje ber kora
group: filter kora alada alada bag kore
project: seleck kora ei flied gla nemo
  */