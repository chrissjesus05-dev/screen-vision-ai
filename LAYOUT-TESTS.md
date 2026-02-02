# Teste de Layouts - Execute no Console

Abra DevTools (F12) → Console e execute cada teste abaixo.

---

## Teste 1: Verificar classe do body

```javascript
console.log('Classes no body:', document.body.className);
```

**Resultado Esperado**: Deve mostrar `"layout-single"` ou `"layout-dashboard"` etc.

---

## Teste 2: Forçar Layout Dashboard

```javascript
// Remover todas as classes de layout
document.body.classList.remove('layout-single', 'layout-sidebar', 'layout-dashboard', 'layout-minimal');

// Adicionar layout dashboard
document.body.classList.add('layout-dashboard');

console.log('Body agora:', document.body.className);
```

**OBSERVE A TELA**: O layout mudou para grid 2x2?

---

## Teste 3: Verificar CSS do .content-grid

```javascript
const contentGrid = document.querySelector('.content-grid');
const computedStyle = getComputedStyle(contentGrid);

console.log('grid-template-columns:', computedStyle.gridTemplateColumns);
console.log('gap:', computedStyle.gap);
```

---

## Teste 4: Verificar se layouts.css foi carregado

```javascript
const allStyleSheets = Array.from(document.styleSheets);
const layoutsCSS = allStyleSheets.find(sheet => sheet.href && sheet.href.includes('layouts'));

if (layoutsCSS) {
    console.log('✅ layouts.css CARREGADO');
} else {
    console.log('❌ layouts.css NÃO CARREGADO!');
}
```

---

## ME ENVIE:
1. Teste 1: Qual classe apareceu?
2. Teste 2: O layout mudou visualmente?
3. Teste 3: Qual valor de grid-template-columns?
4. Teste 4: layouts.css está carregado?
