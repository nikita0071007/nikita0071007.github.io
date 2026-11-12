const projectForm = document.querySelector('#project-form');
const briefResult = document.querySelector('#brief-result');
const briefText = document.querySelector('#brief-text');
const briefStatus = document.querySelector('#brief-status');

let deliveryReady = false;
let challengeToken = '';
let challengeWidget;
let leadId = crypto.randomUUID();
projectForm.addEventListener('input', () => { leadId = crypto.randomUUID(); });
projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = new FormData(projectForm);
  briefText.value = [
    'Здравствуйте, Никита! Хочу обсудить проект.',
    '',
    `Меня зовут: ${fields.get('name').trim()}`,
    `Связаться со мной: ${fields.get('contact').trim()}`,
    `Нужно: ${fields.get('service')}`,
    `Бюджет: ${fields.get('budget')}`,
    '',
    fields.get('task').trim(),
    '',
    selections.design,
    selections.estimate,
  ].join('\n');
  briefResult.hidden = false;
  const telegramUrl = 'https://t.me/daspasibog?text=' + encodeURIComponent(briefText.value);
  document.querySelector('#send-telegram').href = telegramUrl;
  document.querySelector('#send-email').href = 'mailto:gusevmade@mail.ru?subject=' + encodeURIComponent('Заявка на проект GUSEVMADE') + '&body=' + encodeURIComponent(briefText.value);
  if (!deliveryReady) {
    briefStatus.textContent = 'Заявка готова. В Telegram осталось нажать «Отправить». Если приложение не открылось, используйте кнопки ниже.';
    window.open(telegramUrl, '_blank', 'noopener');
    return;
  }
  const button = document.querySelector('#submit-lead');
  const status = document.querySelector('#delivery-status');
  if (!challengeToken) { status.textContent = 'Дождитесь проверки формы.'; return; }
  button.disabled = true;
  status.textContent = 'Отправляем заявку…';
  briefResult.hidden = true;
  try {
    const payload = Object.fromEntries(fields.entries());
    Object.assign(payload, {id:leadId, token:challengeToken, design:selections.design, estimate:selections.estimate});
    const response = await fetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(35000)});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Не удалось отправить заявку.');
    status.textContent = result.message;
    briefResult.hidden = true;
    leadId = crypto.randomUUID();
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' ? 'Ответ не получен. Попробуйте снова или свяжитесь напрямую.' : error.message;
    briefResult.hidden = false;
    briefStatus.textContent = 'Автоматическая отправка не подтверждена. Можно отправить готовый текст через Telegram или почту.';
  } finally {
    button.disabled = false; challengeToken = '';
    if (window.turnstile && challengeWidget !== undefined) window.turnstile.reset(challengeWidget);
  }
});

document.querySelector('#copy-brief').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(briefText.value);
    briefStatus.textContent = 'Скопировано. Откройте Telegram, вставьте текст и отправьте сообщение.';
  } catch {
    briefText.focus();
    briefText.select();
    briefStatus.textContent = 'Текст выделен. Скопируйте его через меню устройства и отправьте в Telegram.';
  }
});

const selections = { estimate: '', design: '' };
const packageSelect = document.querySelector('#estimate-package');
const packageData = {
  start: { title: 'Лендинг Start', price: 30000 },
  business: { title: 'Лендинг Business', price: 45000 },
  site: { title: 'Сайт под ключ', price: 70000 },
  shop: { title: 'Интернет-магазин', price: 60000 },
};
const extraNames = {
  texts: 'Подготовка текстов',
  cms: 'Управление контентом',
  crm: 'Интеграция с CRM',
  motion: 'Индивидуальная анимация',
};
const money = (amount) => `${amount.toLocaleString('ru-RU')} ₽`;

function calculateEstimate() {
  const base = packageData[packageSelect.value];
  const selectedExtras = [...document.querySelectorAll('[name="extra"]:checked')];
  const total = selectedExtras.reduce((sum, field) => sum + Number(field.dataset.price), base.price);
  const lines = [base.title, ...selectedExtras.map((field) => extraNames[field.value])];
  document.querySelector('#estimate-total').textContent = `от ${money(total)}`;
  document.querySelector('#estimate-deposit').textContent = `Ориентир предоплаты — ${money(total / 2)}.`;
  document.querySelector('#estimate-lines').textContent = lines.join(' + ');
  return `Предварительный расчёт: ${lines.join(' + ')}. От ${money(total)} за разработку, внешние расходы отдельно.`;
}

