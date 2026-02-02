// Script para listar modelos disponíveis na sua API Key
const GEMINI_API_KEY = 'AIzaSyDPodVMsCMgg5pjzhxzy5yFJLV7MfS9Vv8';

async function listModels() {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log('🤖 MODELOS DISPONÍVEIS:\n');

        data.models.forEach(model => {
            console.log(`📦 ${model.name}`);
            console.log(`   Suporta: ${model.supportedGenerationMethods?.join(', ')}`);
            console.log(`   Input tokens: ${model.inputTokenLimit || 'N/A'}`);
            console.log('');
        });

        // Filtrar modelos que suportam generateContent
        const audioModels = data.models.filter(m =>
            m.supportedGenerationMethods?.includes('generateContent')
        );

        console.log('\n✅ MODELOS QUE SUPORTAM MULTIMODAL (ÁUDIO + IMAGEM):');
        audioModels.forEach(m => console.log(`   - ${m.name.split('/')[1]}`));

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

listModels();
