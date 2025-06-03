const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);


require('dotenv').config();
const express = require('express');
// bodyParser foi removido, express.json() e express.urlencoded() são usados abaixo.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Alterado de bcrypt para bcryptjs
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // Alterado para usar process.env.PORT

// Middleware para parsear JSON e dados de formulário urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Adicionado para dados de formulário
app.use(cors());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));
app.use('/arquivos-css', express.static(path.join(__dirname, 'arquivos-css'))); // Observação sobre nome da pasta
app.use('/anamnese', express.static(path.join(__dirname, 'anamnese')));

// Conexão com o MongoDB
mongoose.connect(process.env.DB_URI) // Certifique-se que DB_URI está nas variáveis de ambiente do Render
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => console.error('Erro ao conectar ao MongoDB', err));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    // status: { type: String, enum: ['ativo', 'pendente'], default: 'ativo' }
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String }
}, { timestamps: true });
const Client = mongoose.model('Client', ClientSchema, 'clients');

const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    price: { type: Number, required: true, min: 0 }
}, { timestamps: true });
const Service = mongoose.model('Service', ServiceSchema, 'services');

const AppointmentSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['pendente', 'confirmado', 'cancelado', 'concluido'], default: 'pendente' },
    procedimentos: [{
        nome: { type: String, required: true },
        valor: { type: Number, required: true, min: 0 }
    }],
    observacoes: { type: String },
    valorTotal: { type: Number, required: true, min: 0 }
}, { timestamps: true });
const Appointment = mongoose.model('Appointment', AppointmentSchema, 'appointments');

const AnamneseSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    nomeCompleto: { type: String, required: true },
    dataNascimento: { type: String, required: true },
    telefone: { type: String, required: true },
    email: { type: String, required: true },
    profissao: { type: String },
    doencaCronica: { type: Boolean },
    qualDoencaCronica: { type: String },
    medicacaoContinua: { type: Boolean },
    qualMedicacao: { type: String },
    alergia: { type: Boolean },
    qualAlergia: { type: String },
    gravidaAmamentando: { type: Boolean },
    procedimentoAnterior: { type: Boolean },
    detalhesProcedimentoAnterior: { type: String },
    expectativas: { type: String },
    dataPreenchimento: { type: Date, default: Date.now }
}, { timestamps: true });
const Anamnese = mongoose.model('Anamnese', AnamneseSchema, 'anamneses');

const TransactionSchema = new mongoose.Schema({
    tipo: { type: String, enum: ['receita', 'despesa'], required: true },
    descricao: { type: String, required: true },
    valor: { type: Number, required: true, min: 0 },
    data: { type: Date, required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', unique: true, sparse: true },
}, { timestamps: true });
const Transaction = mongoose.model('Transaction', TransactionSchema, 'transactions');


// PIN DE ATIVAÇÃO (configure a variável de ambiente ACTIVATION_PIN no Render)
const ACTIVATION_PIN = process.env.ACTIVATION_PIN || "#112808"; // Alterado para usar variável de ambiente

// =====================================================================
// ROTAS DA APLICAÇÃO
// =====================================================================

// ROTAS PARA SERVIÇOS
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find();
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar a lista de serviços.' });
    }
});
app.post('/api/services', async (req, res) => {
    try {
        const newService = new Service(req.body);
        await newService.save();
        res.status(201).json(newService);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar o serviço.' });
    }
});


