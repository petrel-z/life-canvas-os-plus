(() => {
  const concepts = window.brandConcepts;
  const $ = selector => document.querySelector(selector);
  let active = concepts[0], variant = 'default', screen = 'home';
  const variantFile = () => variant === 'default' ? 'app-icon' : 'app-icon-' + variant;
  $('#concepts').innerHTML = concepts.map((c, index) => `<button type="button" class="concept-button" data-concept="${c.id}" aria-pressed="${index === 0}"><img src="${c.id}/app-icon.svg" alt=""><span><strong>${c.name}</strong><small>${c.tag}</small></span><i aria-hidden="true"></i></button>`).join('');
  function render() {
    document.querySelectorAll('[data-concept]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.concept === active.id)));
    document.querySelectorAll('[data-variant]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.variant === variant)));
    document.querySelectorAll('[data-screen]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.screen === screen)));
    for (const [id, value] of Object.entries({'concept-tag': active.tag, 'brand-name': active.name, roman: active.roman, pronunciation: active.pronunciation, tagline: active.tagline, meaning: active.meaning, 'symbol-title': active.symbol, 'symbol-description': active.description, fit: active.fit})) $('#' + id).textContent = value;
    $('#concept-number').textContent = '0' + (concepts.indexOf(active) + 1) + ' / 03';
    $('#hero-icon').src = `${active.id}/${variantFile()}.svg`;
    $('#hero-icon').alt = `${active.name} · ${active.symbol}图标`;
    document.querySelectorAll('[data-size]').forEach(img => { img.src = $('#hero-icon').src; });
    $('#mono').src = `${active.id}/mark.svg`;
    $('#reverse').src = `${active.id}/mark-reversed.svg`;
    $('#context-preview').src = `${active.id}/context-${screen}.png`;
    $('#context-preview').alt = `${active.name}在${screen === 'home' ? '饮食首页' : '新对话欢迎页'}的应用效果`;
    $('#palette').innerHTML = [active.color, active.paper, active.accent].map(color => `<span class="swatch"><i style="background:${color}"></i><small>${color}</small></span>`).join('');
    $('#download-svg').href = `${active.id}/${variantFile()}.svg`;
    $('#download-png').href = `${active.id}/${variantFile()}-1024.png`;
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.concept) { active = concepts.find(c => c.id === button.dataset.concept); variant = 'default'; }
    else if (button.dataset.variant) variant = button.dataset.variant;
    else if (button.dataset.screen) screen = button.dataset.screen;
    else return;
    render();
  });
  render();
})();
