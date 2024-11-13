// jobProcessor.js
import { CONFIG } from './analysisConfig.js';
import LLMService from './llmService.js';

class JobProcessor {
    // jobProcessor.js
    /*async processFile(file, type) {
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
    }*/

    async processFile(file, type, mode = 'standard') {
        try {
            console.log(`Starting ${mode} analysis for ${file.name}`);
            const chunks = this.splitFileContent(file.content);
            console.log(`Split ${file.name} into ${chunks.length} chunks`);

            const analyses = [];
            for (let i = 0; i < chunks.length; i++) {
                try {
                    console.log(`Processing chunk ${i + 1}/${chunks.length} of ${file.name}`);
                    const analysis = await LLMService.retryAnalysis(
                        mode === 'kt'
                            ? this.createKTPromptForChunk(chunks[i], type, file.name)
                            : this.createPromptForChunk(chunks[i], type, file.name),
                        mode
                    );
                    analyses.push(analysis);
                } catch (error) {
                    console.error(`Failed to analyze chunk ${i + 1}:`, error);
                }
            }

            const result = {
                fileName: file.name,
                fileType: type,
                analysis: analyses.join('\n'),
                status: analyses.length > 0 ? 'success' : 'partial_failure',
                mode: mode
            };
            console.log(`Analysis completed for ${file.name}:`, result);
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



    createKTPromptForChunk(chunk, fileType, fileName) {
        return `Analyze this Salesforce ${fileType} code from ${fileName} for new developer onboarding. 
Provide detailed analysis focusing on:
1. File Purpose & Responsibility
- Main functionality
- Business context
- Key components/classes

2. Technical Implementation
- Important methods and their purposes
- Data structures used
- Integration points

3. Development Guide
- Common modifications
- Testing requirements
- Debug points
- Setup prerequisites

4. Best Practices & Conventions
- Code patterns used
- Naming conventions
- Error handling approach

5. Dependencies & Relationships
- Related files/components
- External dependencies
- Data flow

Code to analyze:
${chunk}`;
    }

    // async addJob(data) {
    //     return this.processFile(data.file, data.type);
    // }
    async addJob(data) {
        return this.processFile(data.file, data.type, data.mode || 'standard');
    }
}

export default new JobProcessor();