// ROTAS PARA AGENDAMENTOS
app.post('/api/appointments', async (req, res) => {
    try {
        const { clientId, date, time, procedimentos, observacoes, valorTotal } = req.body;
        if (!clientId || !date || !time || !procedimentos || procedimentos.length === 0 || !valorTotal) {
            return res.status(400).json({ message: 'Todos os campos essenciais são obrigatórios.' });
        }
        const appointmentDate = new Date(date + 'T00:00:00'); // Considerar fuso horário na criação se relevante
        if (isNaN(appointmentDate.getTime())) {
            return res.status(400).json({ message: 'O formato da data fornecida é inválido.' });
        }
        const clientExists = await Client.findById(clientId);
        if (!clientExists) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }
        const newAppointment = new Appointment({
            clientId, date: appointmentDate, time, procedimentos, observacoes, valorTotal, status: 'pendente'
        });
        await newAppointment.save();
        res.status(201).json(newAppointment);
    } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao salvar o agendamento.' });
    }
});
// VOU ALTERAR ESSA ROTA PARA VER SE DA CERTO
app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find().populate('clientId', 'name phone email').sort({ date: 1, time: 1 });
       const formattedAppointments = appointments.map(app => {
    //const formattedDate = new Date(app.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
           const formattedDate = dayjs(app.date)
    .tz('America/Sao_Paulo')
    .format('DD/MM/YYYY');

    return {
        _id: app._id,
        clientId: app.clientId,
        rawDate: app.date, // UTC original, se precisar
        date: formattedDate, // ex: 03/06/2025
        time: app.time,
        procedimentos: app.procedimentos,
        procedimentosNomes: app.procedimentos?.map(p => p.nome).join(', ') || 'N/A',
        observacoes: app.observacoes,
        valorTotal: app.valorTotal,
        status: app.status
            };
        });
        res.status(200).json(formattedAppointments);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar a lista de agendamentos.' });
    }
});

// ATÉ AQUI
app.get('/api/appointments/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id).populate('clientId', 'name phone email');
        if (!appointment) {
            return res.status(404).json({ message: 'Agendamento não encontrado.' });
        }
        const d = new Date(appointment.date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const correctedDate = `${year}-${month}-${day}`; // Data formatada como YYYY-MM-DD (UTC)
        const formattedAppointment = {
            _id: appointment._id, clientId: appointment.clientId, date: correctedDate,
            formattedDate: new Date(appointment.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            time: appointment.time, procedimentos: appointment.procedimentos,
            procedimentosNomes: appointment.procedimentos?.map(p => p.nome).join(', ') || 'N/A',
            observacoes: appointment.observacoes, valorTotal: appointment.valorTotal, status: appointment.status
        };
        res.status(200).json(formattedAppointment);
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor ao buscar agendamento.' });
    }
});

app.put('/api/appointments/:id', async (req, res) => {
    try {
        const appointmentData = req.body;
        if (appointmentData.date) { // Se a data estiver sendo atualizada
            //const newDate = new Date(appointmentData.date + 'T00:00:00'); // Considerar fuso horário
            const newDate = dayjs.tz(appointmentData.date, 'YYYY-MM-DD', 'America/Sao_Paulo').toDate();

            if (isNaN(newDate.getTime())) {
                return res.status(400).json({ message: 'O formato da data para atualização é inválido.' });
            }
            appointmentData.date = newDate;
        }
        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, appointmentData, { new: true });
        if (!updatedAppointment) {
            return res.status(404).json({ message: 'Agendamento não encontrado.' });
        }
        res.status(200).json(updatedAppointment);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar o agendamento.' });
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const appointmentToDelete = await Appointment.findById(appointmentId);
        if (!appointmentToDelete) {
            return res.status(404).json({ message: 'Agendamento não encontrado.' });
        }
        // Se o agendamento estiver concluído, remove a transação associada (se houver)
        if (appointmentToDelete.status === 'concluido') {
            await Transaction.findOneAndDelete({ appointmentId: appointmentId });
        }
        await Appointment.findByIdAndDelete(appointmentId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir o agendamento.' });
    }
});


