const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Koneksi Database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) throw err;
    console.log('Database MySQL Terhubung!');
});

// 1. Ambil Semua Transaksi
app.get('/api/transactions', (req, res) => {
    const query = `
        SELECT t.*, c.name as category_name 
        FROM transactions t 
        LEFT JOIN categories c ON t.category_id = c.id 
        ORDER BY t.transaction_date DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. Tambah Transaksi
app.post('/api/transactions', (req, res) => {
    const { title, amount, type, category_id, transaction_date } = req.body;
    const query = 'INSERT INTO transactions (title, amount, type, category_id, transaction_date) VALUES (?, ?, ?, ?, ?)';
    
    db.query(query, [title, amount, type, category_id, transaction_date], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: results.insertId, message: 'Transaksi berhasil ditambahkan' });
    });
});

// 3. Statistik Ringkasan & Perbandingan (Naik/Turun)
app.get('/api/statistics', (req, res) => {
    const queryTotal = `
        SELECT 
            SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as total_expense
        FROM transactions
    `;
    
    db.query(queryTotal, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const income = results[0].total_income || 0;
        const expense = results[0].total_expense || 0;
        res.json({
            total_income: income,
            total_expense: expense,
            balance: income - expense
        });
    });
});

// Ambil Kategori
app.get('/api/categories', (req, res) => {
    db.query('SELECT * FROM categories', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

const PORT = process.env.PORT || 5000;
// Statistik Bulanan untuk Diagram Garis
app.get('/api/statistics/monthly', (req, res) => {
    const query = `
        SELECT 
            DATE_FORMAT(transaction_date, '%Y-%m') as month,
            SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
        FROM transactions
        GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
        ORDER BY month ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 4. Edit / Update Transaksi
app.put('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    const { title, amount, type, category_id, transaction_date } = req.body;
    const query = 'UPDATE transactions SET title = ?, amount = ?, type = ?, category_id = ?, transaction_date = ? WHERE id = ?';
    
    db.query(query, [title, amount, type, category_id, transaction_date, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaksi berhasil di-update' });
    });
});

// 5. Hapus Transaksi
app.delete('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM transactions WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaksi berhasil dihapus' });
    });
});

app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));