document.querySelector('#estimate').addEventListener('change', calculateEstimate);
document.querySelectorAll('[data-package]').forEach((button) => {
  button.addEventListener('click', () => {
    packageSelect.value = button.dataset.package;
    calculateEstimate();
    document.querySelector('#estimate').scrollIntoView({ block: 'start' });
    packageSelect.focus({ preventScroll: true });
  });
});

function openBriefWithSelection() {
  document.querySelector('#selection-status').textContent = [selections.design, selections.estimate].filter(Boolean).join(' ');
  briefResult.hidden = true;
  document.querySelector('#contact').scrollIntoView({ block: 'start' });
  projectForm.elements.name.focus({ preventScroll: true });
}

document.querySelector('#use-estimate').addEventListener('click', () => {
  selections.estimate = calculateEstimate();
  projectForm.elements.service.value = 'Сайт или лендинг';
  openBriefWithSelection();
});
calculateEstimate();

const designForm = document.querySelector('#design-form');
const miniSite = document.querySelector('#mini-site');
const styleNames = {
  premium: 'Сдержанный и премиальный',
  minimal: 'Светлый и минималистичный',
  bold: 'Яркий и современный',
};
const accentColors = { gold: '#e7c780', blue: '#8ec6f5', green: '#80cdb3' };
const lightColors = { gold: '#95630e', blue: '#155b97', green: '#166852' };
const sectionNames = { services: 'Услуги', gallery: 'Работы', about: 'О компании' };

function updateDesign() {
  const style = document.querySelector('#design-style').value;
  const accent = designForm.querySelector('[name="accent"]:checked').value;
  miniSite.classList.remove('premium', 'minimal', 'bold');
  miniSite.classList.add(style);
  miniSite.style.setProperty('--accent', (style === 'minimal' ? lightColors : accentColors)[accent]);
  miniSite.style.setProperty('--cta-ink', style === 'minimal' ? '#ffffff' : '#09171e');
  document.querySelector('#mini-brand').textContent = document.querySelector('#design-name').value.trim() || 'Ваш бренд';
  document.querySelector('#mini-title').textContent = document.querySelector('#design-task').value.trim() || 'Ваша идея начинается здесь';
  designForm.querySelectorAll('[name="section"]').forEach((field) => {
    document.querySelector(`#mini-${field.value}`).hidden = !field.checked;
  });
}
designForm.addEventListener('input', updateDesign);
designForm.addEventListener('change', updateDesign);
document.querySelectorAll('[data-device]').forEach((button) => {
  button.addEventListener('click', () => {
    miniSite.classList.toggle('mobile', button.dataset.device === 'mobile');
    document.querySelectorAll('[data-device]').forEach((control) => {
      control.setAttribute('aria-pressed', String(control === button));
    });
  });
});
designForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const style = document.querySelector('#design-style').value;
  const sections = [...designForm.querySelectorAll('[name="section"]:checked')].map((field) => sectionNames[field.value]);
  const accent = designForm.querySelector('[name="accent"]:checked').parentElement.textContent.trim();
  selections.design = `Эскиз: ${document.querySelector('#mini-brand').textContent}. Стиль: ${styleNames[style]}. Цвет: ${accent}. Блоки: ${sections.join(', ') || 'первый экран и контакты'}. О бизнесе: ${document.querySelector('#mini-title').textContent}.`;
  projectForm.elements.service.value = 'Сайт или лендинг';
  openBriefWithSelection();
});
updateDesign();

// Articulated eagle: four independent WebP layers, transform/opacity only.
const coverStage = document.querySelector('#cover-stage');
const replayCover = document.querySelector('#cover-replay');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let landingTimer;
let arrivalReady = false;
function playCover() {
  if (reducedMotion.matches || !arrivalReady) return;
  clearTimeout(landingTimer);
  coverStage.classList.remove('is-flying');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (reducedMotion.matches) return;
    coverStage.classList.add('is-flying');
    landingTimer = setTimeout(() => coverStage.classList.remove('is-flying'), 5000);
  }));
}
Promise.all([...coverStage.querySelectorAll('img')].map(img => img.decode())).then(() => {
  arrivalReady = true;
  let seen = false;
  try { seen = sessionStorage.getItem('eagle-rig-v12'); sessionStorage.setItem('eagle-rig-v12','1'); } catch {}
  if (!seen && window.scrollY < coverStage.clientHeight) playCover();
}).catch(() => { replayCover.hidden = true; });
replayCover.addEventListener('click', playCover);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) { clearTimeout(landingTimer); coverStage.classList.remove('is-flying'); }
});
const topButton = document.querySelector('.back-top');
new IntersectionObserver(entries => topButton.classList.toggle('visible', !entries[0].isIntersecting), {threshold:0}).observe(document.querySelector('.cover'));

