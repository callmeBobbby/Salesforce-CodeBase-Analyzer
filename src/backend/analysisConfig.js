export const CONFIG = {
    TIMEOUTS: {
        FILE_FETCH: 30000,    // 30 seconds
        ANALYSIS: 60000,      // 1 minute
        BATCH: 180000,        // 3 minutes
        OVERVIEW: 120000,     // 2 minutes
        KT_ANALYSIS: 300000   // 5 minutes for detailed KT analysis
    },
    RETRIES: {
        MAX_ATTEMPTS: 3,
        BACKOFF: {
            TYPE: 'exponential',
            INITIAL_INTERVAL: 1000
        }
    },
    LLM: {
        ENDPOINT: 'http://ec2-18-222-231-144.us-east-2.compute.amazonaws.com:11434/api/generate',
        MODEL: 'llama3.1:8b',
        MAX_TOKENS: 2000,
        KT_MAX_TOKENS: 4000   // Increased token limit for KT analysis
    },
    CACHE: {
        TTL: 3600,
        CHECK_PERIOD: 600,
        KT_TTL: 7200         // 2 hours cache for KT documentation
    },
    ANALYSIS_MODES: {
        STANDARD: 'standard',
        KT: 'kt'
    }
};
