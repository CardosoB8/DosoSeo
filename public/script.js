// VIP Landing Page - Share Challenge System
// Main application logic for the sharing challenge

class VipLandingPage {
    constructor() {
        // Configuration
        this.AFFILIATE_LINK = this.getAffiliateLink();
        this.STORAGE_KEY = 'vip_share_progress';
        this.TIMER_KEY = 'vip_timer_start';
        this.MAX_SHARES = 5;
        this.TIMER_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // Current state
        this.shareCount = 0;
        this.timerStart = null;
        this.successShown = false; // Track if success popup was shown
        this.lastToastTime = 0; // Prevent spam toasts
        
        // Share message template
        this.shareMessage = `🔥 ACESSO VIP LIBERADO! 🔥

🎯 Descobri um app SECRETO que está pagando até 10.000 MZN por dia!

💰 Pessoas comuns estão faturando MILHARES sem sair de casa

⚡ Mas o acesso é LIMITADO e só por 24h!

👇 Clique aqui para garantir sua vaga VIP:
${window.location.href}

#AcessoVIP #10000MZN #OportunidadeUnica`;
        
        this.initializeApp();
    }

    /**
     * Get affiliate link from environment or use fallback
     */
    getAffiliateLink() {
        // In a real environment, this would come from server-side environment variables
        // For client-side, we'll use a configurable fallback
        return window.AFFILIATE_LINK || "https://media1.placard.co.mz/redirect.aspx?pid=5905&bid=1690";
    }

    /**
     * Initialize the application
     */
    initializeApp() {
        this.loadProgress();
        this.setupEventListeners();
        this.startTimer();
        this.updateUI();
    }

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        const savedProgress = localStorage.getItem(this.STORAGE_KEY);
        const savedTimer = localStorage.getItem(this.TIMER_KEY);
        
        if (savedProgress) {
            this.shareCount = parseInt(savedProgress) || 0;
        }
        
