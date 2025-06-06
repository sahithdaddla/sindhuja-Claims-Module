const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = 3000;

// PostgreSQL database connection configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'claims_db',
    password: 'root',
    port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files (HTML, CSS, JS)

// Helper function to validate Employee ID format
const isValidEmployeeId = (employeeId) => {
    const pattern = /^ATS0(?!000)\d{3}$/;
    return pattern.test(employeeId);
};

// Submit a claim
app.post('/api/claims', async (req, res) => {
    const { type, employeeId, employeeName, amount, ...claimData } = req.body;

    if (!type || !employeeId || !employeeName || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!isValidEmployeeId(employeeId)) {
        return res.status(400).json({ error: 'Invalid Employee ID format' });
    }

    try {
        // Check for duplicate claim for the same employee on the same day
        const today = new Date().toISOString().split('T')[0];
        const duplicateCheck = await pool.query(
            'SELECT * FROM claims WHERE employee_id = $1 AND DATE(submission_date) = $2',
            [employeeId, today]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: 'A claim for this employee ID has already been submitted today' });
        }

        // Insert new claim
        const query = `
            INSERT INTO claims (
                type, employee_id, employee_name, amount, submission_date, status,
                travel_date, from_destination, to_destination, purpose,
                treatment_date, hospital, treatment_type,
                claim_date, claim_type, description
            ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id
        `;
        const values = [
            type,
            employeeId,
            employeeName,
            amount,
            'pending',
            claimData.travelDate || null,
            claimData.fromDestination || null,
            claimData.toDestination || null,
            claimData.purpose || null,
            claimData.treatmentDate || null,
            claimData.hospital || null,
            claimData.treatmentType || null,
            claimData.claimDate || null,
            claimData.claimType || null,
            claimData.description || null
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ message: 'Claim submitted successfully', claimId: result.rows[0].id });
    } catch (error) {
        console.error('Error submitting claim:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all claims with optional filtering
app.get('/api/claims', async (req, res) => {
    const { search, status } = req.query;
    let query = 'SELECT * FROM claims';
    let values = [];
    let conditions = [];

    if (search) {
        conditions.push(`
            (employee_id ILIKE $1 OR 
             employee_name ILIKE $1 OR 
             type ILIKE $1 OR 
             from_destination ILIKE $1 OR 
             to_destination ILIKE $1 OR 
             purpose ILIKE $1 OR 
             hospital ILIKE $1 OR 
             treatment_type ILIKE $1 OR 
             claim_type ILIKE $1 OR 
             description ILIKE $1)
        `);
        values.push(`%${search}%`);
    }

    if (status && status !== 'all') {
        conditions.push('status = $' + (values.length + 1));
        values.push(status);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    try {
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching claims:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update claim status
app.put('/api/claims/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const result = await pool.query(
            'UPDATE claims SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        res.json({ message: `Claim ${status} successfully`, claim: result.rows[0] });
    } catch (error) {
        console.error('Error updating claim status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clear all claims
app.delete('/api/claims', async (req, res) => {
    try {
        await pool.query('DELETE FROM claims');
        res.json({ message: 'All claims cleared successfully' });
    } catch (error) {
        console.error('Error clearing claims:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});