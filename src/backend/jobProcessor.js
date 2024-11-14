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

    analyzeWithCustomPrompt(fileName, content, customPrompt) {
        return LLMService.retryAnalysis(`
            Analyze this Salesforce code based on the following prompt:
            ${customPrompt}
    
            Code to analyze:
            ${content}
    
            Provide technical and precise response focusing on:
            - Specific code improvements
            - Performance impact
            - Implementation details
        `);
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

    /*createPromptForChunk(chunk, fileType, fileName) {
        return `Analyze this salesforce ${fileType} code from ${fileName}. Provide a concise analysis focusing on:
    1. Main functionality and purpose
    2. Critical issues and bugs
    3. Performance concerns
    4. Security considerations
    5. Best practices violations\n\n${chunk}`;
    }*/

    // jobProcessor.js
    createPromptForChunk(chunk, fileType, fileName) {
        return `Analyze this Salesforce ${fileType} code with technical precision:

Technical Analysis Requirements:
1. Code Structure & Quality
   - Identify design patterns
   - Code complexity assessment
   - SOLID principles adherence

2. Performance Optimization
   - Query optimization
   - Bulkification issues
   - CPU/Memory considerations
   - Governor limits impact

3. Security Analysis
   - CRUD/FLS compliance
   - Injection vulnerabilities
   - Sharing model issues

4. Best Practices
   - Salesforce recommended patterns
   - Error handling improvements
   - Test coverage recommendations

5. Provide Optimized Code
   - Include fixed/optimized version
   - Comments explaining changes
   - Performance impact estimates

Code to analyze:
${chunk}

Response Format:
- Keep analysis concise and technical
- Prioritize critical issues
- Include specific code fixes
- Provide measurable improvements`;
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

