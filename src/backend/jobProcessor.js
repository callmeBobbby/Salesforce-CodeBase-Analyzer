// jobProcessor.js
import { CONFIG } from './analysisConfig.js';
import LLMService from './llmService.js';

class JobProcessor {
    // jobProcessor.js
    async processFile(file, type) {
        try {
            console.log(`Starting analysis for ${file.name}`);
            const chunks = this.splitFileContent(file.content);
            console.log(`Split ${file.name} into ${chunks.length} chunks`);

            const analyses = [];
            for (let i = 0; i < chunks.length; i++) {
                try {
                    console.log(`Processing chunk ${i + 1}/${chunks.length} of ${file.name}`);
                    const analysis = await LLMService.retryAnalysis(
                        this.createPromptForChunk(chunks[i], type, file.name)
                    );
                    console.log(`Analysis received for chunk ${i + 1}:`, analysis);
                    analyses.push(analysis);
                } catch (error) {
                    console.error(`Failed to analyze chunk ${i + 1}:`, error);
                }
            }

            const result = {
                fileName: file.name,
                fileType: type,
                analysis: analyses.join('\n'),
                status: analyses.length > 0 ? 'success' : 'partial_failure'
            };
            console.log(`Complete analysis for ${file.name}:`, result);
            return result;
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            throw error;
        }
    }


    splitFileContent(content) {
        if (typeof content !== 'string') {
            console.error('Invalid content type:', typeof content);
            throw new Error('Invalid content type');
        }

        const maxChunkSize = Math.floor(CONFIG.LLM.MAX_TOKENS / 2);
        const chunks = [];
        const lines = content.split('\n');
        let currentChunk = [];
        let currentSize = 0;

        for (const line of lines) {
            if (currentSize + line.length > maxChunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [];
                currentSize = 0;
            }
            currentChunk.push(line);
            currentSize += line.length;
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
        }

        return chunks;
    }

    createPromptForChunk(chunk, fileType, fileName) {
        return `Analyze this salesforce ${fileType} code from ${fileName}. Provide a concise analysis focusing on:
1. Main functionality and purpose
2. Critical issues and bugs
3. Performance concerns
4. Security considerations
5. Best practices violations\n\n${chunk}`;
    }

    async addJob(data) {
        return this.processFile(data.file, data.type);
    }
}

export default new JobProcessor();

