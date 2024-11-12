import type { CodeAnalysis, SalesforceFile } from '../types';

export class CodeAnalyzer {
  private static readonly APEX_PATTERNS = {
    SOQL_IN_LOOP: {
      pattern: /for\s*\([^)]*\)\s*{[^}]*\[SELECT/i,
      message: 'SOQL query detected inside a loop',
      type: 'performance',
      severity: 'high',
      category: 'SOQL',
    },
    HARDCODED_ID: {
      pattern: /'[a-zA-Z0-9]{15,18}'/,
      message: 'Hardcoded Salesforce ID detected',
      type: 'quality',
      severity: 'medium',
      category: 'DML',
    },
    TRIGGER_RECURSION: {
      pattern: /trigger\s+\w+\s+on\s+\w+\s*\([^)]*\)\s*{[^}]*update/i,
      message: 'Potential trigger recursion detected',
      type: 'performance',
      severity: 'high',
      category: 'Trigger',
    },
  };

  private static readonly LWC_PATTERNS = {
    WIRE_WITHOUT_ERROR: {
      pattern: /@wire\([^)]+\)\s+\w+;/,
      message: 'Wire adapter without error handling',
      type: 'quality',
      severity: 'medium',
      category: 'Component',
    },
    IMPERATIVE_APEX: {
      pattern: /import\s*{\s*\w+\s*}\s*from\s*'@salesforce\/apex'/,
      message: 'Consider using wire adapter instead of imperative Apex',
      type: 'salesforce-best-practices',
      severity: 'low',
      category: 'Controller',
    },
  };

  static analyzeFile(file: SalesforceFile): CodeAnalysis[] {
    const analyses: CodeAnalysis[] = [];
    const lines = file.content.split('\n');

    if (file.type === 'apex') {
      lines.forEach((line, index) => {
        Object.entries(this.APEX_PATTERNS).forEach(([key, pattern]) => {
          if (pattern.pattern.test(line)) {
            analyses.push({
              type: pattern.type as CodeAnalysis['type'],
              severity: pattern.severity as CodeAnalysis['severity'],
              description: pattern.message,
              suggestion: this.getSuggestion(key),
              lineNumber: index + 1,
              fileType: 'apex',
              category: pattern.category as CodeAnalysis['category'],
            });
          }
        });
      });
    } else if (file.type === 'lwc') {
      lines.forEach((line, index) => {
        Object.entries(this.LWC_PATTERNS).forEach(([key, pattern]) => {
          if (pattern.pattern.test(line)) {
            analyses.push({
              type: pattern.type as CodeAnalysis['type'],
              severity: pattern.severity as CodeAnalysis['severity'],
              description: pattern.message,
              suggestion: this.getSuggestion(key),
              lineNumber: index + 1,
              fileType: 'lwc',
              category: pattern.category as CodeAnalysis['category'],
            });
          }
        });
      });
    }

    return analyses;
  }

  private static getSuggestion(key: string): string {
    const suggestions: Record<string, string> = {
      SOQL_IN_LOOP: `// Use collection to gather IDs first
List<Id> accountIds = new List<Id>();
for (Contact c : contacts) {
    accountIds.add(c.AccountId);
}
List<Account> accounts = [SELECT Id, Name FROM Account WHERE Id IN :accountIds];`,
      HARDCODED_ID: `// Use Custom Labels or Custom Metadata Types
String recordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName()
    .get('Customer').getRecordTypeId();`,
      TRIGGER_RECURSION: `// Use static flag to prevent recursion
public class TriggerHandler {
    private static Boolean isExecuting = false;
    
    public static void handle() {
        if (!isExecuting) {
            isExecuting = true;
            // Your trigger logic here
            isExecuting = false;
        }
    }
}`,
      WIRE_WITHOUT_ERROR: `// Handle wire errors properly
@wire(getAccounts)
wiredAccounts({ error, data }) {
    if (data) {
        this.accounts = data;
    } else if (error) {
        this.handleError(error);
    }
}`,
      IMPERATIVE_APEX: `// Use wire adapter for better performance
@wire(getAccounts, { type: '$accountType' })
wiredAccounts({ error, data }) {
    if (data) {
        this.accounts = data;
    }
}`,
    };
    
    return suggestions[key] || 'No specific suggestion available';
  }
}