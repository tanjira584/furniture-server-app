const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://tanjirdemo:${process.env.DB_PASS}@cluster0.3jhfr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

async function run() {
    try {
        await client.connect();
        const productCollection = client
            .db("furnitureWarehouse")
            .collection("products");

        app.get("/products", async (req, res) => {
            const category = req.query.category;
            const subCategory = req.query.subCategory;
            const searchResult = await productCollection
                .find({
                    $or: [{ category: category }, { subCate: subCategory }],
                })
                .toArray();

            if (searchResult.length > 0) {
                res.send(searchResult);
            } else {
                const query = {};
                const cursor = productCollection.find(query);
                const products = await cursor.toArray();
                res.send(products);
            }
        });
        app.get("/product/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });
        app.delete("/product/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });
        app.put("/product/:id", async (req, res) => {
            const id = req.params.id;
            const { quantity } = req.body;

            const { delevered } = req.headers;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            const preQty = parseInt(product.quantity);
            const updQty = delevered ? preQty - 1 : quantity;

            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateProduct = {
                $set: {
                    quantity: updQty,
                },
            };
            const result = await productCollection.updateOne(
                filter,
                updateProduct,
                options
            );
            res.send(result);
        });
        app.post("/products", async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result);
        });
        app.get("/my-items", verifyJwt, async (req, res) => {
            const decodeEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodeEmail) {
                const query = { supplyer: email };
                const cursor = productCollection.find(query);
                const products = await cursor.toArray();
                res.send(products);
            } else {
                res.status(403).send({ message: "Forbiden Access" });
            }
        });
        app.post("/login", async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: "1d",
            });
            res.send({ accessToken });
        });
    } finally {
    }
}
run().catch(console.dir);
function verifyJwt(req, res, next) {
    const bearToken = req.headers.authorization;
    if (!bearToken) {
        return res.status(401).send({ message: "Unauthorize access" });
    }
    const token = bearToken.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Forbiden Access" });
        }
        req.decoded = decoded;
        next();
    });
}
app.get("/", async (req, res) => {
    res.send("I am whourse's home page");
});
app.listen(port, () => {
    console.log("Server running successfully");
});
