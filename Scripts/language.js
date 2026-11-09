const translations = {
  "menu": { "en": "Menu", "es": "Menú" },
  "aboutMe": { "en": "More about me", "es": "Más sobre mí" },
  "text0": {
    "en": "Skip to content",
    "es": "Ir al contenido"
  },
  "text1": {
    "en": "Software development & cybersecurity",
    "es": "Desarrollo de software & ciberseguridad"
  },
  "text2": {
    "en": "Software developer and Level 2 SOC analyst. Process automation, threat analysis, and solutions that connect development and security.",
    "es": "Desarrollador de software y analista SOC de nivel 2. Automatización de procesos, análisis de amenazas y soluciones que conectan desarrollo y seguridad."
  },
  "text3": {
    "en": "Summary",
    "es": "Resumen"
  },
  "text4": {
    "en": "Education",
    "es": "Formación"
  },
  "text5": {
    "en": "Experience",
    "es": "Experiencia"
  },
  "text7": {
    "en": "Development with a security mindset.",
    "es": "Desarrollo con perspectiva de seguridad."
  },
  "text8": {
    "en": "My work combines tool development, code analysis, and automation to improve security operations.",
    "es": "Mi trabajo combina desarrollo de herramientas, análisis de código y automatización para mejorar las operaciones de seguridad."
  },
  "text9": {
    "en": "Software development education at Universitaria Agustiniana and continuous learning in technology and cybersecurity.",
    "es": "Formación en desarrollo de software en la Universitaria Agustiniana y aprendizaje continuo en tecnología y ciberseguridad."
  },
  "text10": {
    "en": "Experience at Appgate, Am?ricas BPS, and Teleperformance in software analysis, reporting, and information security.",
    "es": "Experiencia en Appgate, Américas BPS y Teleperformance, en análisis de software, reportes y seguridad de la información."
  },
  "text11": {
    "en": "More about me",
    "es": "Más sobre mí"
  },
  "text12": {
    "en": "Dungeons & Dragons, strategy games, travel, and photography.",
    "es": "Dungeons & Dragons, videojuegos de estrategia, viajes y fotografía."
  },
  "text13": {
    "en": "Get in touch",
    "es": "Hablemos"
  },
  "text14": {
    "en": "Contact",
    "es": "Contacto"
  },
  "text15": {
    "en": "Jhonattan Garcia ? Personal portfolio",
    "es": "Jhonattan Garcia · Portafolio personal"
  },
  "cta": {
    "en": "Let us talk",
    "es": "Conversemos"
  },
  "language": {
    "en": "Language",
    "es": "Idioma"
  }
};

const languageSelector = document.getElementById('language');
function setLanguage(language) {
    if (!['en', 'es'].includes(language)) language = 'en';
    document.documentElement.lang = language;
    languageSelector.value = language;
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const text = translations[element.dataset.i18n]?.[language];
        if (text) element.textContent = text;
    });
    const english = language === 'en';
    document.title = english ? 'Jhonattan Garcia | Software & Cybersecurity' : 'Jhonattan Garcia | Software y ciberseguridad';
    document.querySelector('meta[name="description"]').content = english
        ? 'Portfolio of Jhonattan Garcia: software development, cybersecurity, and professional experience.'
        : 'Portafolio de Jhonattan Garcia: desarrollo de software, ciberseguridad y experiencia profesional.';
    document.querySelector('.brand').setAttribute('aria-label', english ? 'Jhonattan Garcia, home' : 'Jhonattan Garcia, inicio');
    document.querySelector('.section-nav').setAttribute('aria-label', english ? 'Curriculum sections' : 'Secciones del currículum');
}
languageSelector.addEventListener('change', event => {
    setLanguage(event.target.value);
    try { localStorage.setItem('portfolio-language', event.target.value); } catch {}
});
let savedLanguage = 'en';
try { savedLanguage = localStorage.getItem('portfolio-language') || 'en'; } catch {}
setLanguage(savedLanguage);
