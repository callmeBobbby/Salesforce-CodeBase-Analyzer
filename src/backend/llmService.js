// llmService.js
import axios from 'axios';
import { CONFIG } from './analysisConfig.js';

class LLMService {
    static async analyzeCode(prompt, timeout = CONFIG.TIMEOUTS.ANALYSIS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            console.log('Sending request to LLM with prompt:', prompt.substring(0, 100) + '...');
            const response = await axios.post(
                CONFIG.LLM.ENDPOINT,
                {
                    model: CONFIG.LLM.MODEL,
                    prompt,
                    stream: false
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout,
                    signal: controller.signal
                }
            );
            clearTimeout(timeoutId);
            console.log('Received LLM response:', response.data.response);
            return response.data.response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (axios.isCancel(error)) {
                throw new Error('Analysis timeout');
            }
            throw new Error(`LLM Analysis failed: ${error.message}`);
        }
    }

    static async retryAnalysis(prompt, maxAttempts = CONFIG.RETRIES.MAX_ATTEMPTS) {
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await this.analyzeCode(prompt);
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
