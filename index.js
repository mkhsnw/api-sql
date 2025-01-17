import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
import pg from "pg";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
const PORT = process.env.PORT;
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectModule: pg,
});

try {
  sequelize.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

const Store = sequelize.define("Store", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ownerId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: "id",
    },
    allowNull: false,
  },
});

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  discount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  store_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Store,
      key: "id",
    },
    allowNull: false,
  },
});

const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  buyerId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: "id",
    },
    allowNull: false,
  },
  store_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Store,
      key: "id",
    },
    allowNull: false,
  },
  order_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  total_price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM,
    values: ["PENDING", "SUCCESS", "CANCEL", "CREATING"],
    allowNull: false,
  },
});

const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    references: {
      model: Product,
      key: "id",
    },
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    references: {
      model: Order,
      key: "id",
    },
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

Store.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
User.hasOne(Store, { as: "store", foreignKey: "ownerId" });

Order.belongsTo(User, { as: "buyer", foreignKey: "buyerId" });
Order.hasMany(OrderItem, { as: "orderItems", foreignKey: "orderId" });

OrderItem.belongsTo(Product, { foreignKey: "productId" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });

sequelize.sync({ alter: true }).then(() => {
  console.log("Database & tables created!");
});

app.get("/", (req, res) => {
  res.send("Welcome to the server");
});

app.get("/user", async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

app.get("/user/:id", async (req, res) => {
  const user = await User.findByPk(req.params.id);
  res.json(user);
});

app.get("/toko/:id", async (req, res) => {
  const store = await Store.findByPk(req.params.id);
  res.json(store);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email, password } });
  res.json(user);
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password });
  res.status(200).json({
    message: "register Berhasiil",
    data: user,
  });
});

app.patch("/user/:id", async (req, res) => {
  const user = await User.findByPk(req.params.id);
  const { address, phone_number, name, email } = req.body;
  const update = await user.update({ address, phone_number, name, email });
  res.status(200).json({
    message: "berhasil diubah",
    data: update,
  });
});

app.get("/products", async (req, res) => {
  const products = await Product.findAll();

  // Buat array baru dengan properti discountPrice
  const productsWithDiscount = products.map((product) => {
    const productData = product.toJSON(); // Konversi ke plain object
    if (productData.discount) {
      productData.discountPrice =
        productData.price - (productData.price * productData.discount) / 100;
    }
    return productData;
  });

  res.status(200).send(productsWithDiscount);
});

app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const productData = product.toJSON(); // Konversi ke plain object

    if (productData.discount) {
      productData.discountPrice =
        productData.price - (productData.price * productData.discount) / 100;
    }

    res.status(200).json(productData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/product", async (req, res) => {
  const { name, description, price, stock, discount, store_id } = req.body;
  const product = await Product.create({
    name,
    description,
    price,
    stock,
    discount,
    store_id,
  });
  res.status(200).json({
    message: "berhasil ditambahkan",
    data: product,
  });
});

app.put("/product/:id", async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  const { name, description, price, stock, discount } = req.body;
  product.update({ name, description, price, stock, discount });
});

app.delete("product/:id", async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  product.destroy();
  res.status(200).json({
    message: "berhasil dihapus",
  });
});

//TODO {user_id: 1, items: [{product_id: 1, quantity: 2}, {product_id: 2, quantity: 3}]

 app.post("/order", async (req, res) => {
   const { user_id, items } = req.body;
   const transaction = await sequelize.transaction();

   try {
     let total_price = 0;
     const orderItemsData = [];

     // Jika items bukan array, ubah menjadi array dengan satu elemen
     const itemsArray = Array.isArray(items) ? items : [items];

     // Iterasi melalui item yang ada dalam pesanan
     for (const item of itemsArray) {
       const product = await Product.findByPk(item.product_id);
       if (!product) {
         throw new Error(`Product with ID ${item.product_id} not found`);
       }
       if (product.stock < item.quantity) {
         throw new Error(`Stock tidak cukup untuk produk ${product.name}`);
       }
       const subtotal = product.price * item.quantity;
       total_price += subtotal;
       orderItemsData.push({
         productId: item.product_id,
         quantity: item.quantity,
         price: product.price,
         subtotal,
         orderId: null, // Ini akan diisi setelah pesanan dibuat
       });
     }

     // Membuat pesanan baru
     const newOrder = await Order.create(
       {
         buyerId: user_id,
         total_price,
         store_id: itemsArray[0].store_id,
         status: "PENDING",
       },
       { transaction }
     );

     // Mengaitkan setiap item pesanan dengan pesanan baru
     for (const orderItem of orderItemsData) {
       orderItem.orderId = newOrder.id;
     }

     // Menyimpan item pesanan dalam tabel OrderItem
     await OrderItem.bulkCreate(orderItemsData, { transaction });

     // Memperbarui stok produk
     for (const item of itemsArray) {
       const product = await Product.findByPk(item.product_id);
       product.stock -= item.quantity;
       await product.save({ transaction });
     }

     // Commit transaksi
     await transaction.commit();
     res.status(201).json({
       message: "Order created successfully",
       order: newOrder,
       orderItems: orderItemsData,
     });
   } catch (error) {
     // Rollback transaksi jika terjadi kesalahan
     await transaction.rollback();
     res.status(400).json({ message: error.message });
   }
 });

app.post("/toko", async (req, res) => {
  const { name } = req.body;
  const store = await Store.create({ name });
  res.status(200).json({
    message: "berhasil ditambahkan",
    data: store,
  });
});

app.get("/product/toko/:id", async (req, res) => {
  const products = await Product.findAll({
    where: { store_id: req.params.id },
  });
  res.status(200).send(products);
});

app.get("/order/toko/:id", async (req, res) => {
  const order = await Order.findAll({ where: { store_id: req.params.id } });
  res.status(200).send(order);
});

app.get("/order/buyer/:id", async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  res.status(200).send(order);
});

app.patch('/order/:id', async (req,res) => {
  const order = await Order.update({status: "CREATING"}, {where: {id: req.params.id}})
  res.status(200).json({
    message: "berhasil diubah",
    data: order
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
