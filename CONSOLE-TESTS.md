# Scripts de Teste - Console DevTools

Copie e cole cada comando no Console (F12 → Console) da aplicação Electron.

---

## Teste 1: Verificar Variáveis CSS

```javascript
console.log('--color-primary:', getComputedStyle(document.documentElement).getPropertyValue('--color-primary'));
console.log('--bg-tertiary:', getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary'));
console.log('--border-color:', getComputedStyle(document.documentElement).getPropertyValue('--border-color'));
```

---

## Teste 2: Mudar Cor DIRETAMENTE (deve ficar vermelho)

```javascript
document.documentElement.style.setProperty('--color-primary', '#FF0000');
document.documentElement.style.setProperty('--accent-primary', '#FF0000');
```

**OBSERVE**: Os botões ficaram vermelhos? Se SIM, o problema é no setTheme(). Se NÃO, o problema é no CSS.

---

## Teste 3: Listar TODAS as Variáveis CSS

```javascript
const allStyles = getComputedStyle(document.documentElement);
const customProps = [];
for (let i = 0; i < allStyles.length; i++) {
    const prop = allStyles[i];
    if (prop.startsWith('--')) {
        customProps.push({
            property: prop,
            value: allStyles.getPropertyValue(prop).trim()
        });
    }
}
console.table(customProps);
```

---

## Teste 4: Verificar Background de Elemento

```javascript
const chatSection = document.querySelector('.chat-section');
console.log('Background da .chat-section:', getComputedStyle(chatSection).backgroundColor);
```

---

**POR FAVOR, EXECUTE ESSES 4 TESTES E ME DIGA:**
1. Teste 2 deixou os botões vermelhos? (SIM ou NÃO)
2. Copie a tabela do Teste 3 aqui
