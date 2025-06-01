document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const nav = document.getElementById('main-navigation'); // Certifique-se que sua tag <nav> tem id="main-navigation"

    if (hamburgerMenu && nav) {
        hamburgerMenu.addEventListener('click', function() {
            nav.classList.toggle('nav-active'); // Adiciona ou remove a classe .nav-active da <nav>
            
            // Atualiza atributos ARIA para acessibilidade
            const isExpanded = nav.classList.contains('nav-active');
            this.setAttribute('aria-expanded', isExpanded);

            // Opcional: Mudar o ícone do botão hambúrguer de ☰ para X e vice-versa
            if (isExpanded) {
                this.innerHTML = '&times;'; // Código HTML para o ícone de fechar (X)
                this.setAttribute('aria-label', 'Fechar menu');
            } else {
                this.innerHTML = '&#9776;'; // Código HTML para o ícone de hambúrguer (☰)
                this.setAttribute('aria-label', 'Abrir menu');
            }
        });
    }

    // Lógica para os botões de toggle dos submenus
    const submenuToggles = document.querySelectorAll('.submenu-toggle'); // Seleciona todos os botões com a classe .submenu-toggle

    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(event) {
            event.preventDefault(); // Previne qualquer ação padrão do botão
            const submenu = this.nextElementSibling; // Pega o elemento .submenu que é o próximo irmão do botão
            
            if (submenu && submenu.classList.contains('submenu')) {
                submenu.classList.toggle('submenu-active'); // Adiciona ou remove a classe .submenu-active do submenu
                
                // Atualiza atributos ARIA no botão de toggle
                const isSubmenuExpanded = submenu.classList.contains('submenu-active');
                this.setAttribute('aria-expanded', isSubmenuExpanded);
                
                // Muda o texto do botão (ex: de '+' para '-')
                this.textContent = isSubmenuExpanded ? '-' : '+';
            }
        });
    });
});