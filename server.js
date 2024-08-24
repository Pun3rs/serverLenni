const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB setup
const uri = "mongodb+srv://puncis09581:lennydb@lenny.6nflx.mongodb.net/?retryWrites=true&w=majority&appName=Lenny";
const client = new MongoClient(uri);

const app = express();
app.use(cors());
app.use(express.json());

async function calculateTotalSalesAndCommissions(startTime, endTime) {
  try {
    const db = client.db("Lenny");
    const collection = db.collection('logs');

    // Fetch data from the database
    const salesData = await collection.find().toArray();

    // Filter the data based on the time range
    const filteredData = salesData.filter(sale => {
      const saleDate = new Date(`${sale.Date} ${sale.Time}`);
      return saleDate >= startTime && saleDate <= endTime;
    });

    // Calculate total sales and commissions
    const totals = filteredData.reduce((acc, sale) => {
      acc.totalSales += parseFloat(sale.Sales);
      acc.totalCommissions += parseFloat(sale.Commission);
      return acc;
    }, { totalSales: 0, totalCommissions: 0 });

    return totals;
  } catch (error) {
    console.error("Error calculating total sales and commissions:", error);
    return { totalSales: 0, totalCommissions: 0 };
  }
}

client.connect().then(() => {
  console.log("Connected to MongoDB");

  const db = client.db("Lenny");
  const logsCollection = db.collection('logs');
  const defaultsCollection = db.collection('defaults');

  // Fetch all sales data
  app.get('/sales', async (req, res) => {
    try {
      const data = await logsCollection.find({}).toArray();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching data', error });
    }
  });

  // Save new sales data
  app.post('/sales', async (req, res) => {
    try {
      const saleData = req.body;
      const lastDocument = await logsCollection.find().sort({ _id: -1 }).limit(1).toArray();
      const newId = lastDocument.length > 0 ? lastDocument[0]._id + 1 : 1;
      saleData._id = newId;
      const result = await logsCollection.insertOne(saleData);
      res.json({ status: 'success', message: 'Data saved', result });
    } catch (error) {
      res.status(500).json({ message: 'Error saving data', error });
    }
  });

  // Update existing sales data
  app.put('/sales/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedData = req.body;
      const result = await logsCollection.updateOne({ _id: id }, { $set: updatedData });
      res.json({ status: 'success', message: 'Data updated', result });
    } catch (error) {
      res.status(500).json({ message: 'Error updating data', error });
    }
  });

  // Delete sales data
  app.delete('/sales/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await logsCollection.deleteOne({ _id: id });
      if (result.deletedCount === 1) {
        res.json({ status: 'success', message: `Document with _id ${id} was deleted.` });
      } else {
        res.status(404).json({ message: 'No document found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error deleting data', error });
    }
  });

  // Fetch default data
  app.get('/defaults', async (req, res) => {
    try {
      const data = await defaultsCollection.find({}).toArray();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching data', error });
    }
  });

  // Update default data
  app.put('/defaults', async (req, res) => {
    try {
      const updatedData = req.body;
      const result = await defaultsCollection.updateOne({ _id: 0 }, { $set: updatedData });
      res.json({ status: 'success', message: 'Defaults updated', result });
    } catch (error) {
      res.status(500).json({ message: 'Error updating defaults', error });
    }
  });
  app.post('/calculate-totals', async (req, res) => {
    const { startTime, endTime } = req.body;
    const totals = await calculateTotalSalesAndCommissions(new Date(startTime), new Date(endTime));
    res.json(totals);
  });
}).catch(error => {
  console.error("Failed to connect to MongoDB", error);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
