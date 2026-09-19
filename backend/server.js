const express = require("express");
const mysql = require("mysql2/promise");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const DB_HOST = process.env.DB_HOST || "mysql";
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || "employee_user";
const DB_PASSWORD = process.env.DB_PASSWORD || "employee_password";
const DB_NAME = process.env.DB_NAME || "employee_db";


// MySQL connection pool
const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// Initialize database
async function initializeDatabase() {

    try {

        const connection = await pool.getConnection();

        await connection.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                department VARCHAR(100) NOT NULL,
                salary DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();

        console.log("Database initialized");

    } catch (error) {

        console.error(
            "Database initialization failed:",
            error.message
        );

    }
}


// Health check
app.get("/", (req, res) => {

    res.json({
        message: "Employee Management Backend is running"
    });

});


// Get all employees
app.get("/api/employees", async (req, res) => {

    try {

        const [employees] =
            await pool.query(
                "SELECT * FROM employees ORDER BY id DESC"
            );

        res.json(employees);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch employees"
        });

    }

});


// Add employee
app.post("/api/employees", async (req, res) => {

    const {
        name,
        email,
        department,
        salary
    } = req.body;

    if (!name || !email || !department || !salary) {

        return res.status(400).json({
            message: "All fields are required"
        });

    }

    try {

        await pool.query(
            `
            INSERT INTO employees
            (name, email, department, salary)
            VALUES (?, ?, ?, ?)
            `,
            [
                name,
                email,
                department,
                salary
            ]
        );

        res.status(201).json({
            message: "Employee added successfully"
        });

    } catch (error) {

        console.error(error);

        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                message: "Email already exists"
            });

        }

        res.status(500).json({
            message: "Failed to add employee"
        });

    }

});


// Delete employee
app.delete("/api/employees/:id", async (req, res) => {

    const id = req.params.id;

    try {

        const [result] =
            await pool.query(
                "DELETE FROM employees WHERE id = ?",
                [id]
            );

        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Employee not found"
            });

        }

        res.json({
            message: "Employee deleted successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to delete employee"
        });

    }

});


app.listen(PORT, async () => {

    console.log(
        `Backend running on port ${PORT}`
    );

    await initializeDatabase();

});
