(function() {
    let inactivityTimer;
    // Define o tempo de inatividade em milissegundos
    // Exemplo: 30 minutos (30 * 60 * 1000)
    // Exemplo: 5 segundos para teste (5 * 1000)
    const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

    // Função para redirecionar para a página de logout
    function logoutUser() {
        // Limpa qualquer timer pendente para evitar execuções múltiplas
        clearTimeout(inactivityTimer);

        // Opcional: Mostrar uma mensagem antes de desconectar
        // alert("Sua sessão expirou devido à inatividade.");
        
        console.log("Usuário desconectado por inatividade.");
        // Redireciona para sua URL de logout
        // Certifique-se de que esta URL realmente invalide a sessão no servidor
        window.location.href = '/login.html'; // Mude para o seu endpoint/página de logout real
    }

    // Função para reiniciar o temporizador de inatividade
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(logoutUser, INACTIVITY_TIMEOUT_MS);
        // console.log("Temporizador de inatividade reiniciado.");
    }

    // Eventos que indicam atividade do usuário
    // 'visibilitychange' é útil para pausar/retomar quando a aba não está visível,
    // mas para o logout por inatividade, os eventos de interação direta são mais comuns.
    const activityEvents = [
        'mousemove',   // Movimento do mouse
        'mousedown',   // Clique do mouse
        'click',       // Clique (mais geral)
        'scroll',      // Rolagem da página
        'keypress',    // Pressionamento de tecla
        'touchstart',  // Toque em telas sensíveis
        'load'         // Quando a página carrega inicialmente
    ];

    // Adiciona ouvintes de eventos para reiniciar o temporizador em qualquer atividade
    activityEvents.forEach(function(eventName) {
        document.addEventListener(eventName, resetInactivityTimer, true); // O 'true' usa a fase de captura
    });

    // Inicia o temporizador quando a página é carregada
    // O evento 'load' já está na lista, então resetInactivityTimer será chamado.
    // Se não estivesse, você chamaria aqui:
    // resetInactivityTimer(); 

})(); // Função auto-executável para encapsular o escopo