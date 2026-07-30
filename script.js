const menuButton = document.getElementById("menuButton");
const navigation = document.getElementById("navigation");
const navLinks = document.querySelectorAll(".nav-link");

menuButton.addEventListener("click", () => {
    navigation.classList.toggle("show");

    if (navigation.classList.contains("show")) {
        menuButton.textContent = "✕";
    } else {
        menuButton.textContent = "☰";
    }
});


navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        navigation.classList.remove("show");
        menuButton.textContent = "☰";

        navLinks.forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});


const counters = document.querySelectorAll(".counter");

const startCounter = (counter) => {
    const target = Number(counter.dataset.target);

    let current = 0;

    const increment = Math.max(1, Math.floor(target / 60));

    const updateCounter = () => {
        current += increment;

        if (current >= target) {
            counter.textContent = target;
            return;
        }

        counter.textContent = current;

        requestAnimationFrame(updateCounter);
    };

    updateCounter();
};


const counterObserver = new IntersectionObserver(
    (entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                startCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    },
    {
        threshold: 0.5
    }
);


counters.forEach((counter) => {
    counterObserver.observe(counter);
});


const resultForm = document.getElementById("resultForm");
const applicationId = document.getElementById("applicationId");
const formMessage = document.getElementById("formMessage");

resultForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const value = applicationId.value.trim();

    if (!value) {
        formMessage.textContent =
            "Ariza yoki ruxsatnoma raqamini kiriting.";

        return;
    }

    formMessage.textContent =
        `"${value}" raqamli natija backend ulangandan keyin ko‘rsatiladi.`;
});