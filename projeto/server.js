require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Adicionado CORS
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Habilita o CORS para permitir acesso via fetch de qualquer origem
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));


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
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// app.get('paginaprojetos.html', (req, res) => {
//   res.sendFile(path.join(__dirname, 'projeto', 'paginainicial.html'));
// });

// Criar pasta de uploads se não existir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.static(path.join(__dirname, 'adm')));
app.use('/uploads', express.static(path.join(__dirname,  'uploads')));



// Rotas de usuários
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email FROM usuario');
    res.json(result.rows); // ✅ Aqui retorna os dados corretamente
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});
app.delete('/usuarios/:id', async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM usuario WHERE id = $1", [id]);
    res.sendStatus(204);

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    res.json({ mensagem: 'Usuário excluído com sucesso' });
  } catch (erro) {
    console.error('Erro ao excluir usuário:', erro);
    res.status(500).json({ mensagem: 'Erro no servidor ao excluir usuário' });
  }
});


// Rotas de salas
app.get('/', (req, res) => {
  res.redirect('/cadastro-sala');
});

app.get('/cadastro-sala', (req, res) => {
  res.sendFile(path.join(__dirname, 'adm', 'cadastrosalas.html'));
});

app.get('/salas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sala');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar salas:', error);
    res.status(500).json({ error: 'Erro ao buscar salas' });
  }
});
// adicionei essa 
app.get('/salas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM sala WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar sala:', error);
    res.status(500).json({ error: 'Erro ao buscar sala' });
  }
});

// 

app.post('/cadastrar-sala', upload.single('foto'), async (req, res) => {
  try {
    const { nome, localizacao, tipo } = req.body;
    const fotoPath = req.file ? 'uploads/' + req.file.filename : null;

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

app.delete('/salas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM sala WHERE id = $1', [id]);

    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensagem: 'Sala não encontrada.' });
    }

    res.status(200).json({ mensagem: 'Sala excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir sala:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir sala.' });
  }
  
});

app.put('/atualizar-sala/:id', upload.single('foto'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, localizacao, tipo } = req.body;
        let fotoPath = req.body.fotoAtual; // Você pode enviar o caminho atual como campo hidden

        if (req.file) {
            fotoPath = 'uploads/' + req.file.filename;
        }

        const result = await pool.query(
            'UPDATE sala SET nome = $1, localizacao = $2, tipo = $3, foto = COALESCE($4, foto) WHERE id = $5 RETURNING *',
            [nome, localizacao, tipo, fotoPath, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar sala:', error);
        res.status(500).json({ error: 'Erro ao atualizar sala' });
    }
});

// Retorna as salas cadastradas
app.get('/salas', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, localizacao, foto FROM sala');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar salas:', error);
    res.status(500).json({ message: 'Erro ao buscar salas' });
  }
});



// Rota para login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuario WHERE email = $1 AND senha = $2',
      [email, senha]
    );

    if (result.rows.length > 0) {
      res.json({ sucesso: true }); // <- sucesso, retorna json
    } else {
      res.status(401).json({ erro: "Email ou senha incorretos" }); // <- erro claro
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ erro: "Erro interno do servidor" }); // <- erro do servidor
  }
});


// rotas professores 
// Rotas de professores

// GET: listar todos os professores
app.get('/professores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM professor');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar professores:', error);
    res.status(500).json({ error: 'Erro ao buscar professores' });
  }
});

// POST: cadastrar novo professor
app.post('/professores', upload.none(), async (req, res) => {
  const { nome, email, materia } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO professor (nome, email, materia) VALUES ($1, $2, $3) RETURNING *',
      [nome, email, materia]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao cadastrar professor:', error);
    res.status(500).json({ error: 'Erro ao cadastrar professor' });
  }
});

// PUT: atualizar professor
app.put('/professores/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, materia } = req.body;

  try {
    const result = await pool.query(
      'UPDATE professor SET nome = $1, email = $2, materia = $3 WHERE id = $4 RETURNING *',
      [nome, email, materia, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Professor não encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar professor:', error);
    res.status(500).json({ error: 'Erro ao atualizar professor' });
  }
});

// DELETE: excluir professor
app.delete('/professores/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM professor WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ mensagem: 'Professor não encontrado.' });
    }

    res.json({ mensagem: 'Professor excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir professor:', error);
    res.status(500).json({ error: 'Erro ao excluir professor' });
  }
});

// professores 

// rotas de projetos 
app.get('/projetos', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM projeto ORDER BY id');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar projetos' });
  }
});

app.get('/projetos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query('SELECT * FROM projeto WHERE id = $1', [id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Projeto não encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar projeto' });
  }
});

app.post('/projetos', upload.single('foto'), async (req, res) => {
  const { nome, sobre, link } = req.body;
  const foto = req.file ? req.file.filename : null;

  try {
    const resultado = await pool.query(
      'INSERT INTO projeto (nome, sobre, foto, link) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, sobre, foto, link]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar projeto', detalhes: err.message });
  }
});

app.put('/projetos/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, sobre, link } = req.body;

  try {
    // Primeiro busca a foto atual do projeto
    const projetoAtual = await pool.query('SELECT foto FROM projeto WHERE id = $1', [id]);
    
    if (projetoAtual.rows.length === 0) {
      return res.status(404).json({ erro: 'Projeto não encontrado' });
    }

    const fotoAtual = projetoAtual.rows[0].foto;

    // Atualiza apenas nome, sobre e link, mantendo a foto existente
    const resultado = await pool.query(
      'UPDATE projeto SET nome = $1, sobre = $2, link = $3, foto = $4 WHERE id = $5 RETURNING *',
      [nome, sobre, link, fotoAtual, id]
    );

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar projeto' });
  }
});

app.delete('/projetos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query('DELETE FROM projeto WHERE id = $1 RETURNING *', [id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Projeto não encontrado' });
    }
    res.json({ mensagem: 'Projeto excluído com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir projeto' });
  }
});
// projetos 

// evento
// EVENTOS
app.get("/eventos", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM evento ORDER BY data DESC");
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar eventos:", err);
    res.status(500).json({ erro: "Erro ao buscar eventos" });
  }
});

app.post("/eventos", async (req, res) => {
  const { data, nome, sobre } = req.body;
  try {
    const query = "INSERT INTO evento (data, nome, sobre) VALUES ($1, $2, $3) RETURNING *";
    const values = [data, nome, sobre];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Erro ao adicionar evento:", err);
    res.status(500).json({ erro: "Erro ao adicionar evento" });
  }
});

app.put("/eventos/:id", async (req, res) => {
  const { id } = req.params;
  const { data, nome, sobre } = req.body;
  try {
    const query = "UPDATE evento SET data = $1, nome = $2, sobre = $3 WHERE id = $4 RETURNING *";
    const values = [data, nome, sobre, id];
    const { rows } = await pool.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar evento:", err);
    res.status(500).json({ erro: "Erro ao atualizar evento" });
  }
});

app.delete("/eventos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM evento WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("Erro ao deletar evento:", err);
    res.status(500).json({ erro: "Erro ao deletar evento" });
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
