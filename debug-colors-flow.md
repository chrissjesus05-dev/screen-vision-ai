# Diagnóstico: Fluxo de Aplicação de Cores

## Fluxo Atual

```
User clicks cor → handleColorChange() → generatePaletteFromColor() 
→ setPreviewTheme() → User clicks "Apply Theme" → handleApply() 
→ setTheme(previewTheme) → customizationService.setTheme() 
→ applyTheme() → document.documentElement.style.setProperty()
```

## Pontos de Verificação

### 1. ColorPicker (src/components/customization/ColorPicker.jsx)

**Linha 60-65**: `handleApply()`
```javascript
const handleApply = () => {
    if (previewTheme) {
        setTheme(previewTheme);
    }
    onClose();
};
```

**Linha 173-185**: `generatePaletteFromColor()`
```javascript
return {
    primary: primary,
    secondary: hslToHex(adjustHSL(hsl, 30, 0, -10)),
    accent: hslToHex(adjustHSL(hsl, 60, 10, 0)),
    mode: mode
};
```

⚠️ **PROBLEMA POTENCIAL**: `generatePaletteFromColor` retorna apenas `{primary, secondary, accent, mode}`. Mas o `customizationService.applyTheme()` espera `theme.primary`, `theme.secondary`, `theme.accent` e usa `getBackgroundColors(theme.mode)` para background/text.

### 2. useCustomization Hook (src/hooks/useCustomization.js)

**Esperado**: Deve chamar `customizationService.setTheme(theme)`

### 3. customizationService (src/services/customizationService.js)

**Linha 107-111**: `setTheme()`
```javascript
setTheme(theme) {
    this.settings.theme = { ...this.settings.theme, ...theme };
    this.applyTheme();
    this.saveSettings();
}
```

✅ **OK**: Faz merge do tema atual com o novo

**Linha 116-153**: `applyTheme()`
```javascript
applyTheme() {
    const { theme } = this.settings;
    const root = document.documentElement;

    // Apply all theme colors
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-accent', theme.accent);

    // Apply background and text colors based on mode
    const bgColors = this.getBackgroundColors(theme.mode);
    root.style.setProperty('--color-background', bgColors.background);
    root.style.setProperty('--color-surface', bgColors.surface);
    root.style.setProperty('--color-text', bgColors.text);
    root.style.setProperty('--color-text-secondary', bgColors.textSecondary);

    // Calculate and apply derived variables
    root.style.setProperty('--bg-tertiary', this.lightenColor(bgColors.surface, 0.05));
    // ... etc
}
```

✅ **OK**: Aplica todas as variáveis

### 4. CSS Variables (src/index.css)

**Linha 9-17**: Definição inicial
```css
:root {
    --color-primary: #4F46E5;
    --color-secondary: #06B6D4;
    --color-accent: #F59E0B;
    --color-background: #0F172A;
    --color-surface: #1E293B;
    --color-text: #F1F5F9;
    --color-text-secondary: #94A3B8;
}
```

## Testes para Diagnosticar

### Teste 1: Verificar se setTheme é chamado
**Console:**
```javascript
// O console log deveria mostrar:
[CustomizationService] Theme applied: {primary: "#F97316", secondary: "...", ...}
```

### Teste 2: Verificar valores das variáveis CSS
**Console:**
```javascript
getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary')
```

### Teste 3: Testar applyTheme diretamente
**Console:**
```javascript
window.customizationService = require('./services/customizationService').default;
customizationService.setTheme({primary: '#FF0000', secondary: '#00FF00', accent: '#0000FF'});
```

## Hipóteses de Falha

### Hipótese 1: hexToHSL/hslToHex não implementados
→ Verificar se ColorPicker.jsx tem essas funções

### Hipótese 2: CSS ainda usa valores hardcoded
→ Grep por valores hex (#) nos .css

### Hipótese 3: Componentes não re-renderizam
→ React Hook não está notificando mudanças

### Hipótese 4: lightenColor/hexToRgb com bug
→ Cores inválidas sendo geradas

## Próxima Ação

1. **Verificar console logs** quando o usuário clica "Apply Theme"
2. **Inspecionar elemento** no DevTools para ver valores computed das variáveis CSS
3. **Buscar funções faltando** (hexToHSL, hslToHex) no ColorPicker