// ROTAS DE RELATÓRIO
app.get('/api/relatorios/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        if (!['pendente', 'confirmado', 'cancelado', 'concluido'].includes(status)) {
            return res.status(400).json({ message: 'Status inválido.' });
        }
        const appointments = await Appointment.find({ status }).populate('clientId', 'name').sort({ date: 1, time: 1 });
        res.status(200).json(appointments.map(app => ({
            ...app.toObject(),
            formattedDate: new Date(app.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })));
    } catch (error) {
        res.status(500).json({ message: `Erro ao buscar agendamentos ${req.params.status}.` });
    }
});
app.get('/api/relatorios/agendamentos/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const { data: dateStr } = req.query; // data de referência como YYYY-MM-DD
        if (!dateStr) {
            return res.status(400).json({ message: 'Data de referência é obrigatória.' });
        }
        const startOfDay = new Date(dateStr + 'T00:00:00.000Z'); // Trata a data como UTC
        let startDate, endDate;
        switch (tipo) {
            case 'dia':
                startDate = startOfDay;
                endDate = new Date(dateStr + 'T23:59:59.999Z');
                break;
            case 'semana':
                const dayOfWeek = startOfDay.getUTCDay(); // 0 (Domingo) a 6 (Sábado)
                startDate = new Date(startOfDay);
                startDate.setUTCDate(startOfDay.getUTCDate() - dayOfWeek); // Vai para o domingo da semana
                endDate = new Date(startDate);
                endDate.setUTCDate(startDate.getUTCDate() + 6); // Vai para o sábado da semana
                endDate.setUTCHours(23, 59, 59, 999);
                break;
            case 'mes':
                startDate = new Date(Date.UTC(startOfDay.getUTCFullYear(), startOfDay.getUTCMonth(), 1));
                endDate = new Date(Date.UTC(startOfDay.getUTCFullYear(), startOfDay.getUTCMonth() + 1, 0, 23, 59, 59, 999)); // Último dia do mês
                break;
            default:
                return res.status(400).json({ message: 'Tipo de relatório inválido.' });
        }
        const appointments = await Appointment.find({ date: { $gte: startDate, $lte: endDate } }).populate('clientId', 'name').sort({ date: 1, time: 1 });
        res.status(200).json(appointments.map(app => ({
            ...app.toObject(),
            formattedDate: new Date(app.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })));
    } catch (error) {
        res.status(500).json({ message: `Erro ao buscar relatório ${req.params.tipo}.` });
    }
});


// ROTAS PARA ADICIONAR CLIENTES
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await Client.find();
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar a lista de clientes.' });
    }
});
app.get('/api/clients/:id', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) { return res.status(404).json({ message: 'Cliente não encontrado.' }); }
        res.status(200).json(client);
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor ao buscar cliente.' });
    }
});
app.post('/api/clients', async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ message: 'Nome e telefone são obrigatórios.' });
        }
        const existingClient = await Client.findOne({ phone: phone });
        if (existingClient) {
            return res.status(400).json({ message: 'Este número de telefone já está cadastrado.' });
        }
        const newClient = new Client({ name, phone, email });
        await newClient.save();
        res.status(201).json(newClient);
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        res.status(500).json({ message: 'Erro interno ao tentar salvar o cliente. Tente novamente.' });
    }
});
app.put('/api/clients/:id', async (req, res) => {
    try {
        const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedClient) { return res.status(404).json({ message: 'Cliente não encontrado.' }); }
        res.status(200).json(updatedClient);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar o cliente.' });
    }
});
app.delete('/api/clients/:id', async (req, res) => {
    try {
        const deletedClient = await Client.findByIdAndDelete(req.params.id);
        if (!deletedClient) { return res.status(404).json({ message: 'Cliente não encontrado.' }); }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir o cliente.' });
    }
});


