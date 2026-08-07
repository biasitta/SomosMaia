const bcrypt = require("bcryptjs");

const pool = require("../config/banco");
 
// Controller de Usuário
 
const usuarioController = {
 
  // ===================== Cadastro =====================

  cadastrar: async (req, res) => {

    try {

      const { Nome, Email, Senha, DataNascimento, Fase, SemanasGestacao, Telefone, Termos } = req.body;
 
      if (!Nome || !Email || !Senha) {

        return res.status(400).send("Nome, e-mail e senha são obrigatórios");

      }
 
      const [existentes] = await pool.execute("SELECT id_usuario FROM usuario WHERE email = ?", [Email]);

      if (existentes.length > 0) {

        return res.status(400).send("E-mail já cadastrado");

      }
 
      const senhaCriptografada = await bcrypt.hash(Senha, 10);
 
      await pool.execute(

        `INSERT INTO usuario

          (paciente_nome, email, senha, data_nascimento, fase, semanas_gestacao, paciente_telefone, termos_aceitos)

         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

        [

          Nome,

          Email,

          senhaCriptografada,

          DataNascimento || null,

          Fase || null,

          SemanasGestacao || null,

          Telefone || null,

          Termos ? 1 : 0

        ]

      );
 
      return res.redirect("/login");

    } catch (erro) {

      console.error("Erro ao cadastrar usuário:", erro.message);

      return res.status(500).send("Erro ao cadastrar usuário");

    }

  },
 
  // ===================== Login =====================

  login: async (req, res) => {

    try {

      const { Email, Senha } = req.body;
 
      if (!Email || !Senha) {

        return res.status(400).send("E-mail e senha são obrigatórios");

      }
 
      const [linhas] = await pool.execute("SELECT * FROM usuario WHERE email = ?", [Email]);

      const usuario = linhas[0];
 
      if (!usuario) {

        return res.status(401).send("Credenciais inválidas");

      }
 
      const senhaCorreta = await bcrypt.compare(Senha, usuario.senha);

      if (!senhaCorreta) {

        return res.status(401).send("Credenciais inválidas");

      }
 
      req.session.usuarioEmail = usuario.email;

      return res.redirect("/dashboard");

    } catch (erro) {

      console.error("Erro ao fazer login:", erro.message);

      return res.status(500).send("Erro ao fazer login");

    }

  },
 
  // ===================== Logout =====================

  logout: (req, res) => {

    req.session.destroy(() => {

      return res.redirect("/");

    });

  },
 
  // ===================== Dados do usuário logado (API JSON, usado pelo dashboard) =====================

  meusDados: async (req, res) => {

    try {

      const [linhas] = await pool.execute(

        `SELECT id_usuario, paciente_nome AS Nome, email AS Email, data_nascimento AS DataNascimento,

                fase AS Fase, semanas_gestacao AS SemanasGestacao, paciente_telefone AS Telefone,

                status_risco AS StatusRisco

         FROM usuario WHERE email = ?`,

        [req.session.usuarioEmail]

      );
 
      const usuario = linhas[0];

      if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });
 
      return res.json(usuario);

    } catch (erro) {

      console.error("Erro ao buscar dados do usuário:", erro.message);

      return res.status(500).json({ erro: "Erro ao buscar dados do usuário" });

    }

  },
 
  // ===================== Página de perfil (renderiza EJS) =====================

  paginaPerfil: async (req, res) => {

    try {

      const [linhas] = await pool.execute(

        `SELECT id_usuario, paciente_nome AS Nome, email AS Email, data_nascimento AS DataNascimento,

                fase AS Fase, semanas_gestacao AS SemanasGestacao, paciente_telefone AS Telefone,

                status_risco AS StatusRisco

         FROM usuario WHERE email = ?`,

        [req.session.usuarioEmail]

      );
 
      const usuario = linhas[0];

      if (!usuario) return res.redirect("/login");
 
      return res.render("perfil", { usuario });

    } catch (erro) {

      console.error("Erro ao carregar página de perfil:", erro.message);

      return res.status(500).send("Erro ao carregar perfil");

    }

  },
 
  // ===================== Atualizar perfil =====================

  atualizarPerfil: async (req, res) => {

    try {

      const { Nome, Telefone, Fase, SemanasGestacao } = req.body;
 
      await pool.execute(

        `UPDATE usuario

           SET paciente_nome = COALESCE(?, paciente_nome),

               paciente_telefone = COALESCE(?, paciente_telefone),

               fase = COALESCE(?, fase),

               semanas_gestacao = COALESCE(?, semanas_gestacao)

         WHERE email = ?`,

        [

          Nome || null,

          Telefone || null,

          Fase || null,

          SemanasGestacao === undefined || SemanasGestacao === "" ? null : SemanasGestacao,

          req.session.usuarioEmail

        ]

      );
 
      return res.redirect("/perfil");

    } catch (erro) {

      console.error("Erro ao atualizar perfil:", erro.message);

      return res.status(500).send("Erro ao atualizar perfil");

    }

  }

};
 
module.exports = usuarioController;
 