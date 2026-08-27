const bcrypt = require("bcryptjs");
const pool = require("../config/banco");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
 
// --- CONFIGURAÇÕES DO GOOGLE E EMAIL ---
const GOOGLE_CLIENT_ID = "910310455755-ecuctmqtfutt440jbjebr97jdj1pgkk5.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
 
const EMAIL_SISTEMA = "central.equipemaia@gmail.com";
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_SISTEMA,
    pass: "psok rogj tgaq wtuu" // Sua senha de aplicativo
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2"
  }
});
 
const emailStyle = `
    font-family: sans-serif;
    color: #3b2a25;
    border: 1px solid #eee;
    padding: 25px;
    border-radius: 12px;
    max-width: 500px;
    margin: 0 auto;
    background-color: #fdfdfd;
`;
 
// Controller de Usuário
 
const usuarioController = {
 
  // ===================== Cadastro =====================
 
  cadastrar: async (req, res) => {
    try {
      const { Nome, Email, Senha, DataNascimento, Fase, SemanasGestacao, Telefone, Termos, Foto } = req.body;
 
      if (!Nome || !Email || !Senha) {
        return res.status(400).send("Nome, e-mail e senha são obrigatórios");
      }
 
      const [existentes] = await pool.execute("SELECT id_usuario FROM usuario WHERE email = ?", [Email]);
 
      if (existentes.length > 0) {
        return res.status(400).send("E-mail já cadastrado");
      }
 
      const senhaCriptografada = await bcrypt.hash(Senha, 10);
      const codigoVerificacao = Math.floor(100000 + Math.random() * 900000);
 
      await pool.execute(
        `INSERT INTO usuario
          (paciente_nome, email, senha, data_nascimento, fase, semanas_gestacao, paciente_telefone, termos_aceitos, codigo_verificacao, foto)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Nome,
          Email,
          senhaCriptografada,
          DataNascimento || null,
          Fase || null,
          SemanasGestacao || null,
          Telefone || null,
          Termos ? 1 : 0,
          codigoVerificacao,
          Foto || null
        ]
      );
 
      console.log(`🔑 CÓDIGO DE VERIFICAÇÃO GERADO PARA [${Email}]: ${codigoVerificacao}`);
 
      // Envia o e-mail de verificação
      try {
        await transporter.sendMail({
          from: `"Equipe Maia" <${EMAIL_SISTEMA}>`,
          to: Email,
          subject: "Seu Código de Verificação - Maia",
          html: `
            <div style="${emailStyle}">
              <h2 style="color: #8c5a4d; margin-top: 0;">Bem-vinda à Maia!</h2>
              <p>Olá, <b>${Nome}</b>! Use o código abaixo para validar seu acesso:</p>
              <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #8c5a4d;">${codigoVerificacao}</span>
              </div>
              <p style="font-size: 12px; color: #999;">Se você não solicitou este código, ignore este e-mail.</p>
            </div>
          `
        });
        console.log(`✉️ E-mail enviado com sucesso para: ${Email}`);
      } catch (erroEmail) {
        console.error("⚠️ Falha ao enviar o e-mail pelo Nodemailer:", erroEmail.message);
      }
 
      // REDIRECIONA PARA A TELA DE CÓDIGO DE VERIFICAÇÃO
      return res.redirect(`/verificacao?email=${encodeURIComponent(Email)}`);
 
    } catch (erro) {
      console.error("Erro ao cadastrar usuário:", erro.message);
      return res.status(500).send("Erro ao cadastrar usuário");
    }
  },
 
  // ===================== Verificar Código de E-mail =====================
 
  verificarCodigo: async (req, res) => {
    try {
      const { email, codigoDigitado } = req.body;
 
      const [linhas] = await pool.execute(
        "SELECT * FROM usuario WHERE email = ? AND codigo_verificacao = ?",
        [email, codigoDigitado]
      );
 
      if (linhas.length > 0) {
        // INICIA A SESSÃO AUTOMATICAMENTE
        req.session.usuarioEmail = email;
 
        return res.json({ ok: true, mensagem: "E-mail verificado com sucesso!" });
      } else {
        return res.status(401).json({ ok: false, erro: "Código de verificação inválido!" });
      }
    } catch (erro) {
      console.error("Erro ao verificar código:", erro.message);
      return res.status(500).json({ ok: false, erro: "Erro ao verificar código." });
    }
  },
 
  // ===================== Autenticação com o Google =====================
 
  googleAuth: async (req, res) => {
    try {
      const { token } = req.body;
 
      if (!token) {
        return res.status(400).json({ erro: "Token do Google não enviado." });
      }
 
      let email, nome, foto;
 
      if (typeof token === 'string' && token.split('.').length === 3) {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        nome = payload.name;
        foto = payload.picture;
      } else {
        const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await googleRes.json();
        email = payload.email;
        nome = payload.name;
        foto = payload.picture;
      }
 
      const [linhas] = await pool.execute("SELECT * FROM usuario WHERE email = ?", [email]);
 
      if (linhas.length > 0) {
        req.session.usuarioEmail = email;
        return res.json({
          ok: true,
          cadastrado: true,
          redirect: "/dashboard"
        });
      } else {
        return res.json({
          ok: true,
          cadastrado: false,
          redirect: "/cadastro",
          nome: nome,
          email: email,
          foto: foto
        });
      }
 
    } catch (erro) {
      console.error("❌ Erro no Google Auth:", erro.message);
      return res.status(403).json({ erro: "Falha na autenticação do Google." });
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
 
  // ===================== Dados do usuário logado =====================
 
  meusDados: async (req, res) => {
    try {
      const [linhas] = await pool.execute(
        `SELECT id_usuario, paciente_nome AS Nome, email AS Email, data_nascimento AS DataNascimento,
                fase AS Fase, semanas_gestacao AS SemanasGestacao, paciente_telefone AS Telefone,
                status_risco AS StatusRisco, foto AS Foto
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
                status_risco AS StatusRisco, foto AS Foto
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
      const emailUsuario = req.session.usuarioEmail;
 
      if (!emailUsuario) {
        return res.status(401).json({ ok: false, erro: "Sessão expirada. Faça login novamente." });
      }
 
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
          emailUsuario
        ]
      );
 
      return res.json({ ok: true, mensagem: "Perfil atualizado com sucesso!" });
 
    } catch (erro) {
      console.error("Erro ao atualizar perfil:", erro.message);
      return res.status(500).json({ ok: false, erro: "Erro interno ao atualizar perfil." });
    }
  },
 
  // ===================== Solicitar Recuperação de Senha =====================
 
  solicitarRecuperacaoSenha: async (req, res) => {
    try {
      const { Email } = req.body;
 
      if (!Email) {
        return res.status(400).json({ ok: false, erro: "E-mail é obrigatório." });
      }
 
      const [linhas] = await pool.execute("SELECT * FROM usuario WHERE email = ?", [Email]);
 
      if (linhas.length === 0) {
        return res.status(404).json({ ok: false, erro: "E-mail não cadastrado no sistema." });
      }
 
      const codigoRedefinicao = Math.floor(100000 + Math.random() * 900000).toString();
 
      await pool.execute("UPDATE usuario SET codigo_verificacao = ? WHERE email = ?", [codigoRedefinicao, Email]);
 
      await transporter.sendMail({
        from: `"Equipe Maia" <${EMAIL_SISTEMA}>`,
        to: Email,
        subject: "Redefinição de Senha - Maia",
        html: `
          <div style="${emailStyle}">
            <h2 style="color: #8c5a4d; margin-top: 0;">Recuperação de Senha</h2>
            <p>Você solicitou a redefinição de sua senha na plataforma <b>Maia</b>.</p>
            <p>Seu código de verificação é:</p>
            <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #8c5a4d;">${codigoRedefinicao}</span>
            </div>
            <p style="font-size: 12px; color: #999;">Se você não solicitou essa alteração, ignore esta mensagem.</p>
          </div>
        `
      });
 
      console.log(`🔑 CÓDIGO DE REDEFINIÇÃO ENVIADO PARA [${Email}]: ${codigoRedefinicao}`);
      return res.json({ ok: true, mensagem: "E-mail de redefinição enviado com sucesso!" });
 
    } catch (erro) {
      console.error("Erro ao solicitar recuperação de senha:", erro.message);
      return res.status(500).json({ ok: false, erro: "Erro ao processar solicitação." });
    }
  },
 
  // ===================== Redefinir Senha Com Código =====================
 
  redefinirSenha: async (req, res) => {
    try {
      const { Email, Codigo, NovaSenha } = req.body;
 
      if (!Email || !Codigo || !NovaSenha) {
        return res.status(400).json({ ok: false, erro: "Todos os campos são obrigatórios." });
      }
 
      const [linhas] = await pool.execute(
        "SELECT * FROM usuario WHERE email = ? AND codigo_verificacao = ?",
        [Email, Codigo]
      );
 
      if (linhas.length === 0) {
        return res.status(400).json({ ok: false, erro: "Código inválido ou expirado." });
      }
 
      const novaSenhaCriptografada = await bcrypt.hash(NovaSenha, 10);
 
      await pool.execute(
        "UPDATE usuario SET senha = ?, codigo_verificacao = NULL WHERE email = ?",
        [novaSenhaCriptografada, Email]
      );
 
      return res.json({ ok: true, mensagem: "Senha alterada com sucesso! Você já pode fazer login." });
 
    } catch (erro) {
      console.error("Erro ao redefinir senha:", erro.message);
      return res.status(500).json({ ok: false, erro: "Erro ao redefinir senha." });
    }
  },
 
};
 
module.exports = usuarioController;