// Accessible mobile navigation; links remain visible when JavaScript is unavailable.
const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');
document.documentElement.classList.add('menu-ready');
function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
  mainNav.classList.remove('is-open');
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mainNav.classList.toggle('is-open', open);
});
mainNav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mainNav.classList.contains('is-open')) { closeMenu(); menuToggle.focus(); }
});
window.matchMedia('(max-width: 700px)').addEventListener('change', closeMenu);
for (const field of document.querySelectorAll('input[required], textarea[required]')) {
  function validate() {
    const minimum = Math.max(field.minLength, 1);
    field.setCustomValidity(field.value.trim().length < minimum ? `Заполните поле: не менее ${minimum} символов, без пробелов по краям.` : '');
  }
  field.addEventListener('input', validate);
  validate();
}
const stickyOrder = document.querySelector('.mobile-order');
new IntersectionObserver(entries => {
  stickyOrder.classList.toggle('is-hidden', entries[0].isIntersecting);
}, { threshold: 0 }).observe(document.querySelector('#contact'));
document.addEventListener('focusin', event => {
  document.body.classList.toggle('editing-field', event.target.matches('input,textarea,select'));
});
document.addEventListener('focusout', () => document.body.classList.remove('editing-field'));

// Reveals are opt-in; all content stays visible without JS or with reduced motion.
const revealTargets = document.querySelectorAll('.section-heading, .project, .service-grid article, .person, .package-grid article');
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); }
    });
  }, { threshold: .08 });
  revealTargets.forEach(el => { el.classList.add('reveal'); observer.observe(el); });
}
const icons = {
 telegram: '<path d="m3 11 18-7-4 17-6-6-4 3 1-6 9-5-7 7"/>',
 mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
 github: '<path d="M9 20v-3c-4 1-4-2-5-2m12 5v-4c3-1 4-3 4-6 0-2-1-3-2-4V3l-4 2h-4L6 3v3c-1 1-2 2-2 4 0 3 2 5 5 6"/>',
 store: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 7h6M9 11h6M11 17h2"/>'
};
document.querySelectorAll('a[href]').forEach(link => {
 if (link.classList.contains('project-art') || link.classList.contains('office-art')) return;
 const href = link.getAttribute('href');
 const kind = href.includes('t.me/') ? 'telegram' : href.startsWith('mailto:') ? 'mail' : href.includes('github.com') ? 'github' : href.includes('rustore.ru') ? 'store' : null;
 if (kind) link.insertAdjacentHTML('afterbegin', `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[kind]}</svg>`);
});

fetch('/api/lead-config').then(response => response.json()).then(config => {
  if (!config.ready) return;
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.onload = () => {
    challengeWidget = window.turnstile.render('#anti-spam', {sitekey:config.siteKey,action:'lead',theme:'dark',callback:token => {challengeToken=token;},'expired-callback':()=>{challengeToken='';}});
    deliveryReady = true;
    document.querySelector('#submit-lead').textContent = 'Отправить заявку →';
    document.querySelector('#delivery-note').textContent = 'Заявка поступит на почту Никиты. Telegram используется для уведомления. Можно также написать напрямую.';
  };
  document.head.appendChild(script);
}).catch(() => { /* Direct contact remains usable when configuration is unavailable. */ });

// Reviews: only real reviews with consent from reviews.json; otherwise the "Скоро" placeholder stays.
fetch('reviews.json').then(r => r.ok ? r.json() : []).then(items => {
  const list = document.querySelector('#reviews-list');
  const real = (Array.isArray(items) ? items : []).filter(x => x && x.consent === true && x.text && x.name);
  if (!list || !real.length) return;
  list.innerHTML = '';
  real.forEach(x => {
    const el = document.createElement('article');
    el.className = 'review-card';
    const q = document.createElement('p'); q.textContent = '«' + x.text + '»';
    const n = document.createElement('strong'); n.textContent = x.name + (x.role ? ', ' + x.role : '');
    el.append(q, n); list.appendChild(el);
  });
}).catch(() => {});
