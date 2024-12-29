const express = require('express');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json()); // To handle JSON request bodies

const kafka = new Kafka({
    clientId: 'db-service',
    brokers: ['localhost:9092'],
  });
  const consumer = kafka.consumer({ groupId: 'db-service-group' });
  

// Database connection pool
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
});

// Health check endpoint
app.get('/db/status', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Endpoint to add a new log
app.post('/db/logs', async (req, res) => {
    const { user_id, input_text, output_text } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO Logs (user_id, input_text, output_text) 
             VALUES ($1, $2, $3) RETURNING *`,
            [user_id, input_text, output_text]
        );
        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Endpoint to fetch logs for a specific user
app.get('/db/logs', async (req, res) => {
    const { user_id } = req.query;
    try {
        const result = await pool.query(
            `SELECT * FROM Logs WHERE user_id = $1`,
            [user_id]
        );
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Endpoint to delete a log by ID
app.delete('/db/logs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`DELETE FROM Logs WHERE request_id = $1`, [id]);
        res.json({ status: 'success', message: 'Log deleted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DB-Service running on port ${PORT}`));

async function consumeKafkaMessages() {
    await consumer.connect();
    console.log('Connected to Kafka as consumer.');
  
    await consumer.subscribe({ topic: 'translation-responses', fromBeginning: true });
    await consumer.subscribe({ topic: 'summarization-responses', fromBeginning: true });
  
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = JSON.parse(message.value.toString());
        console.log(`Received message from ${topic}:`, value);
  
        // Insert into database
        const { request_id, user_id, input_text, output_text } = value;
        try {
          await pool.query(
            `INSERT INTO Logs (request_id, user_id, input_text, output_text) VALUES ($1, $2, $3, $4)`,
            [request_id, user_id, input_text, output_text]
          );
          console.log('Data inserted into the database.');
        } catch (error) {
          console.error('Database error:', error.message);
        }
      },
    });
  }
  
  consumeKafkaMessages().catch((err) => console.error('Error in Kafka consumer:', err));