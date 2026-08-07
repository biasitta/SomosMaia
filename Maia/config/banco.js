// Carregar a biblioteca do mysql2
// Promise adiciona os recursos nativos do async e await para o MySQL,
// Ou seja ele aguarda sempre a resposta do banco finalizar
const mysql = require('mysql2/promise');
 
// Configurar a conexão com o banco de dados
const conexaoBanco = mysql.createPool({
    host: '10.87.100.6', //Servidor mysql da escola
    user: 'aluno',
    password: 'Senai1234',
    database: 'maiageminix',
    waitForConnections: true //Agurda a confirmação
});
 
//Exportar o objeto "conexaoBanco" e deixar visível em outras partes do projeto
module.exports = conexaoBanco;