// ROTAS PARA TRANSAÇÕES
app.get('/api/transacoes', async (req, res) => {
    try {
        const transacoes = await Transaction.find().sort({ data: -1 });
        const formattedTransactions = transacoes.map(t => {
            const d = new Date(t.data); // Data já deve estar em UTC do banco
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return {
                _id: t._id, tipo: t.tipo, descricao: t.descricao, valor: t.valor,
                appointmentId: t.appointmentId, data: `${year}-${month}-${day}` // Formata como YYYY-MM-DD
            };
        });
        res.status(200).json(formattedTransactions);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar a lista de transações.' });
    }
});
app.post('/api/transacoes', async (req, res) => {
    try {
        const { tipo, descricao, valor, data } = req.body; // Espera data como YYYY-MM-DD
        if (!tipo || !descricao || !valor || !data) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }
        const transactionDate = new Date(data + 'T00:00:00'); // Considerar fuso horário se relevante
        if (isNaN(transactionDate.getTime())) {
            return res.status(400).json({ message: 'O formato da data da transação é inválido.' });
        }
        const newTransaction = new Transaction({ ...req.body, data: transactionDate });
        await newTransaction.save();
        res.status(201).json(newTransaction);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar a transação.' });
    }
});
app.delete('/api/transacoes/:id', async (req, res) => {
    try {
        const transactionId = req.params.id;
        const transactionToDelete = await Transaction.findById(transactionId);
        if (!transactionToDelete) {
            return res.status(404).json({ message: 'Transação não encontrada.' });
        }
        // Impede exclusão de transação vinculada a agendamento concluído
        if (transactionToDelete.appointmentId) {
             // Poderia verificar se o agendamento associado está 'concluido' antes de impedir
            const associatedAppointment = await Appointment.findById(transactionToDelete.appointmentId);
            if (associatedAppointment && associatedAppointment.status === 'concluido') {
                 return res.status(400).json({ message: 'Não é possível excluir uma receita gerada automaticamente por um agendamento concluído.' });
            }
        }
        await Transaction.findByIdAndDelete(transactionId);
        res.status(200).json({ message: 'Transação excluída com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir a transação.' });
    }
});


// ROTAS PARA AUTENTICAÇÃO E GERENCIAMENTO DE USUÁRIOS
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, pin } = req.body;
        if (!pin) {
            return res.status(400).json({ message: 'PIN de ativação é obrigatório.' });
        }
        if (pin !== ACTIVATION_PIN) {
            return res.status(403).json({ message: 'PIN de ativação inválido. Entre em contato com o administrador.' });
        }
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Nome de usuário ou email já cadastrado.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Usuário registrado com sucesso! PIN validado.' });

    } catch (error) {
        console.error('Erro durante o registro com PIN:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao registrar.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) { return res.status(401).json({ message: 'Credenciais inválidas.' }); }
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) { return res.status(401).json({ message: 'Credenciais inválidas.' }); }
        res.status(200).json({ message: 'Login realizado com sucesso.' }); // Em um app real, aqui você geraria um token (JWT)
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclui o campo password da resposta
        res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro ao buscar a lista de usuários.' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userToDelete = await User.findById(userId);

        if (!userToDelete) {
            return res.status(404).json({ message: 'Usuário não encontrado para exclusão.' });
        }
        await User.findByIdAndDelete(userId);
        res.status(200).json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao tentar excluir o usuário.' });
    }
});


// ROTAS PARA ANAMNESE
app.get('/anamnese-ficha/:clientId', (req, res) => {
    // Esta rota serve um HTML. Certifique-se que o caminho está correto.
    res.sendFile(path.join(__dirname, 'anamnese', 'anamnese.html'));
});
app.post('/api/anamnese', async (req, res) => {
    try {
        const newAnamnese = new Anamnese(req.body);
        await newAnamnese.save();
        res.status(201).json({ message: 'Ficha de anamnese salva com sucesso!', id: newAnamnese._id });
    } catch (error) {
        console.error("Erro ao salvar anamnese:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao salvar ficha de anamnese.' });
    }
});
app.get('/api/anamnese/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const anamneses = await Anamnese.find({ clientId }).sort({ dataPreenchimento: -1 });
        if (anamneses.length === 0) {
            return res.status(404).json({ message: 'Nenhuma ficha de anamnese encontrada para este cliente.' });
        }
        res.status(200).json(anamneses);
    } catch (error) {
        console.error("Erro ao buscar anamneses:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar anamneses.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
