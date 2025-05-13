require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = 3000;

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Middlewares (ORDEM IMPORTANTE!)
app.use(express.static(path.join(__dirname, 'public'))); // Serve arquivos estáticos
app.use(express.urlencoded({ extended: true })); // Para formulários HTML
app.use(express.json()); // Para JSON

// Criar pasta de uploads se não existir
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


app.use(express.static(path.join(__dirname, 'adm')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Rotas
app.get('/', (req, res) => {
  res.redirect('/cadastro-sala');
});

app.get('/cadastro-sala', (req, res) => {
  res.sendFile(path.join(__dirname, 'adm', 'cadastrosalas.html'));
});

app.post('/cadastrar-sala', upload.single('foto'), async (req, res) => {
  try {
    const { nome, localizacao, tipo } = req.body;
    const fotoPath = req.file ? '/uploads/' + req.file.filename : null;

    const result = await pool.query(
      'INSERT INTO sala (nome, localizacao, tipo, foto) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, localizacao, tipo, fotoPath]
    );

    
    res.redirect('/cadastro-sala?mensagem=sucesso');
  
  } catch (error) {
    console.error('Erro ao cadastrar sala:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cadastrar sala'
    });
  }
});

//  me mostra as salas já cadastradas
app.get('/salas', async (req, res) => {
  try {
    const result = await pool.query('SELECT nome, localizacao FROM sala ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar salas:', error);
    res.status(500).json({ message: 'Erro ao buscar salas' });
  }
});


// Middleware de erro global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo deu errado!');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  
});