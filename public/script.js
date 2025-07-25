// Countdown Timer
function initCountdown() {
    const countdownElement = document.getElementById('countdown');
    let minutes = 2;
    let seconds = 13;

    function updateCountdown() {
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        countdownElement.textContent = `${formattedMinutes}:${formattedSeconds}`;

        if (seconds === 0) {
            if (minutes === 0) {
                // Reset countdown when it reaches 00:00
                minutes = 2;
                seconds = 13;
            } else {
                minutes--;
                seconds = 59;
            }
        } else {
            seconds--;
        }
    }

    // Update immediately and then every second
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// FAQ Toggle Functionality
function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const answer = faqItem.querySelector('.faq-answer');
            const icon = question.querySelector('i');
            
            // Toggle current item
            const isOpen = answer.classList.contains('hidden');
            
            // Close all other FAQ items
            faqQuestions.forEach(otherQuestion => {
                const otherItem = otherQuestion.parentElement;
                const otherAnswer = otherItem.querySelector('.faq-answer');
                const otherIcon = otherQuestion.querySelector('i');
                
                if (otherQuestion !== question) {
                    otherAnswer.classList.add('hidden');
                    otherQuestion.classList.remove('active');
                    otherIcon.style.transform = 'rotate(0deg)';
                }
            });
            
            // Toggle current item
            if (isOpen) {
                answer.classList.remove('hidden');
                question.classList.add('active');
                icon.style.transform = 'rotate(180deg)';
            } else {
                answer.classList.add('hidden');
                question.classList.remove('active');
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// Intersection Observer for animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements that should animate on scroll
    const animatedElements = document.querySelectorAll('.winner-card, .step-card, .faq-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Particle effect
function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + 'vw';
    particle.style.width = particle.style.height = Math.random() * 4 + 2 + 'px';
    particle.style.animationDuration = Math.random() * 3 + 2 + 's';
    document.body.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 5000);
}

// CTA Button click handlers
function initCTAButtons() {
    const ctaButtons = document.querySelectorAll('.cta-button, .cta-button-secondary');
    const modal = document.getElementById('successModal');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Show popup modal
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Add loading state to button
            button.classList.add('loading');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Carregando...';
            
            // Simulate loading and redirect
            setTimeout(() => {
                button.classList.remove('loading');
                button.innerHTML = originalText;
                document.body.style.overflow = 'auto';
                
                // Redirect to the actual affiliate link
                window.location.href = 'https://media1.placard.co.mz/redirect.aspx?pid=5905&bid=1690';
            }, 2500);
        });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
}

// Dynamic winner updates (simulated)
function initDynamicWinners() {
    const winners = [
        { name: 'Carlos', amount: '+800 MZN', time: 'há 5 minutos' },
        { name: 'Joana', amount: '+320 MZN', time: 'há 12 minutos' },
        { name: 'Mauro', amount: '+1200 MZN', time: 'há 18 minutos' },
        { name: 'Ana', amount: '+540 MZN', time: 'há 25 minutos' },
        { name: 'Pedro', amount: '+890 MZN', time: 'há 32 minutos' },
        { name: 'Maria', amount: '+670 MZN', time: 'há 38 minutos' }
    ];
    
    let currentIndex = 0;
    
    setInterval(() => {
        const winnerCards = document.querySelectorAll('.winner-card');
        if (winnerCards.length > 0) {
            const randomCard = winnerCards[Math.floor(Math.random() * winnerCards.length)];
            const nameElement = randomCard.querySelector('h3');
            const amountElement = randomCard.querySelector('.text-neon-green, .text-neon-blue, .text-yellow-400');
            const timeElement = randomCard.querySelector('.text-gray-400');
            
            // Add fade effect
            randomCard.style.opacity = '0.5';
            
            setTimeout(() => {
                const newWinner = winners[currentIndex % winners.length];
                nameElement.textContent = newWinner.name;
                amountElement.textContent = newWinner.amount;
                timeElement.textContent = newWinner.time;
                
                randomCard.style.opacity = '1';
                currentIndex++;
            }, 300);
        }
    }, 15000); // Update every 15 seconds
}

// Mobile menu toggle (if needed)
function initMobileMenu() {
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initCountdown();
    initFAQ();
    initSmoothScrolling();
    initScrollAnimations();
    initCTAButtons();
    initDynamicWinners();
    initMobileMenu();
    
    // Create particles periodically
    setInterval(createParticle, 2000);
    
    // Add loading state to page
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Performance optimization: Throttle scroll events
function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add scroll effects
window.addEventListener('scroll', throttle(() => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.5;
    
    // Parallax effect for background elements
    const backgroundElements = document.querySelectorAll('.fixed div');
    backgroundElements.forEach(el => {
        el.style.transform = `translateY(${rate}px)`;
    });
}, 16));

// Add click ripple effect
function addRippleEffect(e) {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add ripple effect to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', addRippleEffect);
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
});

// CSS for ripple effect
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);