        if (savedTimer) {
            this.timerStart = parseInt(savedTimer);
        } else {
            // Set timer start to now if not set
            this.timerStart = Date.now();
            localStorage.setItem(this.TIMER_KEY, this.timerStart.toString());
        }
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        localStorage.setItem(this.STORAGE_KEY, this.shareCount.toString());
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Button event listeners
        document.getElementById('shareBtn').addEventListener('click', () => this.handleShare());
        document.getElementById('accessBtn').addEventListener('click', () => this.handleAccess());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.handleShare();
                        break;
                    case 'Enter':
                        if (this.shareCount >= this.MAX_SHARES) {
                            e.preventDefault();
                            this.handleAccess();
                        }
                        break;
                }
            }
        });
    }

    /**
     * Start the countdown timer
     */
    startTimer() {
        this.updateTimer();
        // Update timer every second
        setInterval(() => this.updateTimer(), 1000);
    }

    /**
     * Update the countdown timer display
     */
    updateTimer() {
        const now = Date.now();
        const elapsed = now - this.timerStart;
        const remaining = Math.max(0, this.TIMER_DURATION - elapsed);
        
        if (remaining === 0) {
            // Timer expired
            document.getElementById('timer').textContent = '00:00:00';
            this.showTimerExpired();
            return;
        }
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        document.getElementById('timer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Update the UI based on current state
     */
    updateUI() {
        // Update share counter
        document.getElementById('shareCount').textContent = this.shareCount;
        
        // Update progress bar
        const progressPercent = (this.shareCount / this.MAX_SHARES) * 100;
        document.getElementById('progressBar').style.width = `${progressPercent}%`;
        
        // Update access button
        this.updateAccessButton();
        
        // Show success popup if completed and not shown yet
        if (this.shareCount >= this.MAX_SHARES && !this.successShown) {
            this.showSuccessPopup();
        }
    }

    /**
     * Update access button state
     */
    updateAccessButton() {
        const accessBtn = document.getElementById('accessBtn');
        
        if (this.shareCount >= this.MAX_SHARES) {
            accessBtn.disabled = false;
            accessBtn.className = 'btn-access-unlocked';
            accessBtn.innerHTML = `
                <i class="fas fa-unlock mr-3"></i>
                ACESSAR AGORA - DESBLOQUEADO!
            `;
        } else {
            accessBtn.disabled = true;
            accessBtn.className = 'btn-access-locked';
            accessBtn.innerHTML = `
                <i class="fas fa-lock mr-3"></i>
                Desbloqueie Compartilhando (${this.shareCount}/${this.MAX_SHARES})
            `;
        }
    }

    /**
     * Handle share button click
     */
    handleShare() {
        if (this.shareCount >= this.MAX_SHARES) {
            this.showToast('Você já completou todos os compartilhamentos necessários!', 'success');
            return;
        }
        
        // Check if user is in cooldown period
        const lastShareTime = localStorage.getItem('last_share_time');
        const now = Date.now();
        const cooldownPeriod = 10000; // 10 seconds
        
        if (lastShareTime && (now - parseInt(lastShareTime)) < cooldownPeriod) {
            const remainingTime = Math.ceil((cooldownPeriod - (now - parseInt(lastShareTime))) / 1000);
            this.showToast(`Aguarde ${remainingTime}s antes de compartilhar novamente`, 'error');
            return;
        }
        
        try {
            const encodedMessage = encodeURIComponent(this.shareMessage);
            const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
            
            // Open WhatsApp
            window.open(whatsappUrl, '_blank');
            
            // Show immediate feedback
            this.showToast('WhatsApp aberto! Aguarde 10s para confirmar o compartilhamento...', 'success');
            
            // Disable share button temporarily
            const shareBtn = document.getElementById('shareBtn');
            const originalText = shareBtn.innerHTML;
            shareBtn.disabled = true;
            
            // Countdown timer for share confirmation
            let countdown = 10;
            const countdownInterval = setInterval(() => {
                shareBtn.innerHTML = `<i class="fas fa-clock mr-2"></i>Aguarde ${countdown}s`;
                countdown--;
                
                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    
                    // Increment share count after delay
                    this.shareCount++;
                    this.saveProgress();
                    localStorage.setItem('last_share_time', now.toString());
                    this.updateUI();
                    
                    // Re-enable button
                    shareBtn.disabled = false;
                    shareBtn.innerHTML = originalText;
                    
                    // Show success message
                    this.showToast(`Compartilhamento ${this.shareCount}/${this.MAX_SHARES} confirmado!`, 'success');
                    
                    // Don't show extra toast when completed - popup will handle it
                }
            }, 1000);
            
        } catch (error) {
            console.error('Share error:', error);
            this.showToast('Erro ao compartilhar. Tente novamente.', 'error');
        }
    }

    /**
     * Handle access button click
     */
    handleAccess() {
        if (this.shareCount < this.MAX_SHARES) {
            this.showToast(`Você precisa compartilhar com mais ${this.MAX_SHARES - this.shareCount} amigos para desbloquear!`, 'error');
            return;
        }
        
        try {
            // Redirect to affiliate link
            window.open(this.AFFILIATE_LINK, '_blank');
            this.showToast('Redirecionando para seu acesso VIP...', 'success');
        } catch (error) {
            console.error('Access error:', error);
            this.showToast('Erro ao acessar. Tente novamente.', 'error');
        }
    }

    /**
     * Show success popup when challenge is completed
     */
    showSuccessPopup() {
        if (this.successShown) return; // Prevent showing multiple times
        this.successShown = true;
        
        const popup = document.getElementById('successPopup');
        const popupContent = document.getElementById('popupContent');
        
        // Show popup
        popup.classList.remove('hidden');
        popup.classList.add('flex');
        
        // Animate popup
        setTimeout(() => {
            popupContent.style.transform = 'scale(1)';
        }, 100);
        
        // Setup popup access button
        const popupAccessBtn = document.getElementById('popupAccessBtn');
        popupAccessBtn.onclick = () => {
            this.handleAccess();
            this.closeSuccessPopup();
        };
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            this.closeSuccessPopup();
        }, 10000);
    }
    
    /**
     * Close success popup
     */
    closeSuccessPopup() {
        const popup = document.getElementById('successPopup');
        const popupContent = document.getElementById('popupContent');
        
        popupContent.style.transform = 'scale(0)';
        setTimeout(() => {
            popup.classList.add('hidden');
            popup.classList.remove('flex');
        }, 300);
    }

    /**
     * Show timer expired message
     */
    showTimerExpired() {
        this.showToast('⏰ Tempo esgotado! Esta oferta expirou.', 'error');
        
        // Disable all interactions
        document.getElementById('shareBtn').disabled = true;
        document.getElementById('accessBtn').disabled = true;
        
        // Add expired styling
        const vipCard = document.querySelector('.vip-card');
        vipCard.style.opacity = '0.6';
        vipCard.style.filter = 'grayscale(0.5)';
    }

    /**
     * Reset the challenge (for testing or admin purposes)
     */
    resetChallenge() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.TIMER_KEY);
        this.shareCount = 0;
        this.timerStart = Date.now();
        localStorage.setItem(this.TIMER_KEY, this.timerStart.toString());
        this.updateUI();
        this.showToast('Desafio reiniciado!', 'success');
    }

    /**
     * Show toast notification with spam prevention
     */
    showToast(message, type = 'success') {
        const now = Date.now();
        
        // Prevent spam - only show toast every 2 seconds minimum
        if (now - this.lastToastTime < 2000) {
            return;
        }
        this.lastToastTime = now;
        
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        
        // Reset and set proper styling with high contrast
        if (type === 'error') {
            toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-xl border-2 border-red-400 transform translate-x-full transition-all duration-300 z-40 opacity-1 pointer-events-auto';
        } else {
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-xl border-2 border-green-400 transform translate-x-full transition-all duration-300 z-40 opacity-1 pointer-events-auto';
        }
        
        // Show toast with better visibility
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        }, 100);
        
        // Hide completely after 3 seconds
        setTimeout(() => {
            toast.classList.remove('translate-x-0', 'opacity-100');
            toast.classList.add('translate-x-full', 'opacity-0');
            
            // Reset to completely hidden state after animation
            setTimeout(() => {
                toast.className = 'fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-40 opacity-0 pointer-events-none';
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded and store globally
document.addEventListener('DOMContentLoaded', () => {
    window.vipApp = new VipLandingPage();
});

// Admin function for testing (accessible via browser console)
window.resetVipChallenge = function() {
    if (window.vipApp) {
        window.vipApp.resetChallenge();
    }
};

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VipLandingPage;
}
