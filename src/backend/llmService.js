// llmService.js
import axios from 'axios';
import { CONFIG } from './analysisConfig.js';

class LLMService {
    static async analyzeCode(prompt, mode = 'standard') {
        const timeout = mode === 'kt' ? CONFIG.TIMEOUTS.KT_ANALYSIS : CONFIG.TIMEOUTS.ANALYSIS;
        const maxTokens = mode === 'kt' ? CONFIG.LLM.KT_MAX_TOKENS : CONFIG.LLM.MAX_TOKENS;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            console.log(`Sending ${mode} analysis request to LLM...`);
            const response = await axios.post(
                CONFIG.LLM.ENDPOINT,
                {
                    model: CONFIG.LLM.MODEL,
                    prompt,
                    stream: false,
                    max_tokens: maxTokens
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout,
                    signal: controller.signal
                }
            );
            clearTimeout(timeoutId);
            return response.data.response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (axios.isCancel(error)) {
                throw new Error(`Analysis timeout (${mode} mode)`);
            }
            throw new Error(`LLM Analysis failed (${mode} mode): ${error.message}`);
        }
    }

    static async retryAnalysis(prompt, mode = 'standard', maxAttempts = CONFIG.RETRIES.MAX_ATTEMPTS) {
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await this.analyzeCode(prompt, mode);
                return result;
            } catch (error) {
                lastError = error;
                if (attempt === maxAttempts) break;
                await new Promise(resolve =>
                    setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000))
                );
            }
        }
        throw lastError;
    }
}

export default LLMService;
